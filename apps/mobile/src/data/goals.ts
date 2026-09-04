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

export async function saveGoals(
  goals: { id: string; label: string }[],
): Promise<void> {
  const userId = await requireUserId();
  const supabase = getSupabase();

  if (goals.length > 0) {
    // Conflict on the primary key so re-saving edits the rows an earlier
    // attempt already created instead of inserting a second copy of each goal.
    const { error: upsertError } = await supabase.from("goals").upsert(
      goals.map(({ id, label }, sortOrder) => ({
        id,
        user_id: userId,
        label,
        sort_order: sortOrder,
        deleted: false,
      })),
      { onConflict: "id" },
    );

    if (upsertError) {
      throw new Error(upsertError.message);
    }
  }

  let deleteQuery = supabase
    .from("goals")
    .update({
      deleted: true,
      deleted_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("deleted", false);

  if (goals.length > 0) {
    deleteQuery = deleteQuery.not(
      "id",
      "in",
      `(${goals.map(({ id }) => id).join(",")})`,
    );
  }

  const { error: deleteError } = await deleteQuery;

  if (deleteError) {
    throw new Error(deleteError.message);
  }
}
