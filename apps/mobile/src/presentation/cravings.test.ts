import {
  getCravingLabelValidationError,
  getSwapLabelValidationError,
  normalizeCravingLabel,
} from "./cravings";

test("trims and rejects blank, long, and duplicate craving names", () => {
  expect(normalizeCravingLabel(" Ice Cream ")).toBe("Ice Cream");
  expect(getCravingLabelValidationError("  ", [])).toBeTruthy();
  expect(getCravingLabelValidationError("x".repeat(61), [])).toBeTruthy();
  expect(getCravingLabelValidationError("ice cream", ["ice cream"])).toBeTruthy();
  expect(getCravingLabelValidationError("Chips", [])).toBeNull();
});

test("validates swap labels", () => {
  expect(getSwapLabelValidationError("  ")).toBeTruthy();
  expect(getSwapLabelValidationError("x".repeat(81))).toBeTruthy();
  expect(getSwapLabelValidationError(" Greek yogurt ")).toBeNull();
});
