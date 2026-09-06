import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { AccessibilityInfo, Platform, Text } from "react-native";

import type { DietFlag } from "../src/presentation/foodRules";
import {
  FoodRulesSection,
  type FoodRulesSectionProps,
} from "./FoodRulesSection";

function props(
  overrides: Partial<FoodRulesSectionProps> = {},
): FoodRulesSectionProps {
  return {
    allergens: [],
    dietFlags: [],
    onSave: jest.fn(async () => undefined),
    ...overrides,
  };
}

async function render(
  overrides: Partial<FoodRulesSectionProps> = {},
): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(React.createElement(FoodRulesSection, props(overrides)));
  });
  return renderer;
}

function button(renderer: ReactTestRenderer, label: string) {
  const match = renderer.root
    .findAllByProps({ accessibilityRole: "button" })
    .find((node) =>
      node
        .findAllByType(Text)
        .some(({ props: textProps }) => textProps.children === label),
    );
  if (!match) throw new Error(`Missing button "${label}".`);
  return match;
}

describe("FoodRulesSection", () => {
  test("renders exact supporting copy and all diet choices with None derived selected", async () => {
    const renderer = await render();
    const output = JSON.stringify(renderer.toJSON());

    expect(output).toContain("We’ll never suggest a swap that breaks these.");
    for (const label of [
      "None",
      "Vegetarian",
      "Vegan",
      "Nut-free",
      "Dairy-free",
      "Gluten-free",
    ]) {
      expect(output).toContain(label);
    }
    expect(
      renderer.root.findByProps({ accessibilityLabel: "None" }).props
        .accessibilityState,
    ).toEqual({ checked: true });
    expect(
      renderer.root.findByProps({ accessibilityLabel: "None" }).props
        .accessibilityRole,
    ).toBe("checkbox");
    expect(
      renderer.root.findAllByProps({ accessibilityRole: "radio" }),
    ).toHaveLength(0);
    expect(
      renderer.root.findAllByProps({ accessibilityRole: "radiogroup" }),
    ).toHaveLength(0);
  });

  test("adding and removing an allergy clears the saved status", async () => {
    const renderer = await render();

    await act(async () =>
      renderer.root
        .findByProps({ accessibilityLabel: "Allergy" })
        .props.onChangeText("  PEANUTS  "),
    );
    await act(async () => button(renderer, "Add allergy").props.onPress());
    expect(JSON.stringify(renderer.toJSON())).toContain("peanuts");
    await act(async () => button(renderer, "Save food rules").props.onPress());
    expect(JSON.stringify(renderer.toJSON())).toContain("Food rules saved.");

    await act(async () =>
      renderer.root
        .findByProps({ accessibilityLabel: "Allergy" })
        .props.onChangeText("  DAIRY  "),
    );
    expect(JSON.stringify(renderer.toJSON())).not.toContain("Food rules saved.");
    await act(async () => button(renderer, "Add allergy").props.onPress());
    expect(JSON.stringify(renderer.toJSON())).not.toContain("Food rules saved.");

    await act(async () => button(renderer, "Save food rules").props.onPress());
    expect(JSON.stringify(renderer.toJSON())).toContain("Food rules saved.");

    await act(async () =>
      renderer.root
        .findByProps({ accessibilityLabel: "Remove allergy peanuts" })
        .props.onPress(),
    );
    expect(JSON.stringify(renderer.toJSON())).not.toContain("Food rules saved.");
    expect(
      renderer.root.findAllByProps({
        accessibilityLabel: "Remove allergy peanuts",
      }),
    ).toHaveLength(0);
  });

  test("validates an empty allergy", async () => {
    const renderer = await render();
    await act(async () => button(renderer, "Add allergy").props.onPress());
    expect(JSON.stringify(renderer.toJSON())).toContain("Enter an allergy.");
  });

  test("saves exactly food rule fields and derives None by clearing other diets", async () => {
    const onSave = jest.fn(async () => undefined);
    const renderer = await render({
      allergens: ["shellfish"],
      dietFlags: ["vegan"],
      onSave,
    });

    await act(async () =>
      renderer.root.findByProps({ accessibilityLabel: "None" }).props.onPress(),
    );
    await act(async () => button(renderer, "Save food rules").props.onPress());

    expect(onSave).toHaveBeenCalledWith({
      allergens: ["shellfish"],
      diet_flags: [] as DietFlag[],
      food_rules_set: true,
    });
  });

  test("announces save success on iOS without duplicating Android live regions", async () => {
    const announce = jest
      .spyOn(AccessibilityInfo, "announceForAccessibility")
      .mockImplementation();
    const originalPlatform = Platform.OS;

    Object.defineProperty(Platform, "OS", { configurable: true, value: "ios" });
    const iosRenderer = await render();
    await act(async () =>
      button(iosRenderer, "Save food rules").props.onPress(),
    );
    expect(announce).toHaveBeenCalledWith("Food rules saved.");
    expect(
      iosRenderer.root.findByProps({ children: "Food rules saved." }).props
        .accessibilityLiveRegion,
    ).toBeUndefined();

    announce.mockClear();
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: "android",
    });
    const androidRenderer = await render();
    await act(async () =>
      button(androidRenderer, "Save food rules").props.onPress(),
    );
    expect(announce).not.toHaveBeenCalled();
    expect(
      androidRenderer.root.findByProps({ children: "Food rules saved." }).props
        .accessibilityLiveRegion,
    ).toBe("polite");

    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: originalPlatform,
    });
    announce.mockRestore();
  });

  test("sanitizes rejected saves, preserves edits, and re-enables controls", async () => {
    const onSave = jest.fn(async () => {
      throw new Error("private shellfish value");
    });
    const renderer = await render({ onSave });

    await act(async () =>
      renderer.root
        .findByProps({ accessibilityLabel: "Vegetarian" })
        .props.onPress(),
    );
    await act(async () =>
      renderer.root
        .findByProps({ accessibilityLabel: "Allergy" })
        .props.onChangeText("shellfish"),
    );
    await act(async () => button(renderer, "Add allergy").props.onPress());
    await act(async () => button(renderer, "Save food rules").props.onPress());

    const output = JSON.stringify(renderer.toJSON());
    expect(output).toContain("We couldn’t save your food rules. Try again.");
    expect(output).not.toContain("private shellfish value");
    expect(output).toContain("shellfish");
    expect(
      renderer.root.findByProps({ accessibilityLabel: "Vegetarian" }).props
        .accessibilityState,
    ).toEqual({ checked: true });
    expect(button(renderer, "Save food rules").props.disabled).toBe(false);
    expect(
      renderer.root.findByProps({ accessibilityLabel: "Allergy" }).props
        .editable,
    ).toBe(true);
  });
});
