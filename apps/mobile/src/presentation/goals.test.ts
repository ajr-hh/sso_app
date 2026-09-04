import {
  getGoalStatusMessage,
  shouldAnnounceGoalStatus,
  shouldShowGoalsInitialLoadFailure,
} from "./goals";

describe("goals presentation", () => {
  test("shows the blocking retry only when the initial load failed", () => {
    expect(
      shouldShowGoalsInitialLoadFailure(false, "Goals could not be loaded"),
    ).toBe(true);
    expect(
      shouldShowGoalsInitialLoadFailure(true, "Goals could not be saved"),
    ).toBe(false);
    expect(shouldShowGoalsInitialLoadFailure(false, null)).toBe(false);
  });

  test("describes successful mutations with the affected goal text", () => {
    expect(getGoalStatusMessage("added", "Read")).toBe("Goal added: Read.");
    expect(getGoalStatusMessage("updated", "Walk")).toBe(
      "Goal updated: Walk.",
    );
    expect(getGoalStatusMessage("removed", "Call Sam")).toBe(
      "Goal removed: Call Sam.",
    );
  });

  test("uses imperative announcements only on iOS", () => {
    expect(shouldAnnounceGoalStatus("ios")).toBe(true);
    expect(shouldAnnounceGoalStatus("android")).toBe(false);
  });
});
