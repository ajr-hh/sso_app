import { explainError } from "../lib/errors";
import { getSupabase } from "../lib/supabase";
import {
  clampRestaurantTargets,
  clipRestaurantFields,
  DEFAULT_CALORIE_MAX,
  DEFAULT_PROTEIN_TARGET,
  RESTAURANT_COPY,
  restaurantFilterLine,
} from "../presentation/otherTools";

export type FavoriteRestaurant = {
  id: string;
  name: string;
  best_pick: string;
  filter: string;
};

export type RestaurantTargets = {
  protein_grams: number;
  calorie_max: number;
};

const LOAD_ERROR = "We couldn’t load those restaurants. Try again.";
const SAVE_ERROR = "We couldn’t save that restaurant. Try again.";
const GENERATE_ERROR = "We couldn’t read that menu right now. Try again.";
const RATE_LIMIT_ERROR =
  "That's a lot of menu scans for one hour. Try again later.";

async function requireUserId(): Promise<string> {
  const { data, error } = await getSupabase().auth.getUser();
  if (error || !data.user) {
    throw new Error("You must be signed in to use Restaurant finder.");
  }
  return data.user.id;
}

function readRestaurant(raw: unknown): FavoriteRestaurant | null {
  if (typeof raw !== "object" || raw === null) return null;
  const row = raw as {
    id?: unknown;
    name?: unknown;
    best_pick?: unknown;
    filter?: unknown;
  };
  if (typeof row.id !== "string") return null;
  if (typeof row.name !== "string" || row.name.trim().length === 0) return null;
  if (typeof row.best_pick !== "string" || row.best_pick.trim().length === 0) {
    return null;
  }
  return {
    id: row.id,
    name: row.name.trim(),
    best_pick: row.best_pick.trim(),
    filter: typeof row.filter === "string" ? row.filter : "",
  };
}

export async function fetchFavoriteRestaurants(): Promise<FavoriteRestaurant[]> {
  const userId = await requireUserId();
  const { data, error } = await getSupabase()
    .from("favorite_restaurants")
    .select("id, name, best_pick, filter")
    .eq("user_id", userId)
    .eq("deleted", false)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(LOAD_ERROR);
  }
  return (data ?? []).flatMap((row) => {
    const restaurant = readRestaurant(row);
    return restaurant ? [restaurant] : [];
  });
}

export async function fetchRestaurantTargets(): Promise<RestaurantTargets> {
  const userId = await requireUserId();
  const { data, error } = await getSupabase()
    .from("restaurant_targets")
    .select("protein_grams, calorie_max")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(LOAD_ERROR);
  }
  if (!data) {
    return {
      protein_grams: DEFAULT_PROTEIN_TARGET,
      calorie_max: DEFAULT_CALORIE_MAX,
    };
  }
  return {
    protein_grams:
      typeof data.protein_grams === "number" && data.protein_grams > 0
        ? data.protein_grams
        : DEFAULT_PROTEIN_TARGET,
    calorie_max:
      typeof data.calorie_max === "number" && data.calorie_max > 0
        ? data.calorie_max
        : DEFAULT_CALORIE_MAX,
  };
}

export async function saveRestaurantTargets(
  input: RestaurantTargets,
): Promise<RestaurantTargets> {
  const userId = await requireUserId();
  const { protein_grams: protein, calorie_max: calories } =
    clampRestaurantTargets(input);
  const { error } = await getSupabase().from("restaurant_targets").upsert(
    {
      user_id: userId,
      protein_grams: protein,
      calorie_max: calories,
    },
    { onConflict: "user_id" },
  );
  if (error) {
    throw new Error(SAVE_ERROR);
  }
  return { protein_grams: protein, calorie_max: calories };
}

export async function saveFavoriteRestaurant(input: {
  name: string;
  bestPick: string;
  filter: string;
}): Promise<FavoriteRestaurant> {
  const userId = await requireUserId();
  const existing = await fetchFavoriteRestaurants();
  if (existing.length >= RESTAURANT_COPY.max) {
    throw new Error("You can save up to 10 restaurants.");
  }
  const { name, bestPick, filter } = clipRestaurantFields({
    name: input.name,
    bestPick: input.bestPick,
    filter: input.filter,
  });
  if (name.length === 0 || bestPick.length === 0) {
    throw new Error(SAVE_ERROR);
  }

  const { data, error } = await getSupabase()
    .from("favorite_restaurants")
    .insert({
      user_id: userId,
      name,
      best_pick: bestPick,
      filter,
    })
    .select("id, name, best_pick, filter")
    .single();

  if (error) {
    throw new Error(SAVE_ERROR);
  }
  const restaurant = readRestaurant(data);
  if (!restaurant) {
    throw new Error(SAVE_ERROR);
  }
  return restaurant;
}

function isRateLimited(error: unknown): boolean {
  const { context } = (error ?? {}) as { context?: { status?: unknown } };
  return context?.status === 429;
}

function explainGenerateFailure(error: unknown): string {
  if (isRateLimited(error)) return RATE_LIMIT_ERROR;
  const message = error instanceof Error ? error.message : "";
  if (error instanceof TypeError || /network/i.test(message)) {
    return explainError(error);
  }
  return GENERATE_ERROR;
}

export function parseMenuScanOutput(payload: unknown): {
  name: string;
  bestPick: string;
} | null {
  if (typeof payload !== "object" || payload === null) return null;
  const { name, best_pick, dishes } = payload as {
    name?: unknown;
    best_pick?: unknown;
    dishes?: unknown;
  };
  const title = typeof name === "string" ? name.trim() : "";
  if (typeof best_pick === "string" && best_pick.trim().length > 0) {
    return { name: title, bestPick: best_pick.trim() };
  }
  if (Array.isArray(dishes) && dishes.length > 0) {
    const first = dishes[0] as { label?: unknown };
    if (typeof first?.label === "string" && first.label.trim().length > 0) {
      return { name: title, bestPick: first.label.trim() };
    }
  }
  return null;
}

export async function generateRestaurantPick(input: {
  name?: string;
  proteinGrams: number;
  calorieMax: number;
  menuImageBase64?: string;
}): Promise<{ name: string; bestPick: string; filter: string }> {
  const filter = restaurantFilterLine(input.proteinGrams, input.calorieMax);
  let response: { data: unknown; error: unknown };
  try {
    response = await getSupabase().functions.invoke("sos-generate", {
      body: {
        kind: "menu_scan",
        input: {
          protein_target: input.proteinGrams,
          calorie_max: input.calorieMax,
          ...(input.name?.trim() ? { restaurant_name: input.name.trim() } : {}),
          ...(input.menuImageBase64
            ? { image_base64: input.menuImageBase64 }
            : {}),
        },
      },
    });
  } catch (caught) {
    throw new Error(explainGenerateFailure(caught));
  }

  if (response.error) {
    throw new Error(explainGenerateFailure(response.error));
  }
  const job = response.data as
    | { status?: unknown; output?: unknown }
    | null
    | undefined;
  if (!job || job.status !== "succeeded") {
    throw new Error(GENERATE_ERROR);
  }
  const parsed = parseMenuScanOutput(job.output);
  if (!parsed || parsed.bestPick.length === 0) {
    throw new Error(GENERATE_ERROR);
  }
  return clipRestaurantFields({
    name: parsed.name || input.name?.trim() || "Scanned menu",
    bestPick: parsed.bestPick,
    filter,
  });
}
