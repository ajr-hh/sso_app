import {
  filterSwapsByRules,
  getAllergenValidationError,
  normalizeAllergen,
  normalizeAllergens,
  toggleDietFlag,
} from "./foodRules";

const tags = {
  "Apple with a little peanut butter": ["peanuts", "nuts"],
  "Celery with almond butter": ["nuts"],
  "Protein shake with a few berries": [],
  "Frozen banana, blended": [],
};

describe("food rules", () => {
  test("normalizes allergen labels", () => {
    expect(normalizeAllergen("  Peanuts  ")).toBe("peanuts");
    expect(normalizeAllergen("   ")).toBe(null);
  });

  test("rejects blank, too long, too many, and duplicate allergens", () => {
    expect(getAllergenValidationError("  ", [])).toBeTruthy();
    expect(getAllergenValidationError("x".repeat(41), [])).toBeTruthy();
    expect(getAllergenValidationError("dairy", ["dairy"])).toBeTruthy();
    expect(
      getAllergenValidationError("soy", Array.from({ length: 20 }, (_, i) => `a${i}`)),
    ).toBeTruthy();
    expect(getAllergenValidationError("shellfish", [])).toBeNull();
  });

  test("None clears diet flags and a flag replaces None", () => {
    expect(toggleDietFlag(["vegetarian"], "none")).toEqual([]);
    expect(toggleDietFlag([], "vegan")).toEqual(["vegan"]);
    expect(toggleDietFlag(["vegan"], "vegan")).toEqual([]);
  });

  test("nut_free hides peanut and almond butter ice cream swaps", () => {
    const kept = filterSwapsByRules(Object.keys(tags), tags, {
      foodRulesSet: true,
      dietFlags: ["nut_free"],
      allergens: [],
    });
    expect(kept).toEqual([
      "Protein shake with a few berries",
      "Frozen banana, blended",
    ]);
  });
});
