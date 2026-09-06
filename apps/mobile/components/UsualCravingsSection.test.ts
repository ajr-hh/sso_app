import React from "react";
import {
  act,
  create,
  type ReactTestInstance,
  type ReactTestRenderer,
} from "react-test-renderer";
import { Alert, Modal, Text } from "react-native";

import type { Craving } from "../src/data/cravings";
import {
  AddCravingFlyout,
  UsualCravingsSection,
  type UsualCravingsSectionProps,
} from "./UsualCravingsSection";

const craving: Craving = { id: "craving-1", label: "Pizza", sort_order: 0 };

function props(
  overrides: Partial<UsualCravingsSectionProps> = {},
): UsualCravingsSectionProps {
  return {
    cravings: [craving],
    loading: false,
    loadError: null,
    onCreate: jest.fn(async () => craving),
    onRemove: jest.fn(async () => undefined),
    onRetry: jest.fn(),
    status: null,
    ...overrides,
  };
}

async function render(
  overrides: Partial<UsualCravingsSectionProps> = {},
): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(React.createElement(UsualCravingsSection, props(overrides)));
  });
  return renderer;
}

function button(renderer: ReactTestRenderer, label: string): ReactTestInstance {
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

describe("UsualCravingsSection", () => {
  test("renders cravings and confirms removal by naming the craving", async () => {
    const alert = jest.spyOn(Alert, "alert").mockImplementation();
    const onRemove = jest.fn(async () => undefined);
    const renderer = await render({ onRemove });

    act(() =>
      renderer.root
        .findByProps({ accessibilityLabel: "Remove Pizza" })
        .props.onPress(),
    );
    expect(alert).toHaveBeenCalledWith(
      "Remove craving?",
      "Remove Pizza from your usual cravings?",
      expect.any(Array),
    );
    await act(async () => alert.mock.calls[0][2]?.[1].onPress?.());
    expect(onRemove).toHaveBeenCalledWith(craving);
    alert.mockRestore();
  });

  test("add flyout validates duplicate names and creates normalized labels", async () => {
    const onCreate = jest.fn(async () => craving);
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = create(
        React.createElement(AddCravingFlyout, {
          existingLabels: ["Pizza"],
          onClose: jest.fn(),
          onCreate,
          visible: true,
        }),
      );
    });

    await act(async () =>
      renderer.root
        .findByProps({ accessibilityLabel: "Craving name" })
        .props.onChangeText(" pizza "),
    );
    await act(async () => button(renderer, "Add craving").props.onPress());

    expect(onCreate).not.toHaveBeenCalled();
    expect(JSON.stringify(renderer.toJSON())).toContain(
      "That craving is already listed.",
    );

    await act(async () =>
      renderer.root
        .findByProps({ accessibilityLabel: "Craving name" })
        .props.onChangeText("  Ice cream  "),
    );
    await act(async () => button(renderer, "Add craving").props.onPress());
    expect(onCreate).toHaveBeenCalledWith("Ice cream");
  });

  test("flyout supports focus, keyboard avoidance, cancel, and accessibility escape", async () => {
    const onClose = jest.fn();
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = create(
        React.createElement(AddCravingFlyout, {
          existingLabels: [],
          onClose,
          onCreate: jest.fn(async () => craving),
          visible: true,
        }),
      );
    });

    expect(renderer.root.findByType(Modal).props.onShow).toEqual(
      expect.any(Function),
    );
    expect(
      renderer.root.findByProps({ accessibilityViewIsModal: true }),
    ).toBeDefined();
    act(() => button(renderer, "Cancel").props.onPress());
    expect(onClose).toHaveBeenCalled();
  });
});
