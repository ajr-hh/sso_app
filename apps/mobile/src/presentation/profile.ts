export const MOTIVATION_OPTIONS = [
  "Better Choices",
  "Coach Messages",
  "Hard Truths",
  "Remember Your Why",
  "Small Wins",
  "Talk to Someone",
  "The Numbers",
] as const;

export const MOTIVATION_PROMPT = "How do you want to be motivated";

export const PROFILE_LOG_OUT = "Log out";

export type MotivationOption = (typeof MOTIVATION_OPTIONS)[number];

const motivationOptions = new Set<string>(MOTIVATION_OPTIONS);

export function isMotivationOption(value: string): value is MotivationOption {
  return motivationOptions.has(value);
}

export function applySilentProfileRefresh<Current extends object>(
  current: Current,
  incoming: Current,
  dirtyKeys: ReadonlySet<string> = new Set(),
): Current {
  const next = { ...incoming };
  for (const key of dirtyKeys) {
    if (Object.prototype.hasOwnProperty.call(current, key)) {
      (next as Record<string, unknown>)[key] = current[key as keyof Current];
    }
  }
  return next;
}
