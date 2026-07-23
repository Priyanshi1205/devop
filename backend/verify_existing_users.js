const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Connecting to database...');
  const result = await prisma.user.updateMany({
    data: {
      isEmailVerified: true,
      plan: 'agency',
      subscriptionStatus: 'active',
    },
  });
  console.log(`Updated ${result.count} existing users to isEmailVerified = true and plan = agency.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
