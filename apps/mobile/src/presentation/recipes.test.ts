import {
  getOpenRecipeLabel,
  parseSwapRecipe,
  RECIPE_COPY,
  recipeTitleKey,
} from "./recipes";

const valid = {
  id: "recipe-1",
  title: "Frozen yogurt bark",
  summary: "A colder, lighter crunch that still feels like dessert.",
  ingredients: ["2 cups yogurt", "1 cup berries", "2 tbsp honey"],
  steps: ["Spread yogurt", "Scatter berries", "Freeze until firm"],
  minutes: 15,
  servings: "4",
  rule_tags: ["dairy"],
};

describe("recipeTitleKey", () => {
  test("collapses case and spacing so the same dish shares one row", () => {
    expect(recipeTitleKey("  Frozen   Yogurt Bark ")).toBe(
      "frozen yogurt bark",
    );
  });
});

describe("getOpenRecipeLabel", () => {
  test("names the add-recipe control under each swap", () => {
    expect(RECIPE_COPY.addRecipe).toBe("Recipe");
    expect(getOpenRecipeLabel("Frozen yogurt bark")).toBe(
      "Recipe for Frozen yogurt bark",
    );
  });
});

describe("parseSwapRecipe", () => {
  test("accepts a stored row and generated output", () => {
    expect(parseSwapRecipe(valid)).toEqual({
      id: "recipe-1",
      title: "Frozen yogurt bark",
      summary: "A colder, lighter crunch that still feels like dessert.",
      ingredients: ["2 cups yogurt", "1 cup berries", "2 tbsp honey"],
      steps: ["Spread yogurt", "Scatter berries", "Freeze until firm"],
      minutes: 15,
      servings: "4",
      ruleTags: ["dairy"],
    });
    expect(
      parseSwapRecipe({
        ...valid,
        id: undefined,
        rule_tags: undefined,
        ruleTags: ["dairy"],
      })?.id,
    ).toBe("Frozen yogurt bark");
  });

  test("rejects a short ingredient or step list", () => {
    expect(
      parseSwapRecipe({ ...valid, ingredients: ["yogurt", "berries"] }),
    ).toBeNull();
    expect(parseSwapRecipe({ ...valid, steps: ["Spread", "Freeze"] })).toBeNull();
  });
});
