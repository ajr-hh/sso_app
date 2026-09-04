import {
  getJournalSentimentIcon,
  normalizeJournalSentiment,
} from "./journal";

describe("journal presentation", () => {
  test.each([
    ["Good day", "Good day"],
    ["Tough day", "Tough day"],
    ["Mixed", "Mixed"],
    ["Steady", "Mixed"],
    ["", "Mixed"],
    [null, "Mixed"],
  ] as const)("normalizes %p to %p", (mood, expected) => {
    expect(normalizeJournalSentiment(mood)).toBe(expected);
  });

  test.each([
    ["Good day", "sentiment_satisfied"],
    ["Tough day", "sentiment_dissatisfied"],
    ["Mixed", "sentiment_neutral"],
    ["Hopeful", "sentiment_neutral"],
    [null, "sentiment_neutral"],
  ] as const)("maps %p to the %s symbol", (mood, expected) => {
    expect(getJournalSentimentIcon(mood)).toBe(expected);
  });
});
