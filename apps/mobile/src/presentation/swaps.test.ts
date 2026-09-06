import { FOOD_SWAPS, FOOD_SWAP_TAGS } from "../content/food-swaps";
import { resolveSwapView } from "./swaps";

const rules = { foodRulesSet: true, dietFlags: [], allergens: [] };

test("shows catalog ice cream swaps before generate", () => {
  const view = resolveSwapView({
    cravingLabel: "ice cream",
    catalog: FOOD_SWAPS,
    tags: FOOD_SWAP_TAGS,
    rules,
    saved: [],
  });
  expect(view.showGenerate).toBe(false);
  expect(view.rows.map((row) => row.label)).toEqual(FOOD_SWAPS["Ice cream"]);
});

test("stars first and offers generate only when nothing remains", () => {
  const starred = resolveSwapView({
    cravingLabel: "Pizza",
    catalog: FOOD_SWAPS,
    tags: FOOD_SWAP_TAGS,
    rules,
    saved: [
      {
        id: "1",
        label: "Cauliflower crust slice",
        source: "ai",
        favorited: true,
        ruleTags: [],
      },
      {
        id: "2",
        label: "Veggie pizza",
        source: "ai",
        favorited: false,
        ruleTags: [],
      },
    ],
  });
  expect(starred.rows[0]?.favorited).toBe(true);
  expect(starred.showGenerate).toBe(false);

  const empty = resolveSwapView({
    cravingLabel: "Pizza",
    catalog: FOOD_SWAPS,
    tags: FOOD_SWAP_TAGS,
    rules,
    saved: [],
  });
  expect(empty.showGenerate).toBe(true);
  expect(empty.rows).toEqual([]);
});

test("allFilteredOut when catalog exists but every swap violates rules", () => {
  const view = resolveSwapView({
    cravingLabel: "Ice cream",
    catalog: FOOD_SWAPS,
    tags: {
      "Apple with a little peanut butter": ["nuts"],
      "Protein shake with a few berries": ["nuts"],
      "Celery with almond butter": ["nuts"],
      "Frozen banana, blended": ["nuts"],
    },
    rules: { foodRulesSet: true, dietFlags: ["nut_free"], allergens: [] },
    saved: [],
  });
  expect(view.allFilteredOut).toBe(true);
  expect(view.showGenerate).toBe(false);
});

test("filters saved rows using stored ruleTags", () => {
  const view = resolveSwapView({
    cravingLabel: "Pizza",
    catalog: FOOD_SWAPS,
    tags: FOOD_SWAP_TAGS,
    rules: { foodRulesSet: true, dietFlags: ["nut_free"], allergens: [] },
    saved: [
      {
        id: "1",
        label: "Almond crust slice",
        source: "ai",
        favorited: false,
        ruleTags: ["nuts"],
      },
      {
        id: "2",
        label: "Cauliflower crust slice",
        source: "ai",
        favorited: false,
        ruleTags: [],
      },
    ],
  });
  expect(view.rows.map((row) => row.label)).toEqual(["Cauliflower crust slice"]);
  expect(view.showGenerate).toBe(false);
});

test("returns empty view when food rules are not set", () => {
  const view = resolveSwapView({
    cravingLabel: "ice cream",
    catalog: FOOD_SWAPS,
    tags: FOOD_SWAP_TAGS,
    rules: { foodRulesSet: false, dietFlags: [], allergens: [] },
    saved: [
      {
        id: "1",
        label: "Custom swap",
        source: "ai",
        favorited: false,
        ruleTags: [],
      },
    ],
  });
  expect(view).toEqual({ rows: [], showGenerate: false, allFilteredOut: false });
});

test("appends safe saved-only rows after filtered catalog and drops tagged violations", () => {
  const view = resolveSwapView({
    cravingLabel: "Ice cream",
    catalog: FOOD_SWAPS,
    tags: FOOD_SWAP_TAGS,
    rules: { foodRulesSet: true, dietFlags: ["nut_free"], allergens: [] },
    saved: [
      {
        id: "violating",
        label: "Peanut butter cup",
        source: "ai",
        favorited: false,
        ruleTags: ["peanuts", "nuts"],
      },
      {
        id: "safe",
        label: "Nice cream blend",
        source: "ai",
        favorited: false,
        ruleTags: [],
      },
    ],
  });
  const labels = view.rows.map((row) => row.label);
  expect(labels).not.toContain("Apple with a little peanut butter");
  expect(labels).not.toContain("Celery with almond butter");
  expect(labels).not.toContain("Peanut butter cup");
  expect(labels).toEqual([
    "Protein shake with a few berries",
    "Frozen banana, blended",
    "Nice cream blend",
  ]);
});

test("saved row wins over catalog for id source favorited and ruleTags", () => {
  const view = resolveSwapView({
    cravingLabel: "Ice cream",
    catalog: FOOD_SWAPS,
    tags: FOOD_SWAP_TAGS,
    rules,
    saved: [
      {
        id: "saved-1",
        label: "Frozen banana, blended",
        source: "ai",
        favorited: true,
        ruleTags: ["custom"],
      },
    ],
  });
  const row = view.rows.find((item) => item.label === "Frozen banana, blended");
  expect(row).toEqual({
    id: "saved-1",
    label: "Frozen banana, blended",
    source: "ai",
    favorited: true,
    ruleTags: ["custom"],
  });
});
