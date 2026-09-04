"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertImageFile, signedPhotoUrl, uploadUserPhoto } from "@/lib/supabase";
import { getAppUser } from "@/lib/user";

export async function toggleTask(id: string) {
  const user = await getAppUser();
  const task = await prisma.dailyTask.findFirst({
    where: { id, userId: user.id, deleted: false },
  });
  if (!task) return null;

  const updated = await prisma.dailyTask.updateMany({
    where: { id, userId: user.id, deleted: false },
    data: { done: !task.done },
  });

  revalidatePath("/home");
  return updated.count === 1 ? { ...task, done: !task.done } : null;
}

export async function addJournalEntry(mood: string, text: string) {
  const user = await getAppUser();
  const entry = await prisma.journalEntry.create({
    data: {
      userId: user.id,
      mood,
      text: text.trim(),
    },
  });

  revalidatePath("/journal");
  return {
    id: entry.id,
    mood: entry.mood,
    text: entry.text,
  };
}

export async function uploadReinforcementPhoto(formData: FormData) {
  const user = await getAppUser();
  const file = formData.get("file");
  const caption = String(formData.get("caption") ?? "").trim();
  const tag = String(formData.get("tag") ?? "").trim();
  const mode = String(formData.get("mode") ?? "hard_truths");

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a photo first." };
  }

  if (mode === "hard_truths") {
    if (tag !== "proud_of_this" && tag !== "never_again") {
      return { error: "Tag the photo — proud of this, or never again." };
    }
    if (!caption) {
      return { error: "Write your own caption. We won't generate one." };
    }
  }

  try {
    assertImageFile(file);
    const storageKey = await uploadUserPhoto(user.id, file);
    const photo = await prisma.reinforcementPhoto.create({
      data: {
        userId: user.id,
        storageKey,
        caption: caption || "Remember this.",
        tag: mode === "remember_why" ? "remember_why" : tag,
        mode,
      },
    });
    const url = await signedPhotoUrl(storageKey);
    revalidatePath("/sos/hard-truths");
    revalidatePath("/sos/why");
    return {
      photo: {
        id: photo.id,
        storageKey: photo.storageKey,
        caption: photo.caption,
        tag: photo.tag,
        mode: photo.mode,
        url,
      },
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Upload failed." };
  }
}

export async function logSosEvent(path: string, reinforcement?: string) {
  const user = await getAppUser();
  await prisma.sosEvent.create({
    data: {
      userId: user.id,
      path,
      reinforcement: reinforcement ?? null,
      followUpAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });
  revalidatePath("/followup");
}

function revalidateApp() {
  revalidatePath("/home");
  revalidatePath("/profile");
  revalidatePath("/journal");
  revalidatePath("/community");
  revalidatePath("/sos");
  revalidatePath("/sos/why");
  revalidatePath("/sos/food");
  revalidatePath("/sos/rewards");
  revalidatePath("/sos/messages");
  revalidatePath("/sos/rails");
  revalidatePath("/followup");
  revalidatePath("/restaurant");
  revalidatePath("/alias");
  revalidatePath("/challenge");
}

export async function saveProfile(input: {
  name: string;
  age: string;
  contactInfo: string;
  whyMatters: string;
  motivators: string[];
  goals: string[];
  pastAttempts: string[];
}) {
  const user = await getAppUser();
  const goals = input.goals.map((label) => label.trim()).filter(Boolean);
  const attempts = input.pastAttempts.map((label) => label.trim()).filter(Boolean);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        name: input.name.trim() || user.name,
        age: input.age.trim() || null,
        contactInfo: input.contactInfo.trim() || null,
        whyMatters: input.whyMatters.trim() || null,
        motivators: input.motivators.join(", ") || "Remember why",
      },
    }),
    prisma.goal.updateMany({
      where: { userId: user.id, deleted: false },
      data: { deleted: true, deletedAt: new Date() },
    }),
    prisma.goal.createMany({
      data: goals.map((label, order) => ({ userId: user.id, label, order })),
    }),
    prisma.pastAttempt.updateMany({
      where: { userId: user.id, deleted: false },
      data: { deleted: true, deletedAt: new Date() },
    }),
    prisma.pastAttempt.createMany({
      data: attempts.map((label) => ({ userId: user.id, label })),
    }),
  ]);

  revalidateApp();
}

export async function addTask(label: string) {
  const user = await getAppUser();
  const trimmed = label.trim();
  if (!trimmed) return { error: "Add a task first." };
  const task = await prisma.dailyTask.create({
    data: { userId: user.id, label: trimmed },
  });
  revalidatePath("/home");
  revalidatePath("/profile");
  return { task: { id: task.id, label: task.label, done: task.done } };
}

export async function deleteTask(id: string) {
  const user = await getAppUser();
  await prisma.dailyTask.updateMany({
    where: { id, userId: user.id, deleted: false },
    data: { deleted: true, deletedAt: new Date() },
  });
  revalidatePath("/home");
  revalidatePath("/profile");
}

export async function addGoal(label: string) {
  const user = await getAppUser();
  const trimmed = label.trim();
  if (!trimmed) return { error: "Add a goal first." };
  const count = await prisma.goal.count({
    where: { userId: user.id, deleted: false },
  });
  const goal = await prisma.goal.create({
    data: { userId: user.id, label: trimmed, order: count },
  });
  revalidateApp();
  return { goal: { id: goal.id, label: goal.label } };
}

export async function deleteGoal(id: string) {
  const user = await getAppUser();
  await prisma.goal.updateMany({
    where: { id, userId: user.id, deleted: false },
    data: { deleted: true, deletedAt: new Date() },
  });
  revalidateApp();
}

