import { prisma } from './index';

async function main() {
  console.log('🌱 Seeding database...');

  // Create a demo organization
  const org = await prisma.organization.upsert({
    where: { slug: 'demo-org' },
    update: {},
    create: {
      name: 'Demo Organization',
      slug: 'demo-org',
      subscriptionTier: 'FREE',
      subscriptionStatus: 'ACTIVE',
    },
  });

  console.log('✅ Created demo organization:', org.name);

  // Create a demo project
  const project = await prisma.project.upsert({
    where: { id: 'demo-project' },
    update: {},
    create: {
      id: 'demo-project',
      name: 'Demo Project',
      description: 'A demo project for testing',
      organizationId: org.id,
    },
  });

  console.log('✅ Created demo project:', project.name);

  // Create environments
  const environments = [
    { name: 'Development', key: 'dev', color: '#10B981' },
    { name: 'Staging', key: 'staging', color: '#F59E0B' },
    { name: 'Production', key: 'prod', color: '#EF4444' },
  ];

  for (const env of environments) {
    const environment = await prisma.environment.upsert({
      where: { projectId_key: { projectId: project.id, key: env.key } },
      update: {},
      create: {
        ...env,
        projectId: project.id,
      },
    });
    console.log('✅ Created environment:', environment.name);
  }

  console.log('🎉 Seeding completed!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seeding failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
