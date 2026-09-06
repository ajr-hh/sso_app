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

// Plurals only. Anything cleverer would start rewriting words the member
// actually typed, and a wrong stem on an allergen is a safety bug.
export function singularize(word: string): string {
  if (word.length > 3 && word.endsWith("ies")) {
    return `${word.slice(0, -3)}y`;
  }
  if (
    word.length > 4 &&
    (word.endsWith("ches") ||
      word.endsWith("shes") ||
      word.endsWith("sses") ||
      word.endsWith("xes"))
  ) {
    return word.slice(0, -2);
  }
  // "hummus", "citrus", and "couscous" are already singular; stripping the "s"
  // would stop them matching an allergen spelled the same way.
  if (word.length > 2 && word.endsWith("s") && !/(ss|us|is)$/.test(word)) {
    return word.slice(0, -1);
  }
  return word;
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((word) => word.length > 0)
    .map((word) => singularize(word));
}

export function tokensContain(haystack: string[], needle: string[]): boolean {
  if (needle.length === 0) return false;

  for (let start = 0; start + needle.length <= haystack.length; start += 1) {
    let matched = true;
    for (let offset = 0; offset < needle.length; offset += 1) {
      if (haystack[start + offset] !== needle[offset]) {
        matched = false;
        break;
      }
    }
    if (matched) return true;
  }

  return false;
}

export function squash(text: string): string {
  return text.toLowerCase().replace(/[^a-z]/g, "");
}

const MIN_SQUASHED_ALLERGEN = 3;

export function allergenHitsText(allergens: string[], text: string): boolean {
  const tokens = tokenize(text);
  const squashed = squash(text);

  return allergens.some((allergen) => {
    const allergenTokens = tokenize(allergen);
    if (tokensContain(tokens, allergenTokens)) return true;
    if (allergenTokens.length !== 1) return false;

    const compact = allergenTokens[0] ?? "";
    return (
      compact.length >= MIN_SQUASHED_ALLERGEN && squashed.includes(compact)
    );
  });
}

function tagHitsRules(tag: string, rules: FoodRules): boolean {
  if (allergenHitsText(rules.allergens, tag)) return true;
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
  if (swapTags.some((tag) => tagHitsRules(tag, rules))) return true;
  return allergenHitsText(rules.allergens, swapLabel);
}

export function filterSwapsByRules(
  labels: string[],
  tags: Record<string, string[]>,
  rules: FoodRules,
): string[] {
  return labels.filter((label) => !swapViolatesRules(label, tags, rules));
}
