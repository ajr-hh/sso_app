import {
  isMotivationOption,
  MOTIVATION_OPTIONS,
  MOTIVATION_PROMPT,
} from "./profile";

describe("profile motivation options", () => {
  test("uses the requested profile prompt", () => {
    expect(MOTIVATION_PROMPT).toBe("How do you want to be motivated");
  });

  test("matches the SOS reinforcement labels and order", () => {
    expect(MOTIVATION_OPTIONS).toEqual([
      "Better Choices",
      "Coach Messages",
      "Hard Truths",
      "Remember Your Why",
      "Small Wins",
      "Talk to Someone",
      "The Numbers",
    ]);
  });

  test("rejects a legacy profile value without crashing", () => {
    expect(isMotivationOption("Family")).toBe(false);
    expect(isMotivationOption("Better Choices")).toBe(true);
  });
});
