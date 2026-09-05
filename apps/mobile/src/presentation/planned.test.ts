import { getCheckInTaskLabel, UPCOMING_EVENTS } from "./planned";

describe("UPCOMING_EVENTS", () => {
  test("offers the three events the screen shows", () => {
    expect(UPCOMING_EVENTS).toEqual(["Holiday Meal", "Celebration", "Travel"]);
  });
});

describe("getCheckInTaskLabel", () => {
  test("names the chosen event in the task", () => {
    expect(getCheckInTaskLabel("Holiday Meal")).toBe(
      "Check in on your holiday meal plan",
    );
  });

  test("still reads as a plan when no event was chosen", () => {
    expect(getCheckInTaskLabel(null)).toBe("Check in on your plan");
  });
});
