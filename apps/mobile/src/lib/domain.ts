export type PhotoMode = "remember_why" | "hard_truths";

export type HardTruthTag = "proud_of_this" | "never_again";

type ReinforcementPhotoInput = {
  mode: PhotoMode;
  caption: string;
  tag?: HardTruthTag;
};

type ValidationResult = { ok: true } | { ok: false; error: string };

export type RailId =
  | "why"
  | "hard_truths"
  | "stats"
  | "rewards"
  | "food"
  | "messages"
  | "call";

export type RailOption = {
  id: RailId;
  title: string;
  icon:
    | "favorite"
    | "bolt"
    | "chart_data"
    | "redeem"
    | "nutrition"
    | "call"
    | "chat";
};

export const RAIL_OPTIONS: readonly RailOption[] = [
  { icon: "nutrition", id: "food", title: "Better Choices" },
  { icon: "chat", id: "messages", title: "Coach Messages" },
  { icon: "bolt", id: "hard_truths", title: "Hard Truths" },
  { icon: "favorite", id: "why", title: "Remember Your Why" },
  { icon: "redeem", id: "rewards", title: "Small Wins" },
  { icon: "call", id: "call", title: "Talk to Someone" },
  { icon: "chart_data", id: "stats", title: "The Numbers" },
];

const RAIL_BY_ID = new Map(RAIL_OPTIONS.map((rail) => [rail.id, rail]));
const RAIL_IDS = new Set<string>(RAIL_OPTIONS.map(({ id }) => id));

export function isRailId(value: unknown): value is RailId {
  return typeof value === "string" && RAIL_IDS.has(value);
}

const padDatePart = (value: number): string => String(value).padStart(2, "0");

export function toDayKey(date: Date): string {
  return [
    date.getFullYear(),
    padDatePart(date.getMonth() + 1),
    padDatePart(date.getDate()),
  ].join("-");
}

export function addDays(dayKey: string, amount: number): string {
  const [year, month, day] = dayKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + amount));

  return [
    date.getUTCFullYear(),
    padDatePart(date.getUTCMonth() + 1),
    padDatePart(date.getUTCDate()),
  ].join("-");
}

export function journalStreak(
  entryDayKeys: readonly string[],
  todayDayKey: string,
): number {
  const entryDays = new Set(entryDayKeys);
  let streak = 0;
  let day = todayDayKey;

  while (entryDays.has(day)) {
    streak += 1;
    day = addDays(day, -1);
  }

  return streak;
}

// Name and why-it-matters are what the rest of the app greets and coaches with,
// so onboarding collects them before the tabs are usable. Age and contact info
// stay optional.
export function isProfileComplete(profile: {
  display_name: string | null;
  why_matters: string | null;
}): boolean {
  return Boolean(profile.display_name?.trim() && profile.why_matters?.trim());
}

export function initialsFromName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return "?";
  }

  const initials =
    words.length === 1
      ? words[0].slice(0, 2)
      : `${words[0][0]}${words[words.length - 1][0]}`;

  return initials.toUpperCase();
}

export function validateReinforcementPhoto(
  photo: ReinforcementPhotoInput,
): ValidationResult {
  if (photo.mode !== "hard_truths") {
    return { ok: true };
  }

  if (!photo.tag) {
    return { ok: false, error: "Tag the photo before saving." };
  }

  if (!photo.caption.trim()) {
    return { ok: false, error: "Write your own caption before saving." };
  }

  return { ok: true };
}

export function orderRails(
  savedOrder: readonly unknown[] | null | undefined,
): RailOption[] {
  const ordered: RailOption[] = [];
  const seen = new Set<RailId>();

  for (const id of savedOrder ?? []) {
    if (isRailId(id) && !seen.has(id)) {
      seen.add(id);
      ordered.push(RAIL_BY_ID.get(id)!);
    }
  }

  for (const rail of RAIL_OPTIONS) {
    if (!seen.has(rail.id)) {
      ordered.push(rail);
    }
  }

  return ordered;
}
