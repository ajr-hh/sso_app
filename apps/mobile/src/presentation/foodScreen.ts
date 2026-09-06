import type { CravingSwap } from "../data/cravingSwaps";
import type { Craving } from "../data/cravings";
import { filterSwapsByRules, type FoodRules } from "./foodRules";
import type { ResolveSwapView, SwapRow } from "./swaps";

export type FoodScreenMode = "needs_rules" | "empty_cravings" | "ready";

export const FOOD_SCREEN_COPY = {
  title: "What are you craving?",
  subtitle: "Tap one, then pick a swap that still feels satisfying.",
  cravingsLabel: "Your cravings",
  swapsHeading: "Try instead",
  generateButton: "Get swap ideas",
  generateBusyButton: "Getting ideas…",
  filteredOut: "Nothing here fits your food rules",
  // Generated and member-written swaps name a dish, not an ingredient list, so
  // the screen never claims a packaged or prepared version is safe.
  ingredientNote: "Check ingredients and labels for your allergies.",
  needsRulesTitle: "Set your food rules first",
  needsRulesBody:
    "Tell us your allergies and diet in Profile so every swap here is one you can actually eat.",
  needsRulesButton: "Set food rules in Profile",
  emptyCravingsTitle: "Add a craving to start",
  emptyCravingsBody:
    "Name a food you often want to swap and its ideas show up right here.",
  addCraving: "Add a craving",
  customSwapLabel: "Your own swap",
  customSwapButton: "Save my swap",
  customSwapBusyButton: "Saving…",
  loadingSwaps: "Loading swaps…",
} as const;

export const FOOD_SCREEN_ERRORS = {
  rules: "We couldn’t load your food rules. Try again.",
  cravings: "We couldn’t load your cravings. Try again.",
  swaps: "We couldn’t load your swaps. Try again.",
  favorite: "We couldn’t update that swap. Try again.",
  saveGenerated: "We couldn’t save those swap ideas. Try again.",
  saveCustom: "We couldn’t save that swap. Try again.",
  addCraving: "We couldn’t add that craving. Try again.",
} as const;

export function getFoodScreenMode(input: {
  foodRulesSet: boolean;
  cravingCount: number;
}): FoodScreenMode {
  if (!input.foodRulesSet) {
    return "needs_rules";
  }
  return input.cravingCount === 0 ? "empty_cravings" : "ready";
}

/**
 * Layout A keeps one craving selected at all times: the first active craving on
 * load, the same craving across reloads, and the first one again once the
 * selection is gone.
 */
export function getSelectedCravingId(
  cravings: readonly Craving[],
  currentId: string | null,
): string | null {
  if (cravings.length === 0) {
    return null;
  }
  if (currentId && cravings.some(({ id }) => id === currentId)) {
    return currentId;
  }
  return cravings[0].id;
}

/** Maps database rows onto the resolver's shape: `rule_tags` become `ruleTags`. */
export function toSwapRows(saved: readonly CravingSwap[]): SwapRow[] {
  return saved.map((swap) => ({
    id: swap.id,
    label: swap.label,
    source: swap.source,
    favorited: swap.favorited,
    ruleTags: Array.isArray(swap.rule_tags) ? swap.rule_tags : [],
  }));
}

/**
 * Catalog labels to persist the first time a catalog craving is opened, so the
 * member can favorite them. Labels that break the current rules are left
 * unsaved rather than written and then hidden.
 */
export function getCatalogSeedLabels(input: {
  cravingLabel: string;
  catalog: Record<string, string[]>;
  tags: Record<string, string[]>;
  rules: FoodRules;
  saved: readonly SwapRow[];
}): string[] {
  if (!input.rules.foodRulesSet || input.saved.length > 0) {
    return [];
  }

  const lower = input.cravingLabel.trim().toLowerCase();
  const key = Object.keys(input.catalog).find(
    (candidate) => candidate.toLowerCase() === lower,
  );
  if (!key) {
    return [];
  }

  return filterSwapsByRules(input.catalog[key], input.tags, input.rules);
}

export type FavoriteAction =
  | { kind: "update"; id: string; favorited: boolean }
  | { kind: "persist"; label: string; ruleTags: string[] };

/**
 * Rows the resolver synthesizes from the catalog carry their label as an id
 * because no database row exists yet — that only happens for catalog labels
 * filtered out when the craving was seeded that fit the rules again. Saving one
 * has to insert it instead of updating an id the server never issued.
 */
export function getFavoriteAction(
  row: SwapRow,
  persistedIds: ReadonlySet<string>,
): FavoriteAction {
  if (persistedIds.has(row.id)) {
    return { kind: "update", id: row.id, favorited: !row.favorited };
  }
  return { kind: "persist", label: row.label, ruleTags: row.ruleTags };
}

export function getSwapToggleLabel(label: string, favorited: boolean): string {
  return favorited ? `Remove save on ${label}` : `Save ${label}`;
}

export function shouldShowIngredientNote(view: ResolveSwapView): boolean {
  return (
    view.showGenerate ||
    view.allFilteredOut ||
    view.rows.some(({ source }) => source === "ai" || source === "custom")
  );
}
