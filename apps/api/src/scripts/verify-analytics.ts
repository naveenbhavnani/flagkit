import { prisma } from '@flagkit/database';

async function verifyAnalytics() {
  console.log('🔍 Verifying analytics data...\n');

  // Count total evaluations
  const evaluationCount = await prisma.flagEvaluation.count();
  console.log(`📊 Total Flag Evaluations: ${evaluationCount.toLocaleString()}`);

  // Count metrics records
  const metricsCount = await prisma.flagMetrics.count();
  console.log(`📈 Total Flag Metrics: ${metricsCount.toLocaleString()}`);

  // Get sample evaluations
  const sampleEvaluations = await prisma.flagEvaluation.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
  });

  console.log('\n📋 Sample Evaluations:');
  sampleEvaluations.forEach((evaluation, index) => {
    console.log(`  ${index + 1}. Flag ID: ${evaluation.flagId}`);
    console.log(`     Environment ID: ${evaluation.environmentId}`);
    console.log(`     Variation: ${evaluation.variationKey}`);
    console.log(`     User: ${evaluation.userId}`);
    console.log(`     SDK: ${evaluation.sdkType} v${evaluation.sdkVersion}`);
    console.log(`     Reason: ${evaluation.reason}`);
    console.log(`     Created: ${evaluation.createdAt.toISOString()}`);
    console.log('');
  });

  // Get metrics data
  const metrics = await prisma.flagMetrics.findMany({
    take: 10,
    orderBy: { timestamp: 'desc' },
  });

  console.log('📊 Metrics Records:');
  if (metrics.length === 0) {
    console.log('  ⚠️  No metrics records found!');
  } else {
    metrics.forEach((metric, index) => {
      console.log(`  ${index + 1}. Flag ID: ${metric.flagId}`);
      console.log(`     Environment ID: ${metric.environmentId}`);
      console.log(`     Interval: ${metric.interval}`);
      console.log(`     Timestamp: ${metric.timestamp.toISOString()}`);
      console.log(`     Total Evaluations: ${metric.totalEvaluations}`);
      console.log(`     Unique Users: ${metric.uniqueUsers}`);
      console.log(`     Variation Counts: ${JSON.stringify(metric.variationCounts)}`);
      console.log(`     Reason Counts: ${JSON.stringify(metric.reasonCounts)}`);
      console.log('');
    });
  }

  // Get date range of evaluations
  const dateRange = await prisma.flagEvaluation.aggregate({
    _min: { createdAt: true },
    _max: { createdAt: true },
  });

  console.log('📅 Date Range:');
  console.log(`  Earliest: ${dateRange._min.createdAt?.toISOString()}`);
  console.log(`  Latest: ${dateRange._max.createdAt?.toISOString()}`);

  // Group by flag
  const flagGroups = await prisma.flagEvaluation.groupBy({
    by: ['flagId'],
    _count: { flagId: true },
  });

  console.log('\n🏁 Evaluations by Flag:');
  for (const group of flagGroups) {
    console.log(`  Flag ${group.flagId}: ${group._count.flagId.toLocaleString()} evaluations`);
  }

  // Group by variation
  const variationGroups = await prisma.flagEvaluation.groupBy({
    by: ['variationKey'],
    _count: { variationKey: true },
  });

  console.log('\n🎯 Evaluations by Variation:');
  variationGroups.forEach((group) => {
    console.log(`  ${group.variationKey}: ${group._count.variationKey.toLocaleString()} evaluations`);
  });

  // Group by reason
  const reasonGroups = await prisma.flagEvaluation.groupBy({
    by: ['reason'],
    _count: { reason: true },
  });

  console.log('\n📊 Evaluations by Reason:');
  reasonGroups.forEach((group) => {
    console.log(`  ${group.reason}: ${group._count.reason.toLocaleString()} evaluations`);
  });
}

verifyAnalytics()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
