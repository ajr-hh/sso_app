import type { Profile } from "../types";
import {
  applySilentProfileRefresh,
  isMotivationOption,
  MOTIVATION_OPTIONS,
  MOTIVATION_PROMPT,
  PROFILE_LOG_OUT,
} from "./profile";

const current: Profile = {
  age: 40,
  allergens: [],
  coach_style: "elena",
  coach_style_set: true,
  diet_flags: [],
  display_name: "Alex",
  email: "alex@example.test",
  food_rules_set: false,
  id: "user-1",
  motivators: "Better Choices",
  phone: null,
  rail_order: [],
  why_matters: "Health",
};

describe("profile motivation options", () => {
  test("labels the profile log out control", () => {
    expect(PROFILE_LOG_OUT).toBe("Log out");
  });

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

  test("focus refresh keeps unsaved coach and name, and picks up food rules", () => {
    expect(
      applySilentProfileRefresh(
        current,
        {
          ...current,
          coach_style: "marcus",
          coach_style_set: false,
          display_name: "Server Alex",
          food_rules_set: true,
          diet_flags: ["vegetarian"],
          allergens: ["shellfish"],
        },
        new Set(["coach_style", "coach_style_set", "display_name"]),
      ),
    ).toEqual({
      ...current,
      food_rules_set: true,
      diet_flags: ["vegetarian"],
      allergens: ["shellfish"],
    });
  });

  test("focus refresh adopts a coach saved on another screen when Profile was not edited", () => {
    expect(
      applySilentProfileRefresh(
        { ...current, coach_style: "marcus", coach_style_set: false },
        { ...current, coach_style: "sam", coach_style_set: true },
        new Set(),
      ),
    ).toEqual({ ...current, coach_style: "sam", coach_style_set: true });
  });
});
