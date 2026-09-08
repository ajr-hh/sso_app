import { getSupabase } from "../lib/supabase";

export type WhyReason = {
  id: string;
  label: string;
  sort_order: number;
};

async function requireUserId(): Promise<string> {
  const { data, error } = await getSupabase().auth.getUser();
  if (error || !data.user) {
    throw new Error("You must be signed in to manage your reasons.");
  }
  return data.user.id;
}

export async function fetchWhyReasons(): Promise<WhyReason[]> {
  const userId = await requireUserId();
  const { data, error } = await getSupabase()
    .from("why_reasons")
    .select("id, label, sort_order")
    .eq("user_id", userId)
    .eq("deleted", false)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    throw new Error("Something went wrong.");
  }

  return data;
}

export async function createWhyReason(label: string): Promise<WhyReason> {
  const userId = await requireUserId();
  const { data, error } = await getSupabase()
    .from("why_reasons")
    .insert({
      user_id: userId,
      label: label.trim(),
    })
    .select("id, label, sort_order")
    .single();

  if (error) {
    throw new Error("Something went wrong.");
  }

  return data;
}

export async function removeWhyReason(id: string): Promise<void> {
  const userId = await requireUserId();
  const { data, error } = await getSupabase()
    .from("why_reasons")
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
    throw new Error("Reason was not found or is no longer active.");
  }
}
