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

export type JournalEntrySummary = {
  mood: string | null;
  created_at: string;
};

export type JournalTimestampFormat = {
  locales?: string | string[];
  timeZone?: string;
};

export type JournalEntryAction = "Edit" | "Delete";

export type JournalStatusKind = "created" | "updated" | "deleted";

export function formatJournalTimestamp(
  createdAt: string,
  format: JournalTimestampFormat = {},
): string {
  return new Date(createdAt).toLocaleString(format.locales, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: format.timeZone,
  });
}

export function describeJournalEntry(
  entry: JournalEntrySummary,
  format?: JournalTimestampFormat,
): string {
  return `${normalizeJournalSentiment(entry.mood)} · ${formatJournalTimestamp(
    entry.created_at,
    format,
  )}`;
}

export function getJournalEntryActionLabel(
  action: JournalEntryAction,
  entry: JournalEntrySummary,
  format?: JournalTimestampFormat,
): string {
  return `${action} ${normalizeJournalSentiment(
    entry.mood,
  )} entry from ${formatJournalTimestamp(entry.created_at, format)}`;
}

export function getJournalDeleteConfirmation(
  entry: JournalEntrySummary,
  format?: JournalTimestampFormat,
): { title: string; message: string } {
  return {
    title: `Delete ${normalizeJournalSentiment(entry.mood)} entry?`,
    message: `Your entry from ${formatJournalTimestamp(
      entry.created_at,
      format,
    )} will be permanently deleted.`,
  };
}

export function getJournalEditAnnouncement(
  entry: JournalEntrySummary,
  format?: JournalTimestampFormat,
): string {
  return `Editing your ${normalizeJournalSentiment(
    entry.mood,
  )} entry from ${formatJournalTimestamp(
    entry.created_at,
    format,
  )}. Update or cancel below.`;
}

export function getJournalStatusMessage(kind: JournalStatusKind): string {
  switch (kind) {
    case "created":
      return "Check-in saved.";
    case "updated":
      return "Check-in updated.";
    default:
      return "Journal entry deleted.";
  }
}