export async function addContact(name: string, contactInfo: string) {
  const user = await getAppUser();
  const trimmed = name.trim();
  if (!trimmed) return { error: "Add a name first." };
  const count = await prisma.accountabilityContact.count({ where: { userId: user.id } });
  const initials = trimmed
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const contact = await prisma.accountabilityContact.create({
    data: {
      userId: user.id,
      name: trimmed,
      contactInfo: contactInfo.trim() || "Added from profile",
      initials,
      priority: count,
      optedIn: true,
    },
  });
  revalidatePath("/profile");
  revalidatePath("/sos/call");
  return {
    contact: {
      id: contact.id,
      name: contact.name,
      contactInfo: contact.contactInfo,
      initials: contact.initials,
    },
  };
}

export async function addReward(milestone: string, rewardLabel: string) {
  const user = await getAppUser();
  if (!milestone.trim() || !rewardLabel.trim()) {
    return { error: "Add both a milestone and a reward." };
  }
  const reward = await prisma.reward.create({
    data: {
      userId: user.id,
      milestone: milestone.trim(),
      rewardLabel: rewardLabel.trim(),
      icon: "redeem",
      statusLabel: "In progress",
    },
  });
  revalidatePath("/sos/rewards");
  return {
    reward: {
      id: reward.id,
      milestone: reward.milestone,
      rewardLabel: reward.rewardLabel,
      icon: reward.icon,
      statusLabel: reward.statusLabel,
      earned: reward.earned,
    },
  };
}

export async function toggleReward(id: string) {
  const current = await prisma.reward.findUnique({ where: { id } });
  if (!current) return null;
  const reward = await prisma.reward.update({
    where: { id },
    data: {
      earned: !current.earned,
      statusLabel: current.earned ? "In progress" : "Earned",
    },
  });
  revalidatePath("/sos/rewards");
  return reward;
}

export async function addKryptonite(label: string) {
  const user = await getAppUser();
  const trimmed = label.trim();
  if (!trimmed) return { error: "Add a food first." };
  const count = await prisma.kryptoniteFood.count({ where: { userId: user.id } });
  const food = await prisma.kryptoniteFood.create({
    data: { userId: user.id, label: trimmed, order: count },
  });
  revalidatePath("/sos/food");
  return { food: { id: food.id, label: food.label, swaps: [] as { id: string; label: string }[] } };
}

export async function addKryptoniteSwap(foodId: string, label: string) {
  const trimmed = label.trim();
  if (!trimmed) return { error: "Add a swap first." };
  const swap = await prisma.kryptoniteSwap.create({
    data: { foodId, label: trimmed },
  });
  revalidatePath("/sos/food");
  return { swap: { id: swap.id, label: swap.label } };
}

export async function addCommunityPost(text: string) {
  const user = await getAppUser();
  const trimmed = text.trim();
  if (!trimmed) return { error: "Write a note first." };
  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const post = await prisma.communityPost.create({
    data: {
      userId: user.id,
      authorName: user.name,
      initials,
      text: trimmed,
    },
  });
  revalidatePath("/community");
  return {
    post: {
      id: post.id,
      authorName: post.authorName,
      initials: post.initials,
      text: post.text,
    },
  };
}

export async function addRestaurant(name: string, filter: string) {
  const user = await getAppUser();
  if (!name.trim()) return { error: "Add a restaurant name." };
  const restaurant = await prisma.favoriteRestaurant.create({
    data: {
      userId: user.id,
      name: name.trim(),
      filter: filter.trim() || "Your usual order, ranked",
    },
  });
  revalidatePath("/restaurant");
  return {
    restaurant: {
      id: restaurant.id,
      name: restaurant.name,
      filter: restaurant.filter,
      dishes: [] as { id: string; label: string }[],
    },
  };
}

export async function addRestaurantDish(restaurantId: string, label: string) {
  if (!label.trim()) return { error: "Add a dish first." };
  const dish = await prisma.restaurantDish.create({
    data: { restaurantId, label: label.trim() },
  });
  revalidatePath("/restaurant");
  return { dish: { id: dish.id, label: dish.label } };
}

export async function saveChallenge(input: { durationDays: number; buyIn: number; members: number }) {
  const user = await getAppUser();
  const existing = user.challenges[0];
  const data = {
    durationDays: input.durationDays,
    buyIn: input.buyIn,
    members: Math.max(1, input.members),
    invited: true,
  };
  if (existing) {
    await prisma.challenge.update({ where: { id: existing.id }, data });
  } else {
    await prisma.challenge.create({ data: { userId: user.id, ...data } });
  }
  revalidatePath("/challenge");
  revalidatePath("/community");
}

export async function saveCoachStyle(style: "marcus" | "elena") {
  const user = await getAppUser();
  await prisma.user.update({ where: { id: user.id }, data: { coachStyle: style } });
  revalidatePath("/sos/messages");
}

export async function confirmStayOnTrack() {
  const user = await getAppUser();
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { streak: user.streak + 1 },
  });
  revalidatePath("/home");
  revalidatePath("/followup");
  return { streak: updated.streak };
}

export async function saveAlias(craving: string, level: string, swapTitle: string, swapSub: string) {
  const user = await getAppUser();
  const trimmed = craving.trim();
  if (!trimmed) return { error: "Enter a craving first." };
  await prisma.user.update({
    where: { id: user.id },
    data: { lastCraving: trimmed, lastFlex: level },
  });
  const alias = await prisma.foodAlias.create({
    data: {
      userId: user.id,
      craving: trimmed,
      level,
      swapTitle,
      swapSub,
    },
  });
  revalidatePath("/alias");
  return { alias: { id: alias.id, craving: alias.craving, level: alias.level, swapTitle, swapSub } };
}
