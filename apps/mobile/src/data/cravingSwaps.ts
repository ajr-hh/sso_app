import { explainError } from "../lib/errors";
import { getSupabase } from "../lib/supabase";

export type CravingSwapSource = "catalog" | "ai" | "custom";

export type CravingSwap = {
  id: string;
  craving_id: string;
  label: string;
  favorited: boolean;
  source: CravingSwapSource;
  rule_tags: string[];
};

export type CreateCravingSwapInput = Omit<CravingSwap, "id">;

async function requireUserId(): Promise<string> {
  const { data, error } = await getSupabase().auth.getUser();

  if (error) {
    throw new Error(error.message);
  }

  if (!data.user) {
    throw new Error("You must be signed in to manage craving swaps.");
  }

  return data.user.id;
}

export async function fetchCravingSwaps(
  cravingId: string,
): Promise<CravingSwap[]> {
  const userId = await requireUserId();
  const { data, error } = await getSupabase()
    .from("craving_swaps")
    .select("id, craving_id, label, favorited, source, rule_tags")
    .eq("craving_id", cravingId)
    .eq("user_id", userId)
    .eq("deleted", false)
    .order("favorited", { ascending: false })
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function createCravingSwap(
  input: CreateCravingSwapInput,
): Promise<CravingSwap> {
  try {
    const userId = await requireUserId();
    const { data, error } = await getSupabase()
      .from("craving_swaps")
      .insert({
        user_id: userId,
        craving_id: input.craving_id,
        label: input.label,
        favorited: input.favorited,
        source: input.source,
        rule_tags: input.rule_tags,
      })
      .select("id, craving_id, label, favorited, source, rule_tags")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  } catch (error) {
    throw new Error(explainError(error));
  }
}

async function updateActiveSwap(
  id: string,
  patch:
    | { favorited: boolean }
    | { deleted: true; deleted_at: string },
): Promise<void> {
  try {
    const userId = await requireUserId();
    const { data, error } = await getSupabase()
      .from("craving_swaps")
      .update(patch)
      .eq("id", id)
      .eq("user_id", userId)
      .eq("deleted", false)
      .select("id")
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      throw new Error("Craving swap was not found or is no longer active.");
    }
  } catch (error) {
    throw new Error(explainError(error));
  }
}

export async function setSwapFavorited(
  id: string,
  favorited: boolean,
): Promise<void> {
  await updateActiveSwap(id, { favorited });
}

export async function removeCravingSwap(id: string): Promise<void> {
  await updateActiveSwap(id, {
    deleted: true,
    deleted_at: new Date().toISOString(),
  });
}
