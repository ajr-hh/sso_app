import {
  describeJournalEntry,
  getJournalDeleteConfirmation,
  getJournalEditAnnouncement,
  getJournalEntryActionLabel,
  getJournalSentimentAccessibilityLabel,
  getJournalSentimentIcon,
  getJournalStatusMessage,
  normalizeJournalSentiment,
  shouldAnnounceJournalMessage,
} from "./journal";

const FORMAT = { locales: "en-US", timeZone: "UTC" } as const;
const GOOD_DAY_ENTRY = {
  mood: "Good day",
  created_at: "2026-09-04T15:00:00.000Z",
};
const LEGACY_ENTRY = {
  mood: "Hopeful",
  created_at: "2026-09-04T15:00:00.000Z",
};

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

  test.each(["Good day", "Tough day", "Mixed"] as const)(
    "includes group context in the %s radio label",
    (sentiment) => {
      expect(getJournalSentimentAccessibilityLabel(sentiment)).toBe(
        `Today's sentiment, ${sentiment}`,
      );
    },
  );

  test("uses explicit announcements only on iOS", () => {
    expect(shouldAnnounceJournalMessage("ios")).toBe(true);
    expect(shouldAnnounceJournalMessage("android")).toBe(false);
    expect(shouldAnnounceJournalMessage("web")).toBe(false);
  });
});

describe("journal entry descriptions", () => {
  test("describes an entry by sentiment, date and time", () => {
    expect(describeJournalEntry(GOOD_DAY_ENTRY, FORMAT)).toMatch(
      /^Good day · Sep 4, 2026, 3:00\s?PM$/,
    );
  });

  test("describes legacy moods as Mixed", () => {
    expect(describeJournalEntry(LEGACY_ENTRY, FORMAT)).toMatch(
      /^Mixed · Sep 4, 2026, 3:00\s?PM$/,
    );
  });

  test.each(["Edit", "Delete"] as const)(
    "gives the %s action an entry-specific label",
    (action) => {
      expect(getJournalEntryActionLabel(action, GOOD_DAY_ENTRY, FORMAT)).toMatch(
        new RegExp(`^${action} Good day entry from Sep 4, 2026, 3:00\\s?PM$`),
      );
    },
  );

  test("labels for different entries stay distinct", () => {
    const earlier = {
      mood: "Tough day",
      created_at: "2026-09-03T09:30:00.000Z",
    };

    expect(getJournalEntryActionLabel("Edit", GOOD_DAY_ENTRY, FORMAT)).not.toBe(
      getJournalEntryActionLabel("Edit", earlier, FORMAT),
    );
  });
});

describe("journal announcements", () => {
  test("identifies the selected entry in the delete confirmation", () => {
    const confirmation = getJournalDeleteConfirmation(GOOD_DAY_ENTRY, FORMAT);

    expect(confirmation.title).toBe("Delete Good day entry?");
    expect(confirmation.message).toMatch(
      /^Your entry from Sep 4, 2026, 3:00\s?PM will be permanently deleted\.$/,
    );
  });

  test("announces which entry entered edit mode", () => {
    expect(getJournalEditAnnouncement(GOOD_DAY_ENTRY, FORMAT)).toMatch(
      /^Editing your Good day entry from Sep 4, 2026, 3:00\s?PM\. Update or cancel below\.$/,
    );
  });

  test.each([
    ["created", "Check-in saved."],
    ["updated", "Check-in updated."],
    ["deleted", "Journal entry deleted."],
  ] as const)("reports the %s status", (kind, expected) => {
    expect(getJournalStatusMessage(kind)).toBe(expected);
  });
});
