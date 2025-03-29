import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create default app settings if they don't exist
  await prisma.appSettings.upsert({
    where: {
      id: 'app-settings',
    },
    update: {},
    create: {
      registrationEnabled: true,
    },
  });

  console.log('Default app settings created or updated');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
