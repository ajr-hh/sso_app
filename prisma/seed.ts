import { PrismaClient } from "@prisma/client";
import { seedDemoUser } from "../lib/seed-data";

const prisma = new PrismaClient();

async function main() {
  await seedDemoUser(prisma);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
