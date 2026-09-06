export const DIET_FLAGS = [
  "vegetarian",
  "vegan",
  "nut_free",
  "dairy_free",
  "gluten_free",
] as const;

export type DietFlag = (typeof DIET_FLAGS)[number];

export type FoodRules = {
  foodRulesSet: boolean;
  dietFlags: DietFlag[];
  allergens: string[];
};

const MAX_ALLERGEN = 40;
const MAX_ALLERGENS = 20;

export function normalizeAllergen(raw: string): string | null {
  const value = raw.trim().toLowerCase();
  return value.length === 0 ? null : value;
}

export function normalizeAllergens(raw: string[]): string[] {
  const seen = new Set<string>();
  const next: string[] = [];
  for (const item of raw) {
    const value = normalizeAllergen(item);
    if (value && value.length <= MAX_ALLERGEN && !seen.has(value)) {
      seen.add(value);
      next.push(value);
    }
  }
  return next.slice(0, MAX_ALLERGENS);
}

export function getAllergenValidationError(
  raw: string,
  existing: string[],
): string | null {
  const value = normalizeAllergen(raw);
  if (!value) return "Enter an allergy.";
  if (value.length > MAX_ALLERGEN) return "Keep each allergy under 40 characters.";
  if (existing.includes(value)) return "That allergy is already listed.";
  if (existing.length >= MAX_ALLERGENS) return "You can save up to 20 allergies.";
  return null;
}

export function toggleDietFlag(
  current: DietFlag[],
  flag: DietFlag | "none",
): DietFlag[] {
  if (flag === "none") return [];
  return current.includes(flag)
    ? current.filter((item) => item !== flag)
    : [...current, flag];
}

function tagHitsRules(tag: string, rules: FoodRules): boolean {
  if (rules.allergens.includes(tag)) return true;
  if (tag === "nuts" && rules.dietFlags.includes("nut_free")) return true;
  if (tag === "peanuts" && rules.dietFlags.includes("nut_free")) return true;
  if (tag === "dairy" && rules.dietFlags.includes("dairy_free")) return true;
  if (tag === "gluten" && rules.dietFlags.includes("gluten_free")) return true;
  if ((tag === "meat" || tag === "fish") && rules.dietFlags.includes("vegetarian")) {
    return true;
  }
  if (
    (tag === "meat" || tag === "fish" || tag === "dairy" || tag === "eggs") &&
    rules.dietFlags.includes("vegan")
  ) {
    return true;
  }
  return false;
}

export function swapViolatesRules(
  swapLabel: string,
  tags: Record<string, string[]>,
  rules: FoodRules,
): boolean {
  const swapTags = tags[swapLabel] ?? [];
  return swapTags.some((tag) => tagHitsRules(tag, rules));
}

export function filterSwapsByRules(
  labels: string[],
  tags: Record<string, string[]>,
  rules: FoodRules,
): string[] {
  return labels.filter((label) => !swapViolatesRules(label, tags, rules));
}
