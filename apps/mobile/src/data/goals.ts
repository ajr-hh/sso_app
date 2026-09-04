import { getSupabase } from "../lib/supabase";

export type Goal = {
  id: string;
  label: string;
  sort_order: number;
};

async function requireUserId(): Promise<string> {
  const { data, error } = await getSupabase().auth.getUser();

  if (error) {
    throw new Error(error.message);
  }

  if (!data.user) {
    throw new Error("You must be signed in to manage goals.");
  }

  return data.user.id;
}

export async function fetchGoals(): Promise<Goal[]> {
  const userId = await requireUserId();
  const { data, error } = await getSupabase()
    .from("goals")
    .select("id, label, sort_order")
    .eq("user_id", userId)
    .eq("deleted", false)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function addGoal(label: string): Promise<Goal> {
  const userId = await requireUserId();
  const supabase = getSupabase();
  const { data: lastGoals, error: sortError } = await supabase
    .from("goals")
    .select("sort_order")
    .eq("user_id", userId)
    .eq("deleted", false)
    .order("sort_order", { ascending: false })
    .limit(1);

  if (sortError) {
    throw new Error(sortError.message);
  }

  const nextSortOrder = (lastGoals?.[0]?.sort_order ?? -1) + 1;
  const { data, error } = await supabase
    .from("goals")
    .insert({
      user_id: userId,
      label,
      sort_order: nextSortOrder,
      deleted: false,
    })
    .select("id, label, sort_order")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function updateGoal(id: string, label: string): Promise<void> {
  const userId = await requireUserId();
  const { error } = await getSupabase()
    .from("goals")
    .update({ label })
    .eq("id", id)
    .eq("user_id", userId)
    .eq("deleted", false);

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteGoal(id: string): Promise<void> {
  const userId = await requireUserId();
  const { error } = await getSupabase()
    .from("goals")
    .update({ deleted: true, deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId)
    .eq("deleted", false);

  if (error) {
    throw new Error(error.message);
  }
}
