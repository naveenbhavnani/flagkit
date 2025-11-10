export interface VariationBreakdown {
  variationKey: string;
  count: number;
  percentage: number;
}

export interface ReasonBreakdown {
  reason: string;
  count: number;
  percentage: number;
}

export interface TimelineData {
  timestamp: Date;
  evaluations: number;
}

export interface FlagAnalytics {
  totalEvaluations: number;
  uniqueUsers: number;
  variationBreakdown: VariationBreakdown[];
  reasonBreakdown: ReasonBreakdown[];
  timeline: TimelineData[];
}

export interface EnvironmentAnalytics extends FlagAnalytics {
  environmentId: string;
  environmentName: string;
  environmentKey: string;
}

export interface FlagAnalyticsResponse {
  success: boolean;
  data: FlagAnalytics | { environments: EnvironmentAnalytics[] };
  error?: {
    message: string;
  };
}

export type MetricInterval = 'HOUR' | 'DAY';

export interface AnalyticsFilters {
  startDate?: string;
  endDate?: string;
  interval?: MetricInterval;
  environmentId?: string;
}
