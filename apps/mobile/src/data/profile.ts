import type { User } from "@supabase/supabase-js";

import { getSupabase } from "../lib/supabase";
import { isRailId, type RailId } from "../lib/domain";
import type { Profile } from "../types";

async function requireUser(): Promise<User> {
  const { data, error } = await getSupabase().auth.getUser();

  if (error) {
    throw new Error(error.message);
  }

  if (!data.user) {
    throw new Error("You must be signed in to manage your profile.");
  }

  return data.user;
}

export async function fetchProfile(): Promise<Profile> {
  const user = await requireUser();
  const { data, error } = await getSupabase()
    .from("profiles")
    .select(
      "id, display_name, age, phone, why_matters, motivators, coach_style, rail_order",
    )
    .eq("id", user.id)
    .eq("deleted", false)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const railOrder: RailId[] = [];
  const seenRailIds = new Set<RailId>();
  if (Array.isArray(data.rail_order)) {
    for (const id of data.rail_order) {
      if (isRailId(id) && !seenRailIds.has(id)) {
        seenRailIds.add(id);
        railOrder.push(id);
      }
    }
  }

  return {
    id: data.id,
    email: user.email ?? null,
    display_name: data.display_name ?? null,
    age: data.age ?? null,
    phone: data.phone ?? null,
    why_matters: data.why_matters ?? null,
    motivators: data.motivators,
    coach_style: data.coach_style === "elena" ? "elena" : "marcus",
    rail_order: railOrder,
  };
}

export async function saveRailOrder(ids: RailId[]): Promise<void> {
  const user = await requireUser();
  const { error } = await getSupabase()
    .from("profiles")
    .update({ rail_order: ids })
    .eq("id", user.id)
    .eq("deleted", false);

  if (error) {
    throw new Error(error.message);
  }
}

export async function saveProfile(
  patch: Partial<Omit<Profile, "id" | "email">>,
): Promise<void> {
  const user = await requireUser();
  const { error } = await getSupabase()
    .from("profiles")
    .update(patch)
    .eq("id", user.id)
    .eq("deleted", false);

  if (error) {
    throw new Error(error.message);
  }
}
