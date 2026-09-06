import type { User } from "@supabase/supabase-js";

import { getSupabase } from "../lib/supabase";
import { isRailId, type RailId } from "../lib/domain";
import {
  DIET_FLAGS,
  normalizeAllergens,
  type DietFlag,
} from "../presentation/foodRules";
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
      "id, display_name, age, phone, why_matters, motivators, coach_style, rail_order, food_rules_set, diet_flags, allergens",
    )
    .eq("id", user.id)
    .eq("deleted", false)
    .single();

  if (error) {
    throw new Error("Something went wrong.");
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

  const knownDietFlags = new Set<string>(DIET_FLAGS);
  const dietFlags = Array.isArray(data.diet_flags)
    ? data.diet_flags.filter(
        (flag: unknown): flag is DietFlag =>
          typeof flag === "string" && knownDietFlags.has(flag),
      )
    : [];

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
    food_rules_set: data.food_rules_set ?? false,
    diet_flags: dietFlags,
    allergens: normalizeAllergens(
      Array.isArray(data.allergens)
        ? data.allergens.filter(
            (allergen: unknown): allergen is string =>
              typeof allergen === "string",
          )
        : [],
    ),
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
    throw new Error("Something went wrong.");
  }
}
