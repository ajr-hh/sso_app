import { getSupabase } from "../lib/supabase";
import { fetchSwapRecipe, loadSwapRecipe } from "./recipes";

jest.mock("../lib/supabase", () => ({
  getSupabase: jest.fn(),
}));

const mockedGetSupabase = jest.mocked(getSupabase);

const stored = {
  id: "recipe-1",
  title: "Frozen yogurt bark",
  summary: "A colder, lighter crunch that still feels like dessert.",
  ingredients: ["2 cups yogurt", "1 cup berries", "2 tbsp honey"],
  steps: ["Spread yogurt", "Scatter berries", "Freeze until firm"],
  minutes: 15,
  servings: "4",
  rule_tags: ["dairy"],
};

function mockFrom(result: { data: unknown; error: unknown }) {
  const maybeSingle = jest.fn().mockResolvedValue(result);
  const eq = jest.fn().mockReturnValue({ maybeSingle });
  const select = jest.fn().mockReturnValue({ eq });
  const from = jest.fn().mockReturnValue({ select });
  const invoke = jest.fn();
  mockedGetSupabase.mockReturnValue({
    from,
    functions: { invoke },
  } as never);
  return { eq, invoke, select };
}

describe("swap recipes", () => {
  test("reads a shared recipe by collapsed title", async () => {
    const { eq, select } = mockFrom({ data: stored, error: null });

    await expect(fetchSwapRecipe("  Frozen   Yogurt Bark ")).resolves.toEqual({
      id: "recipe-1",
      title: "Frozen yogurt bark",
      summary: "A colder, lighter crunch that still feels like dessert.",
      ingredients: ["2 cups yogurt", "1 cup berries", "2 tbsp honey"],
      steps: ["Spread yogurt", "Scatter berries", "Freeze until firm"],
      minutes: 15,
      servings: "4",
      ruleTags: ["dairy"],
    });
    expect(select).toHaveBeenCalledWith(
      "id, title, summary, ingredients, steps, minutes, servings, rule_tags",
    );
    expect(eq).toHaveBeenCalledWith("title_key", "frozen yogurt bark");
  });

  test("generates only after a shared miss", async () => {
    const { invoke } = mockFrom({ data: null, error: null });
    invoke.mockResolvedValue({
      data: { job_id: "cached", status: "succeeded", output: stored },
      error: null,
    });

    await expect(loadSwapRecipe("Frozen yogurt bark")).resolves.toMatchObject({
      title: "Frozen yogurt bark",
    });
    expect(invoke).toHaveBeenCalledWith("sos-generate", {
      body: {
        kind: "swap_recipe",
        input: { dish_label: "Frozen yogurt bark" },
      },
    });
  });

  test("skips generation when the shared row already exists", async () => {
    const { invoke } = mockFrom({ data: stored, error: null });
    await loadSwapRecipe("Frozen yogurt bark");
    expect(invoke).not.toHaveBeenCalled();
  });
});
