import {
  isProfileComplete,
  RAIL_OPTIONS,
  addDays,
  initialsFromName,
  isRailId,
  journalStreak,
  orderRails,
  toDayKey,
  validateReinforcementPhoto,
} from "./domain";

describe("calendar helpers", () => {
  test("formats a date as a local calendar key", () => {
    expect(toDayKey(new Date(2026, 8, 3, 23, 30))).toBe("2026-09-03");
  });

  test("adds calendar days to a day key", () => {
    expect(addDays("2026-09-30", 1)).toBe("2026-10-01");
  });
});

describe("journalStreak", () => {
  test("returns zero when today has no entry", () => {
    expect(journalStreak(["2026-09-01"], "2026-09-03")).toBe(0);
  });

  test("counts consecutive days ending today", () => {
    expect(
      journalStreak(
        ["2026-09-01", "2026-09-02", "2026-09-03"],
        "2026-09-03",
      ),
    ).toBe(3);
  });

  test("stops counting at a gap", () => {
    expect(
      journalStreak(["2026-09-01", "2026-09-03"], "2026-09-03"),
    ).toBe(1);
  });

  test("counts duplicate entries on one day once", () => {
    expect(
      journalStreak(["2026-09-03", "2026-09-03"], "2026-09-03"),
    ).toBe(1);
  });
});

describe("initialsFromName", () => {
  test.each([
    ["Rachel T.", "RT"],
    ["Jim", "JI"],
    ["   ", "?"],
  ])("returns initials for %p", (name, expected) => {
    expect(initialsFromName(name)).toBe(expected);
  });
});

describe("validateReinforcementPhoto", () => {
  test("requires a Hard Truths tag", () => {
    const result = validateReinforcementPhoto({
      mode: "hard_truths",
      caption: "This is my reminder",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/Tag the photo/i);
    }
  });

  test("requires the member's own Hard Truths caption", () => {
    const result = validateReinforcementPhoto({
      mode: "hard_truths",
      caption: "  ",
      tag: "never_again",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/Write your own caption/i);
    }
  });

  test("allows an empty Remember Your Why caption", () => {
    expect(
      validateReinforcementPhoto({
        mode: "remember_why",
        caption: "",
      }).ok,
    ).toBe(true);
  });
});

describe("rails", () => {
  test("defines seven rails in alphabetical title order with icons", () => {
    expect(RAIL_OPTIONS).toEqual([
      { icon: "nutrition", id: "food", title: "Better Choices" },
      { icon: "chat", id: "messages", title: "Coach Messages" },
      { icon: "bolt", id: "hard_truths", title: "Hard Truths" },
      { icon: "favorite", id: "why", title: "Remember Your Why" },
      { icon: "redeem", id: "rewards", title: "Small Wins" },
      { icon: "call", id: "call", title: "Talk to Someone" },
      { icon: "chart_data", id: "stats", title: "The Numbers" },
    ]);
  });

  test("defaults to canonical alphabetical order", () => {
    expect(orderRails(null)).toEqual(RAIL_OPTIONS);
    expect(orderRails([])).toEqual(RAIL_OPTIONS);
  });

  test("recognizes only supported rail IDs at runtime", () => {
    expect(isRailId("call")).toBe(true);
    expect(isRailId("unknown")).toBe(false);
    expect(isRailId(7)).toBe(false);
    expect(isRailId(null)).toBe(false);
  });

  test("honors a valid saved order", () => {
    expect(
      orderRails([
        "why",
        "stats",
        "call",
        "messages",
        "food",
        "rewards",
        "hard_truths",
      ]).map(({ id }) => id),
    ).toEqual([
      "why",
      "stats",
      "call",
      "messages",
      "food",
      "rewards",
      "hard_truths",
    ]);
  });

  test("ignores invalid saved values and appends missing rails alphabetically", () => {
    expect(
      orderRails([
        "stats",
        "unknown",
        7,
        null,
        { id: "call" },
        "stats",
        "why",
      ]).map(({ id }) => id),
    ).toEqual([
      "stats",
      "why",
      "food",
      "messages",
      "hard_truths",
      "rewards",
      "call",
    ]);
  });
});

describe("isProfileComplete", () => {
  test.each([
    [{ display_name: "Ada Lovelace", why_matters: "My kids." }, true],
    [{ display_name: null, why_matters: "My kids." }, false],
    [{ display_name: "Ada Lovelace", why_matters: null }, false],
    [{ display_name: "  ", why_matters: "My kids." }, false],
    [{ display_name: "Ada Lovelace", why_matters: "   " }, false],
    [{ display_name: null, why_matters: null }, false],
  ])("treats %p as complete: %p", (profile, expected) => {
    expect(isProfileComplete(profile)).toBe(expected);
  });
});
