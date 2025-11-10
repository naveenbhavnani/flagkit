import type { PrismaClient, MetricInterval } from '@flagkit/database';

export interface TrackEvaluationParams {
  flagId: string;
  environmentId: string;
  variationKey: string;
  userId?: string;
  sdkType?: 'client' | 'server';
  sdkVersion?: string;
  reason: 'DEFAULT' | 'TARGETING' | 'ROLLOUT' | 'DISABLED' | 'NO_CONFIG';
}

export interface FlagAnalytics {
  totalEvaluations: number;
  uniqueUsers: number;
  variationBreakdown: Array<{
    variationKey: string;
    count: number;
    percentage: number;
  }>;
  reasonBreakdown: Array<{
    reason: string;
    count: number;
    percentage: number;
  }>;
  timeline: Array<{
    timestamp: Date;
    evaluations: number;
  }>;
}

export class AnalyticsService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Track a single flag evaluation
   * Non-blocking - failures won't break SDK requests
   */
  async trackEvaluation(params: TrackEvaluationParams): Promise<void> {
    try {
      // Create evaluation record
      await this.prisma.flagEvaluation.create({
        data: {
          flagId: params.flagId,
          environmentId: params.environmentId,
          variationKey: params.variationKey,
          userId: params.userId,
          sdkType: params.sdkType,
          sdkVersion: params.sdkVersion,
          reason: params.reason,
        },
      });

      // Trigger async aggregation (fire and forget)
      this.aggregateMetrics(params.flagId, params.environmentId).catch((err) => {
        console.error('Failed to aggregate metrics:', err);
      });
    } catch (error) {
      // Don't let tracking failures break SDK responses
      console.error('Failed to track evaluation:', error);
    }
  }

  /**
   * Aggregate raw evaluations into time-bucketed metrics
   * This should be called periodically (e.g., every hour) or after evaluations
   */
  async aggregateMetrics(flagId: string, environmentId: string): Promise<void> {
    const now = new Date();

    // Aggregate hourly metrics
    await this.aggregateForInterval(flagId, environmentId, 'HOUR', now);

    // Aggregate daily metrics (less frequently)
    if (now.getHours() === 0) {
      // Only run daily aggregation at midnight
      await this.aggregateForInterval(flagId, environmentId, 'DAY', now);
    }
  }

  private async aggregateForInterval(
    flagId: string,
    environmentId: string,
    interval: MetricInterval,
    now: Date
  ): Promise<void> {
    // Calculate the start of the current time bucket
    const timestamp = this.getTimeBucketStart(now, interval);

    // Get evaluations for this time bucket
    const evaluations = await this.prisma.flagEvaluation.findMany({
      where: {
        flagId,
        environmentId,
        createdAt: {
          gte: timestamp,
          lt: this.getNextTimeBucket(timestamp, interval),
        },
      },
      select: {
        variationKey: true,
        reason: true,
        userId: true,
      },
    });

    if (evaluations.length === 0) {
      return;
    }

    // Calculate aggregations
    const variationCounts: Record<string, number> = {};
    const reasonCounts: Record<string, number> = {};
    const uniqueUserIds = new Set<string>();

    evaluations.forEach((evaluation) => {
      // Count variations
      variationCounts[evaluation.variationKey] = (variationCounts[evaluation.variationKey] || 0) + 1;

      // Count reasons
      reasonCounts[evaluation.reason] = (reasonCounts[evaluation.reason] || 0) + 1;

      // Count unique users
      if (evaluation.userId) {
        uniqueUserIds.add(evaluation.userId);
      }
    });

    // Upsert metrics
    await this.prisma.flagMetrics.upsert({
      where: {
        flagId_environmentId_interval_timestamp: {
          flagId,
          environmentId,
          interval,
          timestamp,
        },
      },
      update: {
        totalEvaluations: evaluations.length,
        variationCounts,
        reasonCounts,
        uniqueUsers: uniqueUserIds.size,
        updatedAt: new Date(),
      },
      create: {
        flagId,
        environmentId,
        interval,
        timestamp,
        totalEvaluations: evaluations.length,
        variationCounts,
        reasonCounts,
        uniqueUsers: uniqueUserIds.size,
      },
    });
  }

  /**
   * Aggregate metrics for a specific date range (for backfilling historical data)
   */
  async aggregateHistoricalMetrics(
    flagId: string,
    environmentId: string,
    startDate: Date,
    endDate: Date,
    interval: MetricInterval = 'HOUR'
  ): Promise<number> {
    let aggregated = 0;
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const timestamp = this.getTimeBucketStart(currentDate, interval);

      // Get evaluations for this time bucket
      const evaluations = await this.prisma.flagEvaluation.findMany({
        where: {
          flagId,
          environmentId,
          createdAt: {
            gte: timestamp,
            lt: this.getNextTimeBucket(timestamp, interval),
          },
        },
        select: {
          variationKey: true,
          reason: true,
          userId: true,
        },
      });

      if (evaluations.length > 0) {
        // Calculate aggregations
        const variationCounts: Record<string, number> = {};
        const reasonCounts: Record<string, number> = {};
        const uniqueUserIds = new Set<string>();

        evaluations.forEach((evaluation) => {
          variationCounts[evaluation.variationKey] =
            (variationCounts[evaluation.variationKey] || 0) + 1;
          reasonCounts[evaluation.reason] = (reasonCounts[evaluation.reason] || 0) + 1;
          if (evaluation.userId) {
            uniqueUserIds.add(evaluation.userId);
          }
        });

        // Upsert metrics
        await this.prisma.flagMetrics.upsert({
          where: {
            flagId_environmentId_interval_timestamp: {
              flagId,
              environmentId,
              interval,
              timestamp,
            },
          },
          update: {
            totalEvaluations: evaluations.length,
            variationCounts,
            reasonCounts,
            uniqueUsers: uniqueUserIds.size,
            updatedAt: new Date(),
          },
          create: {
            flagId,
            environmentId,
            interval,
            timestamp,
            totalEvaluations: evaluations.length,
            variationCounts,
            reasonCounts,
            uniqueUsers: uniqueUserIds.size,
          },
        });

        aggregated++;
      }

      // Move to next time bucket
      if (interval === 'HOUR') {
        currentDate.setHours(currentDate.getHours() + 1);
      } else {
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    return aggregated;
  }

  /**
   * Get analytics for a flag in an environment
   */
  async getFlagAnalytics(
    flagId: string,
    environmentId: string,
    options: {
      startDate?: Date;
      endDate?: Date;
      interval?: MetricInterval;
    } = {}
  ): Promise<FlagAnalytics> {
    const interval = options.interval || 'HOUR';
    const endDate = options.endDate || new Date();
    const startDate =
      options.startDate || new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000); // Default: last 7 days

    // Get aggregated metrics
    const metrics = await this.prisma.flagMetrics.findMany({
      where: {
        flagId,
        environmentId,
        interval,
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        timestamp: 'asc',
      },
    });

    // Calculate totals
    let totalEvaluations = 0;
    const variationCounts: Record<string, number> = {};
    const reasonCounts: Record<string, number> = {};
    const uniqueUserIds = new Set<string>();

    metrics.forEach((metric) => {
      totalEvaluations += metric.totalEvaluations;

      // Aggregate variation counts
      const varCounts = metric.variationCounts as Record<string, number>;
      Object.entries(varCounts).forEach(([key, count]) => {
        variationCounts[key] = (variationCounts[key] || 0) + count;
      });

      // Aggregate reason counts
      const resCounts = metric.reasonCounts as Record<string, number>;
      Object.entries(resCounts).forEach(([key, count]) => {
        reasonCounts[key] = (reasonCounts[key] || 0) + count;
      });

      // Note: uniqueUsers are already deduplicated per time bucket
      // For true unique users across all time, we'd need to query raw evaluations
    });

    // Calculate unique users from raw evaluations (for accuracy)
    const evaluations = await this.prisma.flagEvaluation.findMany({
      where: {
        flagId,
        environmentId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        userId: {
          not: null,
        },
      },
      select: {
        userId: true,
      },
      distinct: ['userId'],
    });

    evaluations.forEach((evaluation) => {
      if (evaluation.userId) {
        uniqueUserIds.add(evaluation.userId);
      }
    });

    // Format variation breakdown
    const variationBreakdown = Object.entries(variationCounts).map(([key, count]) => ({
      variationKey: key,
      count,
      percentage: totalEvaluations > 0 ? (count / totalEvaluations) * 100 : 0,
    }));

    // Format reason breakdown
    const reasonBreakdown = Object.entries(reasonCounts).map(([key, count]) => ({
      reason: key,
      count,
      percentage: totalEvaluations > 0 ? (count / totalEvaluations) * 100 : 0,
    }));

    // Format timeline
    const timeline = metrics.map((metric) => ({
      timestamp: metric.timestamp,
      evaluations: metric.totalEvaluations,
    }));

    return {
      totalEvaluations,
      uniqueUsers: uniqueUserIds.size,
      variationBreakdown,
      reasonBreakdown,
      timeline,
    };
  }

  /**
   * Get analytics for all flags in an environment
   */
  async getEnvironmentAnalytics(
    environmentId: string,
    options: {
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<
    Array<{
      flagId: string;
      totalEvaluations: number;
      uniqueUsers: number;
    }>
  > {
    const endDate = options.endDate || new Date();
    const startDate =
      options.startDate || new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get all flags in the environment
    const metrics = await this.prisma.flagMetrics.findMany({
      where: {
        environmentId,
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        flagId: true,
        totalEvaluations: true,
        uniqueUsers: true,
      },
    });

    // Group by flag
    const flagMetrics = new Map<
      string,
      { totalEvaluations: number; uniqueUsers: number }
    >();

    metrics.forEach((metric) => {
      const existing = flagMetrics.get(metric.flagId) || {
        totalEvaluations: 0,
        uniqueUsers: 0,
      };

      flagMetrics.set(metric.flagId, {
        totalEvaluations: existing.totalEvaluations + metric.totalEvaluations,
        uniqueUsers: existing.uniqueUsers + metric.uniqueUsers,
      });
    });

    return Array.from(flagMetrics.entries()).map(([flagId, stats]) => ({
      flagId,
      ...stats,
    }));
  }

  /**
   * Helper: Get the start of a time bucket
   */
  private getTimeBucketStart(date: Date, interval: MetricInterval): Date {
    const d = new Date(date);

    if (interval === 'HOUR') {
      d.setMinutes(0, 0, 0);
    } else if (interval === 'DAY') {
      d.setHours(0, 0, 0, 0);
    }

    return d;
  }

  /**
   * Helper: Get the start of the next time bucket
   */
  private getNextTimeBucket(date: Date, interval: MetricInterval): Date {
    const d = new Date(date);

    if (interval === 'HOUR') {
      d.setHours(d.getHours() + 1);
    } else if (interval === 'DAY') {
      d.setDate(d.getDate() + 1);
    }

    return d;
  }

  /**
   * Delete old evaluation records (for data retention)
   * Should be run periodically to clean up old data
   */
  async cleanupOldEvaluations(retentionDays: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await this.prisma.flagEvaluation.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    return result.count;
  }
}
