export type SwapRecipe = {
  id: string;
  title: string;
  summary: string;
  ingredients: string[];
  steps: string[];
  minutes: number | null;
  servings: string | null;
  ruleTags: string[];
};

export const RECIPE_COPY = {
  addRecipe: "Recipe",
  loading: "Getting the recipe…",
  note: "Check ingredients and labels for your allergies.",
} as const;

export const RECIPE_ERRORS = {
  load: "We couldn’t open that recipe. Try again.",
} as const;

export function recipeTitleKey(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, " ");
}

export function getOpenRecipeLabel(title: string): string {
  return `Recipe for ${title}`;
}

function readLines(
  raw: unknown,
  min: number,
  max: number,
  maxLength: number,
): string[] | null {
  if (!Array.isArray(raw) || raw.length < min || raw.length > max) {
    return null;
  }

  const lines: string[] = [];
  for (const entry of raw) {
    if (typeof entry !== "string") {
      return null;
    }
    const line = entry.trim();
    if (line.length === 0 || line.length > maxLength) {
      return null;
    }
    lines.push(line);
  }
  return lines;
}

export function parseSwapRecipe(raw: unknown): SwapRecipe | null {
  if (typeof raw !== "object" || raw === null) {
    return null;
  }

  const row = raw as {
    id?: unknown;
    title?: unknown;
    summary?: unknown;
    ingredients?: unknown;
    steps?: unknown;
    minutes?: unknown;
    servings?: unknown;
    ruleTags?: unknown;
    rule_tags?: unknown;
  };

  if (typeof row.title !== "string") {
    return null;
  }
  const title = row.title.trim();
  if (title.length === 0 || title.length > 80) {
    return null;
  }

  if (typeof row.summary !== "string") {
    return null;
  }
  const summary = row.summary.trim();
  if (summary.length === 0 || summary.length > 280) {
    return null;
  }

  const ingredients = readLines(row.ingredients, 3, 12, 80);
  const steps = readLines(row.steps, 3, 10, 200);
  if (!ingredients || !steps) {
    return null;
  }

  let minutes: number | null = null;
  if (row.minutes !== null && row.minutes !== undefined) {
    if (typeof row.minutes !== "number" || !Number.isInteger(row.minutes)) {
      return null;
    }
    if (row.minutes < 1 || row.minutes > 180) {
      return null;
    }
    minutes = row.minutes;
  }

  let servings: string | null = null;
  if (row.servings !== null && row.servings !== undefined) {
    if (typeof row.servings !== "string") {
      return null;
    }
    const trimmed = row.servings.trim();
    if (trimmed.length === 0 || trimmed.length > 40) {
      return null;
    }
    servings = trimmed;
  }

  const rawTags = Array.isArray(row.ruleTags) ? row.ruleTags : row.rule_tags;
  const ruleTags: string[] = [];
  if (Array.isArray(rawTags)) {
    for (const tag of rawTags) {
      if (typeof tag !== "string") {
        continue;
      }
      const value = tag.trim().toLowerCase();
      if (value.length > 0 && !ruleTags.includes(value)) {
        ruleTags.push(value);
      }
    }
  }

  return {
    id: typeof row.id === "string" && row.id.length > 0 ? row.id : title,
    title,
    summary,
    ingredients,
    steps,
    minutes,
    servings,
    ruleTags,
  };
}
