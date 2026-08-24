import type { PrismaClient } from "@prisma/client";
import { communityPosts, foodSwaps } from "@/lib/demo-data";

export const DEMO_USER_ID = "demo-jim";

export async function ensureDemoExtras(prisma: PrismaClient, userId = DEMO_USER_ID) {
  const [kryptoCount, postCount, restaurantCount, challengeCount] = await Promise.all([
    prisma.kryptoniteFood.count({ where: { userId } }),
    prisma.communityPost.count({ where: { userId } }),
    prisma.favoriteRestaurant.count({ where: { userId } }),
    prisma.challenge.count({ where: { userId } }),
  ]);

  if (kryptoCount === 0) {
    let order = 0;
    for (const [label, swaps] of Object.entries(foodSwaps)) {
      await prisma.kryptoniteFood.create({
        data: {
          userId,
          label,
          order: order++,
          swaps: { create: swaps.map((swap) => ({ label: swap })) },
        },
      });
    }
  }

  if (postCount === 0) {
    await prisma.communityPost.createMany({
      data: communityPosts.map((post) => ({
        userId,
        authorName: post.name,
        initials: post.initials,
        text: post.text,
      })),
    });
  }

  if (restaurantCount === 0) {
    await prisma.favoriteRestaurant.create({
      data: {
        userId,
        name: "Cielo Kitchen",
        filter: "40g+ protein, under 700 cal",
        dishes: {
          create: [
            { label: "Grilled branzino, roasted vegetables — 42g protein" },
            { label: "Chicken & avocado salad, no dressing — 38g protein" },
          ],
        },
      },
    });
  }

  if (challengeCount === 0) {
    await prisma.challenge.create({
      data: { userId, durationDays: 30, buyIn: 20, members: 7 },
    });
  }

  await prisma.user.updateMany({
    where: { id: userId, whyMatters: null },
    data: {
      age: "47",
      contactInfo: "jim@humanaut.local",
      whyMatters: "I want to walk my daughter down the aisle without stopping to catch my breath.",
      motivators: "Remember why, The numbers, Rewards",
    },
  });
}

export async function seedDemoUser(prisma: PrismaClient) {
  await prisma.user.upsert({
    where: { id: DEMO_USER_ID },
    update: {},
    create: {
      id: DEMO_USER_ID,
      name: "Jim",
      email: "jim@humanaut.local",
      age: "47",
      contactInfo: "jim@humanaut.local",
      whyMatters: "I want to walk my daughter down the aisle without stopping to catch my breath.",
      motivators: "Remember why, The numbers, Rewards",
      streak: 12,
      goals: {
        create: [
          { label: "Lose 22 pounds", order: 0 },
          { label: "Reduce body fat below 20%", order: 1 },
          { label: "Increase muscle mass by 10%+", order: 2 },
          { label: "Enjoy my diet and be social", order: 3 },
        ],
      },
      dailyTasks: {
        create: [
          { label: "Move over 10,000 steps", done: true },
          { label: "Consume 180g of protein", done: true },
          { label: "Five servings of vegetables", done: false },
          { label: "Daily workout", done: true },
          { label: "No alcohol or sweets after 7pm", done: false },
        ],
      },
      journalEntries: {
        create: [
          {
            mood: "good",
            text: "Lost 6 pounds and I'm sleeping better than ever. Haven't had heartburn in 2 weeks.",
          },
          {
            mood: "good",
            text: "Had a craving for ice cream. Had an apple instead. It was delicious and satisfied the craving.",
          },
        ],
      },
      pastAttempts: {
        create: [
          { label: "Didn't ask for help" },
          { label: "Didn't have a plan" },
          { label: "Didn't know the consequences of what I was eating" },
        ],
      },
      photos: {
        create: [
          {
            storageKey: "placeholder-proud",
            caption: "Walking my daughter down the aisle without stopping to catch my breath.",
            tag: "proud_of_this",
            mode: "hard_truths",
          },
          {
            storageKey: "placeholder-never",
            caption: "The night before my physical, dreading the scale. Not doing that again.",
            tag: "never_again",
            mode: "hard_truths",
          },
        ],
      },
      rewards: {
        create: [
          {
            milestone: "Lose 10 pounds",
            rewardLabel: "A new shirt you picked out",
            icon: "checkroom",
            statusLabel: "Earned",
            earned: true,
          },
          {
            milestone: "Lose 20 pounds",
            rewardLabel: "A weekend driving experience",
            icon: "directions_car",
            statusLabel: "6 lbs to go",
            earned: false,
          },
        ],
      },
      accountability: {
        create: [
          {
            name: "Sarah (sister)",
            contactInfo: "sarah@example.com",
            initials: "SD",
            priority: 0,
            optedIn: true,
          },
        ],
      },
    },
  });
}
