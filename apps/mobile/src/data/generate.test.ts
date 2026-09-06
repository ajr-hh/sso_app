import { getSupabase } from "../lib/supabase";
import type { FoodRules } from "../presentation/foodRules";
import {
  buildFoodSwapsGenerateRequest,
  describeSosGenerateRequest,
  generateFoodSwaps,
  parseFoodSwapsOutput,
} from "./generate";

jest.mock("../lib/supabase", () => ({
  getSupabase: jest.fn(),
}));

const mockedGetSupabase = jest.mocked(getSupabase);

const PRIVATE_CRAVING = "Late night deep dish";
const PRIVATE_ALLERGEN = "shellfish";

const rules: FoodRules = {
  foodRulesSet: true,
  dietFlags: ["vegan", "nut_free"],
  allergens: [PRIVATE_ALLERGEN],
};

const swaps = [
  { label: "Frozen banana, blended", ruleTags: [] },
  { label: "Cucumber rounds", ruleTags: [] },
  { label: "Nutritional yeast on vegetables", ruleTags: [] },
  { label: "Baked apple with cinnamon", ruleTags: [] },
];

function mockInvoke(result: unknown) {
  const invoke = jest.fn().mockResolvedValue(result);
  mockedGetSupabase.mockReturnValue({ functions: { invoke } } as never);
  return invoke;
}

function mockRejectedInvoke(error: unknown) {
  const invoke = jest.fn().mockRejectedValue(error);
  mockedGetSupabase.mockReturnValue({ functions: { invoke } } as never);
  return invoke;
}

function succeeded(output: unknown) {
  return { data: { job_id: "job-1", status: "succeeded", output }, error: null };
}

async function captureError(promise: Promise<unknown>): Promise<Error> {
  const caught = await promise.then(
    () => null,
    (error: unknown) => error,
  );
  expect(caught).toBeInstanceOf(Error);
  return caught as Error;
}

describe("sos-generate request building", () => {
  test("refuses to build a request before food rules are saved", () => {
    expect(
      buildFoodSwapsGenerateRequest(
        { foodRulesSet: false, dietFlags: [], allergens: [] },
        "Pizza",
      ),
    ).toBeNull();
  });

  test("normalizes the craving and food rules onto the request", () => {
    expect(
      buildFoodSwapsGenerateRequest(
        {
          foodRulesSet: true,
          dietFlags: ["vegan", "vegan", "sugar_free" as never],
          allergens: ["  Shellfish ", "shellfish", ""],
        },
        "  Late night deep dish  ",
      ),
    ).toEqual({
      kind: "food_swaps",
      input: {
        craving_label: "Late night deep dish",
        diet_flags: ["vegan"],
        allergens: ["shellfish"],
      },
    });
  });

  test("keeps craving text and allergens off the loggable audit shape", () => {
    const request = buildFoodSwapsGenerateRequest(rules, PRIVATE_CRAVING);
    expect(request).not.toBeNull();

    const audit = describeSosGenerateRequest(
      request as NonNullable<typeof request>,
    );
    expect(audit).toEqual({
      kind: "food_swaps",
      diet_flag_count: 2,
      allergen_count: 1,
    });
    expect(JSON.stringify(audit)).not.toContain(PRIVATE_CRAVING);
    expect(JSON.stringify(audit)).not.toContain(PRIVATE_ALLERGEN);
  });
});

describe("sos-generate output parsing", () => {
  test("maps exactly four labelled swaps with normalized rule tags", () => {
    expect(
      parseFoodSwapsOutput({
        swaps: [
          {
            label: "  Greek yogurt with berries ",
            ruleTags: [" Dairy ", "dairy"],
          },
          { label: "Cucumber rounds", ruleTags: [] },
          { label: "Cloud bread", ruleTags: ["eggs", ""] },
          { label: "Baked apple with cinnamon", ruleTags: [] },
        ],
      }),
    ).toEqual([
      { label: "Greek yogurt with berries", ruleTags: ["dairy"] },
      { label: "Cucumber rounds", ruleTags: [] },
      { label: "Cloud bread", ruleTags: ["eggs"] },
      { label: "Baked apple with cinnamon", ruleTags: [] },
    ]);
  });

  test("rejects output that is not exactly four swaps", () => {
    expect(() => parseFoodSwapsOutput({ swaps: swaps.slice(0, 3) })).toThrow(
      "Couldn't get swap ideas right now. Try again.",
    );
    expect(() => parseFoodSwapsOutput({ swaps: [...swaps, swaps[0]] })).toThrow(
      "Couldn't get swap ideas right now. Try again.",
    );
  });

  test("rejects blank, overlong, duplicate, or untagged swaps", () => {
    const invalidPayloads = [
      { swaps: [{ label: "   ", ruleTags: [] }, ...swaps.slice(1)] },
      { swaps: [{ label: "a".repeat(81), ruleTags: [] }, ...swaps.slice(1)] },
      { swaps: [{ label: "Cucumber Rounds", ruleTags: [] }, ...swaps.slice(1)] },
      { swaps: [{ label: "Frozen banana, blended" }, ...swaps.slice(1)] },
      {
        swaps: [
          { label: "Frozen banana, blended", ruleTags: [1] },
          ...swaps.slice(1),
        ],
      },
      { swaps: ["Frozen banana, blended", ...swaps.slice(1)] },
      { swaps: null },
      null,
    ];

    for (const payload of invalidPayloads) {
      expect(() => parseFoodSwapsOutput(payload)).toThrow(
        "Couldn't get swap ideas right now. Try again.",
      );
    }
  });
});

