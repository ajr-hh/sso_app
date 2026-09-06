import type { CravingSwap } from "../data/cravingSwaps";
import {
  FOOD_SCREEN_COPY,
  getCatalogSeedLabels,
  getFavoriteAction,
  getFoodScreenMode,
  getSelectedCravingId,
  getSwapToggleLabel,
  shouldShowIngredientNote,
  toSwapRows,
} from "./foodScreen";
import type { FoodRules } from "./foodRules";
import { resolveSwapView, type SwapRow } from "./swaps";

const catalog: Record<string, string[]> = {
  "Ice cream": ["Frozen banana, blended", "Celery with almond butter"],
};
const tags: Record<string, string[]> = {
  "Frozen banana, blended": [],
  "Celery with almond butter": ["nuts"],
};
const openRules: FoodRules = {
  foodRulesSet: true,
  dietFlags: [],
  allergens: [],
};

function row(overrides: Partial<SwapRow> = {}): SwapRow {
  return {
    id: "swap-1",
    label: "Frozen banana, blended",
    source: "catalog",
    favorited: false,
    ruleTags: [],
    ...overrides,
  };
}

describe("getFoodScreenMode", () => {
  test("blocks personalization until food rules are set", () => {
    expect(getFoodScreenMode({ foodRulesSet: false, cravingCount: 2 })).toBe(
      "needs_rules",
    );
  });

  test("empty cravings after rules", () => {
    expect(getFoodScreenMode({ foodRulesSet: true, cravingCount: 0 })).toBe(
      "empty_cravings",
    );
  });

  test("ready once rules are set and a craving exists", () => {
    expect(getFoodScreenMode({ foodRulesSet: true, cravingCount: 1 })).toBe(
      "ready",
    );
  });
});

describe("getSelectedCravingId", () => {
  const cravings = [
    { id: "craving-1", label: "Ice cream", sort_order: 0 },
    { id: "craving-2", label: "Pizza", sort_order: 1 },
  ];

  test("selects the first active craving when nothing is selected", () => {
    expect(getSelectedCravingId(cravings, null)).toBe("craving-1");
  });

  test("keeps a still-active selection", () => {
    expect(getSelectedCravingId(cravings, "craving-2")).toBe("craving-2");
  });

  test("falls back to the first craving when the selection disappeared", () => {
    expect(getSelectedCravingId(cravings, "craving-9")).toBe("craving-1");
  });

  test("selects nothing when there are no cravings", () => {
    expect(getSelectedCravingId([], "craving-1")).toBeNull();
  });
});

describe("toSwapRows", () => {
  test("maps database rule_tags onto the resolver's ruleTags", () => {
    const saved: CravingSwap[] = [
      {
        id: "swap-1",
        craving_id: "craving-1",
        label: "Protein brownie bite",
        favorited: true,
        source: "ai",
        rule_tags: ["dairy", "eggs"],
      },
    ];

    expect(toSwapRows(saved)).toEqual([
      {
        id: "swap-1",
        label: "Protein brownie bite",
        source: "ai",
        favorited: true,
        ruleTags: ["dairy", "eggs"],
      },
    ]);
  });

  test("treats a missing tag array as no known conflicts", () => {
    const saved = [
      {
        id: "swap-1",
        craving_id: "craving-1",
        label: "Cucumber rounds",
        favorited: false,
        source: "custom",
        rule_tags: null,
      },
    ] as unknown as CravingSwap[];

    expect(toSwapRows(saved)[0].ruleTags).toEqual([]);
  });
});

describe("getCatalogSeedLabels", () => {
  test("seeds only the catalog labels that fit the member's rules", () => {
    expect(
      getCatalogSeedLabels({
        cravingLabel: "ice cream",
        catalog,
        tags,
        rules: { foodRulesSet: true, dietFlags: ["nut_free"], allergens: [] },
        saved: [],
      }),
    ).toEqual(["Frozen banana, blended"]);
  });

  test("seeds nothing once the craving already has saved rows", () => {
    expect(
      getCatalogSeedLabels({
        cravingLabel: "Ice cream",
        catalog,
        tags,
        rules: openRules,
        saved: [row()],
      }),
    ).toEqual([]);
  });

  test("seeds nothing for a craving outside the catalog", () => {
    expect(
      getCatalogSeedLabels({
        cravingLabel: "Ramen",
        catalog,
        tags,
        rules: openRules,
        saved: [],
      }),
    ).toEqual([]);
  });
});

describe("getFavoriteAction", () => {
  test("updates a persisted row to the opposite state", () => {
    expect(
      getFavoriteAction(row({ favorited: true }), new Set(["swap-1"])),
    ).toEqual({ kind: "update", id: "swap-1", favorited: false });
  });

  test("persists a catalog row that has no database row yet", () => {
    const synthetic = row({
      id: "Celery with almond butter",
      label: "Celery with almond butter",
      ruleTags: ["nuts"],
    });

    expect(getFavoriteAction(synthetic, new Set())).toEqual({
      kind: "persist",
      label: "Celery with almond butter",
      ruleTags: ["nuts"],
    });
  });
});

describe("getSwapToggleLabel", () => {
  test("names the save and unsave actions", () => {
    expect(getSwapToggleLabel("Cloud bread", false)).toBe("Save Cloud bread");
    expect(getSwapToggleLabel("Cloud bread", true)).toBe(
      "Remove save on Cloud bread",
    );
  });
});

describe("shouldShowIngredientNote", () => {
  test("warns whenever generated or custom swaps are on screen", () => {
    const view = resolveSwapView({
      cravingLabel: "Ramen",
      catalog,
      tags,
      rules: openRules,
      saved: [row({ id: "swap-9", label: "Broth and greens", source: "ai" })],
    });

    expect(shouldShowIngredientNote(view)).toBe(true);
  });

  test("warns while the member can still generate or add a custom swap", () => {
    expect(
      shouldShowIngredientNote({
        rows: [],
        showGenerate: true,
        allFilteredOut: false,
      }),
    ).toBe(true);
    expect(
      shouldShowIngredientNote({
        rows: [],
        showGenerate: false,
        allFilteredOut: true,
      }),
    ).toBe(true);
  });

  test("stays quiet for a pure catalog list", () => {
    const view = resolveSwapView({
      cravingLabel: "Ice cream",
      catalog,
      tags,
      rules: openRules,
      saved: [],
    });

    expect(view.rows).toHaveLength(2);
    expect(shouldShowIngredientNote(view)).toBe(false);
  });
});

describe("FOOD_SCREEN_COPY", () => {
  test("keeps the approved screen copy", () => {
    expect(FOOD_SCREEN_COPY.title).toBe("What are you craving?");
    expect(FOOD_SCREEN_COPY.subtitle).toBe(
      "Tap one, then pick a swap that still feels satisfying.",
    );
    expect(FOOD_SCREEN_COPY.generateButton).toBe("Get swap ideas");
    expect(FOOD_SCREEN_COPY.filteredOut).toBe(
      "Nothing here fits your food rules",
    );
    expect(FOOD_SCREEN_COPY.ingredientNote).toBe(
      "Check ingredients and labels for your allergies.",
    );
  });
});
