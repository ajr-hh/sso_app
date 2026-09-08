export const COACH_IDS = ["marcus", "elena", "sam", "jordan"] as const;

export type CoachId = (typeof COACH_IDS)[number];

export type CoachProfile = {
  id: CoachId;
  name: string;
  blurb: string;
};

export const COACHES: Readonly<Record<CoachId, CoachProfile>> = {
  marcus: {
    id: "marcus",
    name: "Marcus",
    blurb: "Direct. Short. No pep talk.",
  },
  elena: {
    id: "elena",
    name: "Elena",
    blurb: "Warm and steady. On your side.",
  },
  sam: {
    id: "sam",
    name: "Sam",
    blurb: "A friend who keeps it real.",
  },
  jordan: {
    id: "jordan",
    name: "Jordan",
    blurb: "Calm. Asks the useful question.",
  },
};

export const COACH_COPY = {
  pickerTitle: "Who do you want in your corner?",
  pickerBody: "Pick one coach. You can change this later in Profile.",
  composerLabel: "Message your coach",
  send: "Send",
  sending: "Sending…",
  emptyThread: "Your coach will text first.",
  opening: "Your coach is writing first.",
  delete: "Delete",
  clear: "Clear messages",
} as const;

export function coachPickerAccessibilityLabel(
  name: string,
  blurb: string,
): string {
  return `${name}. ${blurb}`;
}

export const COACH_ERRORS = {
  load: "We couldn’t load your coach messages. Try again.",
  send: "We couldn’t send that. Try again.",
  reply: "We couldn’t get a reply right now. Try again.",
  hide: "We couldn’t hide that message. Try again.",
} as const;

export function isCoachId(value: unknown): value is CoachId {
  return typeof value === "string" && (COACH_IDS as readonly string[]).includes(value);
}

export function parseCoachId(value: unknown): CoachId {
  return isCoachId(value) ? value : "marcus";
}

export function getCoachName(id: unknown): string {
  return COACHES[parseCoachId(id)].name;
}

export function shouldPickCoach(coachStyleSet: boolean): boolean {
  return !coachStyleSet;
}

export function humanizeCoachText(raw: string): string {
  return raw
    .replace(/\u2014/g, ",")
    .replace(/\u2013/g, ",")
    .replace(/\s*—\s*/g, ", ")
    .replace(/\s*–\s*/g, ", ")
    .replace(/\b(as an AI|as a language model|I am an AI|I'm an AI)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+,/g, ",")
    .replace(/\.,/g, ",")
    .replace(/\.\s*,/g, ".")
    .trim();
}

export function getCoachMessageValidationError(raw: string): string | null {
  const value = raw.trim();
  if (value.length === 0) return "Write a message first.";
  if (value.length > 280) return "Keep it under 280 characters.";
  return null;
}

export function parseCoachReply(raw: unknown): string | null {
  if (typeof raw === "string") {
    const body = humanizeCoachText(raw);
    return body.length > 0 && body.length <= 400 ? body : null;
  }
  if (typeof raw !== "object" || raw === null) {
    return null;
  }
  const { body } = raw as { body?: unknown };
  if (typeof body !== "string") {
    return null;
  }
  const text = humanizeCoachText(body);
  return text.length > 0 && text.length <= 400 ? text : null;
}
