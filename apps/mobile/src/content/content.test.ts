import { COACH_LIBRARY } from "./coach";
import { FOOD_SWAPS } from "./food-swaps";
import { STATS } from "./stats";

describe("static content", () => {
  test("STATS has three entries", () => {
    expect(STATS.length).toBe(3);
  });

  test('FOOD_SWAPS["Ice cream"] is nonempty', () => {
    expect(FOOD_SWAPS["Ice cream"].length).toBeGreaterThan(0);
  });

  test("COACH_LIBRARY has four coaches and no em dashes", () => {
    expect(Object.keys(COACH_LIBRARY)).toEqual([
      "marcus",
      "elena",
      "sam",
      "jordan",
    ]);
    for (const messages of Object.values(COACH_LIBRARY)) {
      expect(messages.length).toBeGreaterThan(0);
      expect(messages.join(" ")).not.toContain("—");
      expect(messages.join(" ")).not.toContain("–");
    }
  });
});
