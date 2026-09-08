export const OTHER_TOOLS_EYEBROW = "Other tools";

export const OTHER_TOOL_ROUTES = {
  challenge: "/(app)/tools/challenges",
  challengeNew: "/(app)/tools/challenges/new",
  restaurant: "/(app)/tools/restaurant",
  alias: "/(app)/tools/alias",
} as const;

export const DEFAULT_CHALLENGE_DURATION_DAYS = 30;
export const DEFAULT_CHALLENGE_BUY_IN = 20;

export const CHALLENGE_COPY = {
  joinLabel: "Join a challenge",
  listTitle: "Group challenge",
  listSubtitle: "Pick a challenge, or start one of your own.",
  start: "Start a challenge",
  title: "Create a group challenge",
  subtitle:
    "Pull together a group, set the rules, and stay accountable together.",
  rules: "Challenge rules",
  logWeight: "Log weight daily",
  missRule: "Miss 3 days in a row → eliminated",
  prize: "Prize pool",
  invite: "Invite friends",
  inviting: "Opening mail…",
  prizeBody(buyIn: number) {
    return `Everyone contributes $${buyIn} and winner takes the pool.`;
  },
};

export function formatChallengeDuration(days: number): string {
  return `${days}-day duration`;
}

export function getPrizePoolLabel(amount: number): string {
  return `$${amount}`;
}

export function getPrizePeopleLine(count: number): string {
  return `${count} people in so far`;
}

export function prizePoolAmount(buyIn: number, people: number): number {
  return buyIn * people;
}

export function getChallengeListLabel(input: {
  durationDays: number;
  buyIn: number;
}): string {
  return `${input.durationDays}-day challenge, $${input.buyIn} buy-in`;
}

export function getChallengeInviteHref(input: {
  buyIn: number;
  durationDays: number;
}): string {
  const subject = "Join my Humanaut challenge";
  const body = `I started a ${input.durationDays}-day challenge. Buy-in is $${input.buyIn}, and the winner takes the pool.`;
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export const RESTAURANT_COPY = {
  button: "Restaurant finder",
  title: "Best choices, your favorite spots",
  subtitle: "We scan the menu and rank it against your goals.",
  scan: "Scan a menu",
  scanning: "Reading the menu…",
  add: "Add a restaurant",
  nameLabel: "Restaurant name",
  save: "Save spot",
  saving: "Saving…",
  generating: "Finding the best pick…",
  proteinLabel: "Protein target (g)",
  calorieLabel: "Calorie max",
  targetsHeading: "Your macro targets",
  footnote:
    "Add your top 10 restaurants and set your macro targets, SOS keeps the list ready for next time.",
  max: 10,
} as const;

export const DEFAULT_PROTEIN_TARGET = 40;
export const DEFAULT_CALORIE_MAX = 700;
export const MAX_RESTAURANT_NAME = 80;
export const MAX_BEST_PICK = 160;
export const MAX_RESTAURANT_FILTER = 120;
export const MAX_PROTEIN_TARGET = 300;
export const MAX_CALORIE_MAX = 5000;

export function clipRestaurantFields(input: {
  name: string;
  bestPick: string;
  filter: string;
}): { name: string; bestPick: string; filter: string } {
  return {
    name: input.name.trim().slice(0, MAX_RESTAURANT_NAME),
    bestPick: input.bestPick.trim().slice(0, MAX_BEST_PICK),
    filter: input.filter.trim().slice(0, MAX_RESTAURANT_FILTER),
  };
}

export function clampRestaurantTargets(input: {
  protein_grams: number;
  calorie_max: number;
}): { protein_grams: number; calorie_max: number } {
  return {
    protein_grams: Math.min(
      MAX_PROTEIN_TARGET,
      Math.max(1, Math.floor(input.protein_grams) || 1),
    ),
    calorie_max: Math.min(
      MAX_CALORIE_MAX,
      Math.max(1, Math.floor(input.calorie_max) || 1),
    ),
  };
}

export function restaurantFilterLine(
  proteinGrams: number,
  calorieMax: number,
): string {
  const clamped = clampRestaurantTargets({
    protein_grams: proteinGrams,
    calorie_max: calorieMax,
  });
  return `Filtered for: ${clamped.protein_grams}g+ protein, under ${clamped.calorie_max} cal`;
}

export const ALIAS_LEVELS = [
  "A little better",
  "Mid",
  "Very healthy",
] as const;

export type AliasLevel = (typeof ALIAS_LEVELS)[number];

export const ALIAS_COPY = {
  button: "Food alias swap",
  title: "Food alias",
  subtitle: "Enter a craving, get a swap that fits how far you want to flex.",
  craving: "Your craving",
  flex: "How healthy should the swap be?",
  save: "Save this swap",
  saving: "Saving…",
  generate: "Find a swap",
  generating: "Finding a swap…",
} as const;

export function isAliasLevel(value: unknown): value is AliasLevel {
  return (
    typeof value === "string" &&
    (ALIAS_LEVELS as readonly string[]).includes(value)
  );
}
