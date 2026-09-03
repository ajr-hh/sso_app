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
  | "messages";

export type RailOption = {
  id: RailId;
  title: string;
};

export const RAIL_OPTIONS: readonly RailOption[] = [
  { id: "why", title: "Remember Your Why" },
  { id: "hard_truths", title: "Hard Truths" },
  { id: "stats", title: "The Numbers" },
  { id: "rewards", title: "Small Wins" },
  { id: "food", title: "Better Choices" },
  { id: "messages", title: "Coach Messages" },
];

const MOTIVATOR_RAILS: Readonly<Record<string, RailId>> = {
  "remember why": "why",
  "the numbers": "stats",
  rewards: "rewards",
};

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

function railForMotivator(motivator: string): RailId | undefined {
  return MOTIVATOR_RAILS[motivator.trim().toLowerCase()];
}

export function isPreferredRail(
  railId: RailId,
  motivators: readonly string[],
): boolean {
  return motivators.some(
    (motivator) => railForMotivator(motivator) === railId,
  );
}

export function rankRails(motivators: readonly string[]): RailOption[] {
  return [...RAIL_OPTIONS].sort(
    (left, right) =>
      Number(isPreferredRail(right.id, motivators)) -
      Number(isPreferredRail(left.id, motivators)),
  );
}
