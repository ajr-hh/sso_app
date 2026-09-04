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
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function replaceGoals(labels: string[]): Promise<void> {
  const userId = await requireUserId();
  const supabase = getSupabase();

  if (labels.length === 0) {
    const { error } = await supabase
      .from("goals")
      .delete()
      .eq("user_id", userId);

    if (error) {
      throw new Error(error.message);
    }

    return;
  }

  const { data: insertedGoals, error: insertError } = await supabase
    .from("goals")
    .insert(
      labels.map((label, sortOrder) => ({
        user_id: userId,
        label,
        sort_order: sortOrder,
      })),
    )
    .select("id");

  if (insertError) {
    throw new Error(insertError.message);
  }

  const insertedIds = insertedGoals.map(({ id }) => id);
  const { error: deleteError } = await supabase
    .from("goals")
    .delete()
    .eq("user_id", userId)
    .not("id", "in", `(${insertedIds.join(",")})`);

  if (deleteError) {
    throw new Error(deleteError.message);
  }
}
