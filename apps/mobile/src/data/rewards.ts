import { getSupabase } from "../lib/supabase";

export type MilestoneReward = {
  id: string;
  milestone: string;
  reward: string;
  progress_note: string | null;
  completed: boolean;
  completed_at: string | null;
};

export type CreateMilestoneRewardInput = {
  milestone: string;
  reward: string;
};

export type UpdateMilestoneRewardInput = {
  milestone?: string;
  reward?: string;
  progress_note?: string | null;
  completed?: boolean;
};

const SELECT_COLUMNS =
  "id, milestone, reward, progress_note, completed, completed_at";

async function requireUserId(): Promise<string> {
  const { data, error } = await getSupabase().auth.getUser();
  if (error || !data.user) {
    throw new Error("You must be signed in to manage your rewards.");
  }
  return data.user.id;
}

export async function fetchMilestoneRewards(): Promise<MilestoneReward[]> {
  const userId = await requireUserId();
  const { data, error } = await getSupabase()
    .from("milestone_rewards")
    .select(SELECT_COLUMNS)
    .eq("user_id", userId)
    .eq("deleted", false)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    throw new Error("Something went wrong.");
  }

  return data;
}

export async function createMilestoneReward(
  input: CreateMilestoneRewardInput,
): Promise<MilestoneReward> {
  const userId = await requireUserId();
  const { data, error } = await getSupabase()
    .from("milestone_rewards")
    .insert({
      user_id: userId,
      milestone: input.milestone.trim(),
      reward: input.reward.trim(),
    })
    .select(SELECT_COLUMNS)
    .single();

  if (error) {
    throw new Error("Something went wrong.");
  }

  return data;
}

export async function updateMilestoneReward(
  id: string,
  input: UpdateMilestoneRewardInput,
): Promise<MilestoneReward> {
  const userId = await requireUserId();
  const patch: Record<string, unknown> = {};

  if (input.milestone !== undefined) {
    patch.milestone = input.milestone.trim();
  }
  if (input.reward !== undefined) {
    patch.reward = input.reward.trim();
  }
  if (input.progress_note !== undefined) {
    const note = input.progress_note?.trim() ?? "";
    patch.progress_note = note.length === 0 ? null : note;
  }
  if (input.completed !== undefined) {
    patch.completed = input.completed;
    patch.completed_at = input.completed ? new Date().toISOString() : null;
  }

  const { data, error } = await getSupabase()
    .from("milestone_rewards")
    .update(patch)
    .eq("id", id)
    .eq("user_id", userId)
    .eq("deleted", false)
    .select(SELECT_COLUMNS)
    .maybeSingle();

  if (error) {
    throw new Error("Something went wrong.");
  }

  if (!data) {
    throw new Error("Milestone was not found or is no longer active.");
  }

  return data;
}

export async function removeMilestoneReward(id: string): Promise<void> {
  const userId = await requireUserId();
  const { data, error } = await getSupabase()
    .from("milestone_rewards")
    .update({ deleted: true, deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId)
    .eq("deleted", false)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error("Something went wrong.");
  }

  if (!data) {
    throw new Error("Milestone was not found or is no longer active.");
  }
}
