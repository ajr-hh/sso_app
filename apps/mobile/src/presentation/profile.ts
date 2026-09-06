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

export type MotivationOption = (typeof MOTIVATION_OPTIONS)[number];

const motivationOptions = new Set<string>(MOTIVATION_OPTIONS);

export function isMotivationOption(value: string): value is MotivationOption {
  return motivationOptions.has(value);
}
