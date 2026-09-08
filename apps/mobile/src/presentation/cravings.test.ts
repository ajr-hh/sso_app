import {
  getCravingLabelValidationError,
  getCravingSetupProgress,
  getSwapLabelValidationError,
  getUnusedCravingSuggestions,
  MIN_USUAL_CRAVINGS,
  normalizeCravingLabel,
} from "./cravings";

test("trims and rejects blank, long, and duplicate craving names", () => {
  expect(normalizeCravingLabel(" Ice Cream ")).toBe("Ice Cream");
  expect(getCravingLabelValidationError("  ", [])).toBeTruthy();
  expect(getCravingLabelValidationError("x".repeat(61), [])).toBeTruthy();
  expect(getCravingLabelValidationError("ice cream", ["ice cream"])).toBeTruthy();
  expect(getCravingLabelValidationError("Chips", [])).toBeNull();
});

test("offers unused craving ideas until the top 3 are set", () => {
  expect(MIN_USUAL_CRAVINGS).toBe(3);
  expect(getUnusedCravingSuggestions([])).toContain("Pizza");
  expect(getUnusedCravingSuggestions([" pizza ", "Ice cream"])).not.toContain(
    "Pizza",
  );
  expect(getCravingSetupProgress(0)).toEqual({
    added: 0,
    remaining: 3,
    complete: false,
  });
  expect(getCravingSetupProgress(2)).toEqual({
    added: 2,
    remaining: 1,
    complete: false,
  });
  expect(getCravingSetupProgress(3).complete).toBe(true);
});

test("validates swap labels", () => {
  expect(getSwapLabelValidationError("  ")).toBeTruthy();
  expect(getSwapLabelValidationError("x".repeat(81))).toBeTruthy();
  expect(getSwapLabelValidationError(" Greek yogurt ")).toBeNull();
});
