import { getSupabase } from "../lib/supabase";
import type { Profile } from "../types";

async function requireUserId(): Promise<string> {
  const { data, error } = await getSupabase().auth.getUser();

  if (error) {
    throw new Error(error.message);
  }

  if (!data.user) {
    throw new Error("You must be signed in to manage your profile.");
  }

  return data.user.id;
}

export async function fetchProfile(): Promise<Profile> {
  const userId = await requireUserId();
  const { data, error } = await getSupabase()
    .from("profiles")
    .select(
      "id, display_name, age, contact_info, why_matters, motivators, coach_style",
    )
    .eq("id", userId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Profile;
}

export async function saveProfile(
  patch: Partial<Omit<Profile, "id">>,
): Promise<void> {
  const userId = await requireUserId();
  const { error } = await getSupabase()
    .from("profiles")
    .update(patch)
    .eq("id", userId);

  if (error) {
    throw new Error(error.message);
  }
}
