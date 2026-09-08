const MAX_CRAVING_LABEL = 60;
const MAX_SWAP_LABEL = 80;

export const MIN_USUAL_CRAVINGS = 3;

export const CRAVING_SUGGESTIONS = [
  "Ice cream",
  "Pizza",
  "Chips",
  "Chocolate",
  "Cookies",
  "Cheese",
  "Bread",
  "Soda",
  "Fast food",
  "Desserts",
] as const;

export function getUnusedCravingSuggestions(
  existingLabels: readonly string[],
): string[] {
  const have = new Set(
    existingLabels.map((label) => label.trim().toLowerCase()).filter(Boolean),
  );
  return CRAVING_SUGGESTIONS.filter((label) => !have.has(label.toLowerCase()));
}

export function getCravingSetupProgress(count: number): {
  added: number;
  remaining: number;
  complete: boolean;
} {
  const added = Math.max(0, count);
  const remaining = Math.max(0, MIN_USUAL_CRAVINGS - added);
  return { added, remaining, complete: remaining === 0 };
}

export function normalizeCravingLabel(raw: string): string {
  return raw.trim();
}

export function getCravingLabelValidationError(
  raw: string,
  existingLower: string[],
): string | null {
  const value = normalizeCravingLabel(raw);
  if (value.length === 0) return "Enter a craving name.";
  if (value.length > MAX_CRAVING_LABEL) {
    return "Keep craving names under 60 characters.";
  }
  if (existingLower.includes(value.toLowerCase())) {
    return "That craving is already listed.";
  }
  return null;
}

export function getSwapLabelValidationError(raw: string): string | null {
  const value = raw.trim();
  if (value.length === 0) return "Enter a swap.";
  if (value.length > MAX_SWAP_LABEL) return "Keep swap names under 80 characters.";
  return null;
}
