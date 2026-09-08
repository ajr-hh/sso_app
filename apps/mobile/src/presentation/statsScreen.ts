import { STATS } from "../content/stats";

export const MAX_RESEARCH_FACTS = 20;
export const MAX_FACT_TITLE = 80;
export const MAX_FACT_BODY = 280;
export const MAX_FACT_NUM = 12;

export type ResearchFactSource = "editorial" | "ai" | "member";

export type ResearchFact = {
  id: string;
  num: string | null;
  title: string;
  body: string;
  source: ResearchFactSource;
};

export const STATS_COPY = {
  title: "What the research says",
  subtitle:
    "Plain facts about metabolic health, no spin, just what's true. Use the facts as a pause, not as judgement.",
  rotate: "Show another fact",
  generate: "Get a new fact",
  generating: "Getting a fact…",
  addHeading: "Add a fact",
  addBody: "A number, a short title, and the fact itself.",
  numLabel: "Number",
  titleLabel: "Title",
  bodyLabel: "Fact",
  save: "Save fact",
  saving: "Saving…",
  footnote:
    "You can curate your own stat list, or let SOS rotate from the research library, up to 20 at a time.",
  backOnTrack: "Facts work. Back on track.",
} as const;

export const STATS_ERRORS = {
  load: "We couldn’t load those facts. Try again.",
  save: "We couldn’t save that fact. Try again.",
  generate: "We couldn’t get a new fact right now. Try again.",
} as const;

function humanizeFactText(raw: string): string {
  return raw
    .replace(/\u2014/g, ",")
    .replace(/\u2013/g, ",")
    .replace(/\s*—\s*/g, ", ")
    .replace(/\s*–\s*/g, ", ")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+,/g, ",")
    .replace(/\.,/g, ",")
    .trim();
}

export function mergeResearchFacts(
  saved: readonly ResearchFact[],
): ResearchFact[] {
  const editorial: ResearchFact[] = STATS.map((stat, index) => ({
    id: `editorial-${index}`,
    num: stat.num,
    title: stat.title,
    body: stat.body,
    source: "editorial",
  }));
  return [...editorial, ...saved].slice(0, MAX_RESEARCH_FACTS);
}

export function nextResearchFactIndex(current: number, length: number): number {
  if (length <= 0) return 0;
  return (current + 1) % length;
}

export function parseResearchFact(raw: unknown): Omit<
  ResearchFact,
  "id" | "source"
> | null {
  if (typeof raw !== "object" || raw === null) {
    return null;
  }
  const { num, title, body } = raw as {
    num?: unknown;
    title?: unknown;
    body?: unknown;
  };
  if (typeof title !== "string" || typeof body !== "string") {
    return null;
  }
  const cleanTitle = humanizeFactText(title);
  const cleanBody = humanizeFactText(body);
  if (cleanTitle.length === 0 || cleanTitle.length > MAX_FACT_TITLE) {
    return null;
  }
  if (cleanBody.length === 0 || cleanBody.length > MAX_FACT_BODY) {
    return null;
  }
  let cleanNum: string | null = null;
  if (typeof num === "string") {
    const trimmed = humanizeFactText(num);
    if (trimmed.length > MAX_FACT_NUM) {
      return null;
    }
    cleanNum = trimmed.length > 0 ? trimmed : null;
  }
  return { num: cleanNum, title: cleanTitle, body: cleanBody };
}

export function getResearchFactValidationError(input: {
  title: string;
  body: string;
  num?: string;
}): string | null {
  if (input.title.trim().length === 0) return "Add a short title.";
  if (input.title.trim().length > MAX_FACT_TITLE) {
    return "Keep titles under 80 characters.";
  }
  if (input.body.trim().length === 0) return "Add the fact itself.";
  if (input.body.trim().length > MAX_FACT_BODY) {
    return "Keep facts under 280 characters.";
  }
  if (input.num && input.num.trim().length > MAX_FACT_NUM) {
    return "Keep the number short.";
  }
  return null;
}

export function canAddResearchFact(savedCount: number): boolean {
  return STATS.length + savedCount < MAX_RESEARCH_FACTS;
}
