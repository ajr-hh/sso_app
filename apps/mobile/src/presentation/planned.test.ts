import {
  canSaveOtherEvent,
  CHECK_IN_LABEL,
  customEventPills,
  eventKindFromLabel,
  fallbackSuggestionsFor,
  getCheckInTaskLabel,
  getRemoveEventLabel,
  getSuggestionsHeading,
  HOLIDAY_MEAL_SUGGESTIONS,
  parsePlannedSuggestions,
  PLAN_AHEAD_COPY,
  upcomingEventChips,
  UPCOMING_EVENTS,
} from "./planned";

describe("UPCOMING_EVENTS", () => {
  test("offers the three events plus Other", () => {
    expect(UPCOMING_EVENTS).toEqual([
      "Holiday meal",
      "Celebration",
      "Travel",
      "Other",
    ]);
  });
});

describe("PLAN_AHEAD_COPY", () => {
  test("names the check-in the way the screen should", () => {
    expect(CHECK_IN_LABEL).toBe("Set a check in for tomorrow.");
    expect(PLAN_AHEAD_COPY.save).toBe("Save");
    expect(PLAN_AHEAD_COPY.suggestions).toBe("Suggestions");
    expect(PLAN_AHEAD_COPY.loadMore).toBe("Load more suggestions");
  });

  test("names the remove control for a saved event", () => {
    expect(getRemoveEventLabel("Office dinner")).toBe("Remove Office dinner");
  });
});

describe("canSaveOtherEvent", () => {
  test("needs a typed label before Other can save", () => {
    expect(canSaveOtherEvent("")).toBe(false);
    expect(canSaveOtherEvent("   ")).toBe(false);
    expect(canSaveOtherEvent("Office dinner")).toBe(true);
  });
});

describe("eventKindFromLabel", () => {
  test("maps the chips to generate kinds", () => {
    expect(eventKindFromLabel("Holiday meal")).toBe("holiday_meal");
    expect(eventKindFromLabel("Celebration")).toBe("celebration");
    expect(eventKindFromLabel("Travel")).toBe("travel");
    expect(eventKindFromLabel("Other")).toBe("other");
  });
});

describe("HOLIDAY_MEAL_SUGGESTIONS", () => {
  test("keeps three healthier Holiday meal lines", () => {
    expect(HOLIDAY_MEAL_SUGGESTIONS).toEqual([
      {
        icon: "restaurant",
        text: "Eat a protein and vegetable plate first, then decide if you still want extras.",
      },
      {
        icon: "local_bar",
        text: "Drink water between any alcohol, and stop after one.",
      },
      {
        icon: "chat",
        text: "Tell one person your food plan so they can help you stay with it.",
      },
    ]);
  });
});

describe("custom event pills", () => {
  test("turns saved Other labels into chips before Other", () => {
    expect(
      customEventPills([
        { event_kind: "holiday_meal", custom_label: null },
        { event_kind: "other", custom_label: "Office dinner" },
        { event_kind: "other", custom_label: "office dinner" },
        { event_kind: "other", custom_label: "Wedding brunch" },
      ]),
    ).toEqual(["Office dinner", "Wedding brunch"]);
    expect(upcomingEventChips(["Office dinner"])).toEqual([
      "Holiday meal",
      "Celebration",
      "Travel",
      "Office dinner",
      "Other",
    ]);
  });
});

describe("fallbackSuggestionsFor", () => {
  test("uses the Holiday meal lines for that event", () => {
    expect(fallbackSuggestionsFor("Holiday meal")).toEqual(
      HOLIDAY_MEAL_SUGGESTIONS,
    );
  });

  test("names Other fallbacks after the typed event", () => {
    const suggestions = fallbackSuggestionsFor("Other", "Office dinner");
    expect(suggestions.map((item) => item.text).join(" ")).toContain(
      "Office dinner",
    );
    expect(suggestions).not.toEqual(HOLIDAY_MEAL_SUGGESTIONS);
  });
});

describe("parsePlannedSuggestions", () => {
  test("accepts three distinct suggestions with the plan-ahead icons", () => {
    expect(parsePlannedSuggestions({ suggestions: HOLIDAY_MEAL_SUGGESTIONS }))
      .toEqual(HOLIDAY_MEAL_SUGGESTIONS);
  });

  test("rejects the wrong count or a missing icon", () => {
    expect(parsePlannedSuggestions({ suggestions: [] })).toBeNull();
    expect(
      parsePlannedSuggestions({
        suggestions: HOLIDAY_MEAL_SUGGESTIONS.slice(0, 2),
      }),
    ).toBeNull();
    expect(
      parsePlannedSuggestions({
        suggestions: [
          { icon: "restaurant", text: "Eat first." },
          { icon: "local_bar", text: "One drink." },
          { icon: "flag", text: "Tell someone." },
        ],
      }),
    ).toBeNull();
    expect(
      parsePlannedSuggestions({
        suggestions: [
          { icon: "chat", text: "Tell someone first." },
          { icon: "local_bar", text: "One drink." },
          { icon: "restaurant", text: "Eat first." },
        ],
      }),
    ).toBeNull();
  });
});

describe("getSuggestionsHeading", () => {
  test("names the chosen event", () => {
    expect(getSuggestionsHeading("Holiday meal", "")).toBe(
      "Suggestions for Holiday meal",
    );
    expect(getSuggestionsHeading("Other", "Office dinner")).toBe(
      "Suggestions for Office dinner",
    );
  });
});

describe("getCheckInTaskLabel", () => {
  test("names the chosen event in the task", () => {
    expect(getCheckInTaskLabel("Holiday meal")).toBe(
      "Check in on your holiday meal plan",
    );
  });

  test("uses the typed Other label when they wrote one", () => {
    expect(getCheckInTaskLabel("Other", "Office dinner")).toBe(
      "Check in on your office dinner plan",
    );
  });

  test("still reads as a plan when no event was chosen", () => {
    expect(getCheckInTaskLabel(null)).toBe("Check in on your plan");
  });
});
