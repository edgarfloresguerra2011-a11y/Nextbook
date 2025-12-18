
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.updateMany({
    data: {
      credits: 100,
      planType: 'pro'
    }
  });
  console.log(`Updated ${users.count} users: Plan=PRO, Credits=100.`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
