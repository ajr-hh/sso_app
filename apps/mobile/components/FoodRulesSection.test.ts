import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { Text } from "react-native";

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
    ).toEqual({ selected: true });
  });

  test("validates allergies, normalizes additions, and removes them locally", async () => {
    const renderer = await render();

    await act(async () => button(renderer, "Add allergy").props.onPress());
    expect(JSON.stringify(renderer.toJSON())).toContain("Enter an allergy.");

    await act(async () =>
      renderer.root
        .findByProps({ accessibilityLabel: "Allergy" })
        .props.onChangeText("  PEANUTS  "),
    );
    await act(async () => button(renderer, "Add allergy").props.onPress());
    expect(JSON.stringify(renderer.toJSON())).toContain("peanuts");

    await act(async () =>
      renderer.root
        .findByProps({ accessibilityLabel: "Remove allergy peanuts" })
        .props.onPress(),
    );
    expect(
      renderer.root.findAllByProps({
        accessibilityLabel: "Remove allergy peanuts",
      }),
    ).toHaveLength(0);
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
});
