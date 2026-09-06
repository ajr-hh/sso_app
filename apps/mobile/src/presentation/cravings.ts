const MAX_CRAVING_LABEL = 60;
const MAX_SWAP_LABEL = 80;

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
