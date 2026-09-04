import {
  isProfileComplete,
  RAIL_OPTIONS,
  addDays,
  initialsFromName,
  isPreferredRail,
  journalStreak,
  rankRails,
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
  test("defines the six v1 rails without a live call", () => {
    expect(RAIL_OPTIONS).toHaveLength(6);
    expect(RAIL_OPTIONS.map(({ id }) => id)).toEqual([
      "why",
      "hard_truths",
      "stats",
      "rewards",
      "food",
      "messages",
    ]);
    expect(RAIL_OPTIONS.some(({ title }) => /call/i.test(title))).toBe(false);
  });

  test("ranks recognized motivators and ignores a live call", () => {
    const ranked = rankRails(["The numbers", "A live call"]);

    expect(ranked[0].id).toBe("stats");
    expect(ranked.some(({ id }) => id === ("call" as never))).toBe(false);
  });

  test("identifies whether a rail matches a preferred motivator", () => {
    expect(isPreferredRail("why", ["Remember why"])).toBe(true);
    expect(isPreferredRail("food", ["Remember why"])).toBe(false);
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
