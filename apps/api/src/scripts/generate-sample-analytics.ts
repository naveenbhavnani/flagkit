import { prisma } from '@flagkit/database';
import { AnalyticsService } from '../services/analytics.service';

const analyticsService = new AnalyticsService(prisma);

interface GenerateOptions {
  daysBack?: number;
  evaluationsPerDay?: number;
  uniqueUsers?: number;
}

async function generateSampleAnalytics(options: GenerateOptions = {}) {
  const {
    daysBack = 7,
    evaluationsPerDay = 500,
    uniqueUsers = 100,
  } = options;

  console.log('🚀 Generating sample analytics data...\n');

  // Find the first active flag with an environment config
  const flag = await prisma.flag.findFirst({
    where: {
      status: 'ACTIVE',
    },
    include: {
      variations: true,
      envConfigs: {
        include: {
          environment: true,
        },
      },
      project: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!flag) {
    console.error('❌ No active flags found. Please create a flag first.');
    return;
  }

  const envConfig = flag.envConfigs[0];
  if (!envConfig) {
    console.error(`❌ Flag "${flag.name}" has no environment configuration. Please configure it first.`);
    return;
  }

  console.log(`📊 Flag: ${flag.name} (${flag.key})`);
  console.log(`🌍 Environment: ${envConfig.environment.name}`);
  console.log(`📅 Generating ${daysBack} days of data`);
  console.log(`📈 ${evaluationsPerDay} evaluations per day`);
  console.log(`👥 ${uniqueUsers} unique users\n`);

  const variations = flag.variations.map(v => v.key);
  const reasons = ['DEFAULT', 'TARGETING', 'ROLLOUT', 'DISABLED', 'NO_CONFIG'] as const;

  // Generate user IDs
  const userIds = Array.from({ length: uniqueUsers }, (_, i) => `user-${i + 1}`);

  // Calculate time range
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - daysBack);

  console.log('⏳ Generating evaluation records...');

  // Generate evaluations spread over time
  const evaluations = [];
  const totalEvaluations = daysBack * evaluationsPerDay;

  for (let i = 0; i < totalEvaluations; i++) {
    // Random timestamp within the date range
    const timestamp = new Date(
      startDate.getTime() + Math.random() * (now.getTime() - startDate.getTime())
    );

    // Random user (weighted so some users appear more often)
    const userId = userIds[Math.floor(Math.random() * userIds.length)];

    // Variation distribution (weighted towards first variation)
    let variationKey: string;
    const rand = Math.random();
    if (rand < 0.6) {
      variationKey = variations[0] || 'true'; // 60% first variation
    } else if (rand < 0.9) {
      variationKey = variations[1] || 'false'; // 30% second variation
    } else {
      variationKey = variations[Math.floor(Math.random() * variations.length)] || 'true'; // 10% others
    }

    // Reason distribution
    let reason: typeof reasons[number];
    const reasonRand = Math.random();
    if (reasonRand < 0.5) {
      reason = 'DEFAULT'; // 50%
    } else if (reasonRand < 0.75) {
      reason = 'TARGETING'; // 25%
    } else if (reasonRand < 0.9) {
      reason = 'ROLLOUT'; // 15%
    } else if (reasonRand < 0.95) {
      reason = 'DISABLED'; // 5%
    } else {
      reason = 'NO_CONFIG'; // 5%
    }

    evaluations.push({
      flagId: flag.id,
      environmentId: envConfig.environmentId,
      variationKey,
      userId,
      sdkType: Math.random() > 0.5 ? 'client' : 'server',
      sdkVersion: Math.random() > 0.7 ? '1.0.0' : '1.1.0',
      reason,
      createdAt: timestamp,
    });
  }

  // Sort by timestamp for realistic insertion
  evaluations.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  // Insert in batches for better performance
  const batchSize = 100;
  let inserted = 0;

  for (let i = 0; i < evaluations.length; i += batchSize) {
    const batch = evaluations.slice(i, i + batchSize);
    await prisma.flagEvaluation.createMany({
      data: batch,
    });
    inserted += batch.length;

    // Progress indicator
    if (inserted % 500 === 0 || inserted === evaluations.length) {
      process.stdout.write(`\r  Inserted ${inserted}/${totalEvaluations} evaluations...`);
    }
  }

  console.log('\n✅ Evaluation records created!\n');

  // Aggregate metrics
  console.log('📊 Aggregating metrics...');

  // Aggregate hourly metrics for the entire date range
  const aggregated = await analyticsService.aggregateHistoricalMetrics(
    flag.id,
    envConfig.environmentId,
    startDate,
    now,
    'HOUR'
  );

  console.log(`\n✅ Metrics aggregated! Created ${aggregated} hourly metric records.\n`);

  // Show summary
  const metrics = await prisma.flagMetrics.findMany({
    where: {
      flagId: flag.id,
      environmentId: envConfig.environmentId,
    },
  });

  const totalAggregatedEvaluations = metrics.reduce(
    (sum, m) => sum + m.totalEvaluations,
    0
  );

  console.log('📈 Summary:');
  console.log(`  • Total evaluations: ${totalEvaluations.toLocaleString()}`);
  console.log(`  • Unique users: ${uniqueUsers.toLocaleString()}`);
  console.log(`  • Variations: ${variations.join(', ')}`);
  console.log(`  • Metric records: ${metrics.length}`);
  console.log(`  • Aggregated evaluations: ${totalAggregatedEvaluations.toLocaleString()}\n`);

  console.log('🎉 Sample analytics data generated successfully!');
  console.log(`\n💡 View the analytics at: http://localhost:3000/flags/${flag.id}\n`);
}

// Run the script
const args = process.argv.slice(2);
const daysBack = args[0] ? parseInt(args[0], 10) : 7;
const evaluationsPerDay = args[1] ? parseInt(args[1], 10) : 500;
const uniqueUsers = args[2] ? parseInt(args[2], 10) : 100;

generateSampleAnalytics({ daysBack, evaluationsPerDay, uniqueUsers })
  .catch((error) => {
    console.error('❌ Error generating sample analytics:', error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
