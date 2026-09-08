import { prisma } from "@/lib/prisma";
import { DEMO_USER_ID, ensureDemoExtras, seedDemoUser } from "@/lib/seed-data";

const userInclude = {
  goals: {
    where: { deleted: false },
    orderBy: { order: "asc" as const },
  },
  dailyTasks: {
    where: { deleted: false },
    orderBy: { date: "asc" as const },
  },
  journalEntries: { orderBy: { createdAt: "desc" as const } },
  photos: { orderBy: { createdAt: "asc" as const } },
  rewards: { orderBy: { earned: "desc" as const } },
  accountability: { orderBy: { priority: "asc" as const } },
  pastAttempts: { where: { deleted: false } },
  sosEvents: { orderBy: { createdAt: "desc" as const }, take: 8 },
  kryptonite: { orderBy: { order: "asc" as const }, include: { swaps: true } },
  communityPosts: { orderBy: { createdAt: "desc" as const } },
  restaurants: { include: { dishes: true } },
  challenges: true,
  aliases: { orderBy: { createdAt: "desc" as const }, take: 5 },
};

export type AppUser = Awaited<ReturnType<typeof getAppUser>>;

export async function getAppUser() {
  let user = await prisma.user.findUnique({
    where: { id: DEMO_USER_ID },
    include: userInclude,
  });

  if (!user) {
    await seedDemoUser(prisma);
  }

  await ensureDemoExtras(prisma, DEMO_USER_ID);

  user = await prisma.user.findUniqueOrThrow({
    where: { id: DEMO_USER_ID },
    include: userInclude,
  });

  return user;
}
