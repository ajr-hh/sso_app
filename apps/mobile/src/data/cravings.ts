import { getSupabase } from "../lib/supabase";
import { normalizeCravingLabel } from "../presentation/cravings";

export type Craving = {
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
    throw new Error("You must be signed in to manage cravings.");
  }

  return data.user.id;
}

async function executeMutation<T>(request: PromiseLike<T>): Promise<T> {
  try {
    return await request;
  } catch {
    throw new Error("Something went wrong.");
  }
}

export async function fetchCravings(): Promise<Craving[]> {
  const userId = await requireUserId();
  const { data, error } = await getSupabase()
    .from("cravings")
    .select("id, label, sort_order")
    .eq("user_id", userId)
    .eq("deleted", false)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function createCraving(label: string): Promise<Craving> {
  const userId = await requireUserId();
  const { data, error } = await executeMutation(
    getSupabase()
      .from("cravings")
      .insert({
        user_id: userId,
        label: normalizeCravingLabel(label),
      })
      .select("id, label, sort_order")
      .single(),
  );

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function removeCraving(id: string): Promise<void> {
  const userId = await requireUserId();
  const { data, error } = await executeMutation(
    getSupabase()
      .from("cravings")
      .update({ deleted: true, deleted_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", userId)
      .eq("deleted", false)
      .select("id")
      .maybeSingle(),
  );

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Craving was not found or is no longer active.");
  }
}
