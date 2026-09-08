import { explainError } from "../lib/errors";
import { getSupabase } from "../lib/supabase";
import {
  parseSwapRecipe,
  recipeTitleKey,
  RECIPE_ERRORS,
  type SwapRecipe,
} from "../presentation/recipes";

const FAILED_MESSAGE = RECIPE_ERRORS.load;

export async function fetchSwapRecipe(
  title: string,
): Promise<SwapRecipe | null> {
  const key = recipeTitleKey(title);
  if (key.length === 0) {
    return null;
  }

  const { data, error } = await getSupabase()
    .from("swap_recipes")
    .select(
      "id, title, summary, ingredients, steps, minutes, servings, rule_tags",
    )
    .eq("title_key", key)
    .maybeSingle();

  if (error) {
    throw new Error(FAILED_MESSAGE);
  }
  if (!data) {
    return null;
  }

  const recipe = parseSwapRecipe(data);
  if (!recipe) {
    throw new Error(FAILED_MESSAGE);
  }
  return recipe;
}

function isRateLimited(error: unknown): boolean {
  const { context } = (error ?? {}) as { context?: { status?: unknown } };
  return context?.status === 429;
}

function explainRecipeFailure(error: unknown): string {
  if (isRateLimited(error)) {
    return "That's a lot of new recipes for one hour. Try again later.";
  }
  const message = error instanceof Error ? error.message : "";
  if (error instanceof TypeError || /network/i.test(message)) {
    return explainError(error);
  }
  return FAILED_MESSAGE;
}

export async function generateSwapRecipe(title: string): Promise<SwapRecipe> {
  const dish = title.trim();
  if (dish.length === 0) {
    throw new Error(FAILED_MESSAGE);
  }

  let response: { data: unknown; error: unknown };
  try {
    response = await getSupabase().functions.invoke("sos-generate", {
      body: {
        kind: "swap_recipe",
        input: { dish_label: dish },
      },
    });
  } catch (caught) {
    throw new Error(explainRecipeFailure(caught));
  }

  if (response.error) {
    throw new Error(explainRecipeFailure(response.error));
  }

  const job = response.data as
    | { status?: unknown; output?: unknown }
    | null
    | undefined;
  if (!job || job.status !== "succeeded") {
    throw new Error(FAILED_MESSAGE);
  }

  const recipe = parseSwapRecipe(job.output);
  if (!recipe) {
    throw new Error(FAILED_MESSAGE);
  }
  return recipe;
}

export async function loadSwapRecipe(title: string): Promise<SwapRecipe> {
  const existing = await fetchSwapRecipe(title);
  if (existing) {
    return existing;
  }
  return generateSwapRecipe(title);
}
