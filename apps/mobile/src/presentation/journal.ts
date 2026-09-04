import type { JournalSentiment } from "../data/journal";

export type JournalSentimentIcon =
  | "sentiment_satisfied"
  | "sentiment_dissatisfied"
  | "sentiment_neutral";

export function normalizeJournalSentiment(
  mood: string | null,
): JournalSentiment {
  if (mood === "Good day" || mood === "Tough day") {
    return mood;
  }

  return "Mixed";
}

export function getJournalSentimentIcon(
  mood: string | null,
): JournalSentimentIcon {
  switch (normalizeJournalSentiment(mood)) {
    case "Good day":
      return "sentiment_satisfied";
    case "Tough day":
      return "sentiment_dissatisfied";
    default:
      return "sentiment_neutral";
  }
}
