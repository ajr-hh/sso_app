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

  test("normalizeAllergens trims, lowercases, dedupes, and caps count", () => {
    expect(
      normalizeAllergens(["  Dairy ", "DAIRY", " Shellfish ", "   ", "soy"]),
    ).toEqual(["dairy", "shellfish", "soy"]);
    expect(normalizeAllergens(Array.from({ length: 25 }, (_, i) => ` allergen${i} `))).toHaveLength(
      20,
    );
  });

  test("dairy_free hides dairy-tagged swaps", () => {
    const dairyTags = {
      "Greek yogurt with berries": ["dairy"],
      "Frozen banana, blended": [],
    };
    expect(
      filterSwapsByRules(Object.keys(dairyTags), dairyTags, {
        foodRulesSet: true,
        dietFlags: ["dairy_free"],
        allergens: [],
      }),
    ).toEqual(["Frozen banana, blended"]);
  });

  test("gluten_free hides gluten-tagged swaps", () => {
    const glutenTags = {
      "High-protein tortilla": ["gluten"],
      "Lettuce wrap": [],
    };
    expect(
      filterSwapsByRules(Object.keys(glutenTags), glutenTags, {
        foodRulesSet: true,
        dietFlags: ["gluten_free"],
        allergens: [],
      }),
    ).toEqual(["Lettuce wrap"]);
  });

  test("vegetarian hides meat and fish tags", () => {
    const meatTags = {
      "Grilled chicken wrap": ["meat"],
      "Veggie bowl": [],
    };
    expect(
      filterSwapsByRules(Object.keys(meatTags), meatTags, {
        foodRulesSet: true,
        dietFlags: ["vegetarian"],
        allergens: [],
      }),
    ).toEqual(["Veggie bowl"]);
  });

  test("vegan hides meat, fish, dairy, and egg tags", () => {
    const veganTags = {
      "Egg scramble": ["eggs"],
      "Salmon salad": ["fish"],
      "Cheese slice": ["dairy"],
      "Fruit cup": [],
    };
    expect(
      filterSwapsByRules(Object.keys(veganTags), veganTags, {
        foodRulesSet: true,
        dietFlags: ["vegan"],
        allergens: [],
      }),
    ).toEqual(["Fruit cup"]);
  });

  test("custom allergen list hides matching tags", () => {
    const allergenTags = {
      "Peanut snack": ["peanuts"],
      "Rice cake": [],
    };
    expect(
      filterSwapsByRules(Object.keys(allergenTags), allergenTags, {
        foodRulesSet: true,
        dietFlags: [],
        allergens: ["peanuts"],
      }),
    ).toEqual(["Rice cake"]);
  });
});
