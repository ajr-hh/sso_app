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

  test("COACH_LIBRARY marcus and elena are nonempty", () => {
    expect(COACH_LIBRARY.marcus.length).toBeGreaterThan(0);
    expect(COACH_LIBRARY.elena.length).toBeGreaterThan(0);
  });
});
