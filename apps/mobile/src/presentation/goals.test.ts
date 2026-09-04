import { shouldShowGoalsInitialLoadFailure } from "./goals";

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
});