describe("generateFoodSwaps", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("refuses generate when food rules are unset", async () => {
    const invoke = mockInvoke(succeeded({ swaps }));

    await expect(
      generateFoodSwaps({
        cravingLabel: "Pizza",
        rules: { foodRulesSet: false, dietFlags: [], allergens: [] },
      }),
    ).rejects.toThrow("Set your food rules before asking for swap ideas.");
    expect(invoke).not.toHaveBeenCalled();
  });

  test("refuses generate without a craving", async () => {
    const invoke = mockInvoke(succeeded({ swaps }));

    await expect(
      generateFoodSwaps({ cravingLabel: "   ", rules }),
    ).rejects.toThrow("Pick a craving before asking for swap ideas.");
    expect(invoke).not.toHaveBeenCalled();
  });

  test("maps four swaps from a succeeded job", async () => {
    mockInvoke(succeeded({ swaps }));

    await expect(
      generateFoodSwaps({ cravingLabel: PRIVATE_CRAVING, rules }),
    ).resolves.toEqual(swaps);
  });

  test("sends the craving and food rules in the invoke body so the function can filter", async () => {
    const invoke = mockInvoke(succeeded({ swaps }));

    await generateFoodSwaps({ cravingLabel: PRIVATE_CRAVING, rules });

    expect(invoke).toHaveBeenCalledWith("sos-generate", {
      body: {
        kind: "food_swaps",
        input: {
          craving_label: PRIVATE_CRAVING,
          diet_flags: ["vegan", "nut_free"],
          allergens: [PRIVATE_ALLERGEN],
        },
      },
    });
  });

  test("rejects a job that did not succeed", async () => {
    mockInvoke({
      data: { job_id: "job-1", status: "failed", output: null },
      error: null,
    });

    await expect(
      generateFoodSwaps({ cravingLabel: PRIVATE_CRAVING, rules }),
    ).rejects.toThrow("Couldn't get swap ideas right now. Try again.");
  });

  test("rejects a job envelope without a job id", async () => {
    mockInvoke({
      data: { status: "succeeded", output: { swaps } },
      error: null,
    });

    await expect(
      generateFoodSwaps({ cravingLabel: PRIVATE_CRAVING, rules }),
    ).rejects.toThrow("Couldn't get swap ideas right now. Try again.");
  });

  test("sanitizes returned invoke errors that mention private inputs", async () => {
    mockInvoke({
      data: null,
      error: new Error(
        `no swaps for ${PRIVATE_CRAVING} avoiding ${PRIVATE_ALLERGEN}`,
      ),
    });

    const error = await captureError(
      generateFoodSwaps({ cravingLabel: PRIVATE_CRAVING, rules }),
    );
    expect(error.message).toBe("Couldn't get swap ideas right now. Try again.");
    expect(error.message).not.toContain(PRIVATE_CRAVING);
    expect(error.message).not.toContain(PRIVATE_ALLERGEN);
  });

  test("sanitizes thrown invoke failures that mention private inputs", async () => {
    mockRejectedInvoke(
      new Error(`${PRIVATE_CRAVING} and ${PRIVATE_ALLERGEN} lookup exploded`),
    );

    const error = await captureError(
      generateFoodSwaps({ cravingLabel: PRIVATE_CRAVING, rules }),
    );
    expect(error.message).toBe("Couldn't get swap ideas right now. Try again.");
    expect(error.message).not.toContain(PRIVATE_CRAVING);
    expect(error.message).not.toContain(PRIVATE_ALLERGEN);
  });

  test("explains offline transport failures without echoing the request", async () => {
    mockRejectedInvoke(
      new TypeError(`Network request failed: ${PRIVATE_CRAVING}`),
    );

    const error = await captureError(
      generateFoodSwaps({ cravingLabel: PRIVATE_CRAVING, rules }),
    );
    expect(error.message).toBe(
      "Couldn't reach the server. Check your connection.",
    );
    expect(error.message).not.toContain(PRIVATE_CRAVING);
  });

  test("explains a rate-limited gateway without echoing the request", async () => {
    mockInvoke({
      data: null,
      error: Object.assign(
        new Error("Edge Function returned a non-2xx status code"),
        { context: { status: 429 } },
      ),
    });

    const error = await captureError(
      generateFoodSwaps({ cravingLabel: PRIVATE_CRAVING, rules }),
    );
    expect(error.message).toBe(
      "That's a lot of swap ideas for one hour. Try again later.",
    );
    expect(error.message).not.toContain(PRIVATE_CRAVING);
  });
});
