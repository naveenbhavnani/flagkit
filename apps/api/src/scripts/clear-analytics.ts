import { prisma } from '@flagkit/database';

async function clearAnalytics() {
  console.log('🗑️  Clearing analytics data...\n');

  // Delete all metrics
  const metricsDeleted = await prisma.flagMetrics.deleteMany({});
  console.log(`📊 Deleted ${metricsDeleted.count} metric records`);

  // Delete all evaluations
  const evaluationsDeleted = await prisma.flagEvaluation.deleteMany({});
  console.log(`📋 Deleted ${evaluationsDeleted.count} evaluation records`);

  console.log('\n✅ Analytics data cleared!');
}

clearAnalytics()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
