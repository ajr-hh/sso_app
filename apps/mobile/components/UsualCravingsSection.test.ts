import React from "react";
import {
  act,
  create,
  type ReactTestInstance,
  type ReactTestRenderer,
} from "react-test-renderer";
import {
  AccessibilityInfo,
  Alert,
  findNodeHandle,
  KeyboardAvoidingView,
  Modal,
  Text,
} from "react-native";

jest.mock("react-native", () => {
  const actual = jest.requireActual("react-native");
  const ReactModule = jest.requireActual("react") as typeof React;
  const focus = jest.fn();
  const TextInput = ReactModule.forwardRef(
    (
      props: Record<string, unknown>,
      ref: React.ForwardedRef<{ focus: () => void }>,
    ) => {
      ReactModule.useImperativeHandle(ref, () => ({ focus }));
      return ReactModule.createElement("TextInput", props);
    },
  );
  const mocked = Object.create(actual);
  Object.defineProperties(mocked, {
    __esModule: { value: true },
    __focusInput: { value: focus },
    findNodeHandle: { value: jest.fn(() => 42) },
    TextInput: { value: TextInput },
  });
  return mocked;
});

import type { Craving } from "../src/data/cravings";
import {
  AddCravingFlyout,
  UsualCravingsSection,
  type UsualCravingsSectionProps,
} from "./UsualCravingsSection";

const craving: Craving = { id: "craving-1", label: "Pizza", sort_order: 0 };
const focusInput = (
  jest.requireMock("react-native") as { __focusInput: jest.Mock }
).__focusInput;

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

  test("disables add semantics and interaction until the initial load completes", async () => {
    const controlledProps = props({ cravings: [], loading: true });
    const renderer = await render(controlledProps);
    const trigger = button(renderer, "Add a craving");

    expect(trigger.props.disabled).toBe(true);
    expect(trigger.props.accessibilityState).toEqual({
      busy: true,
      disabled: true,
    });
    act(() => trigger.props.onPress());
    expect(renderer.root.findByType(Modal).props.visible).toBe(false);

    await act(async () => {
      renderer.update(
        React.createElement(UsualCravingsSection, {
          ...controlledProps,
          loading: false,
        }),
      );
    });
    const enabledTrigger = button(renderer, "Add a craving");
    expect(enabledTrigger.props.disabled).toBe(false);
    act(() => enabledTrigger.props.onPress());
    expect(renderer.root.findByType(Modal).props.visible).toBe(true);

    const failedLoadProps = props({
      cravings: [],
      loadError: "We couldn’t load your usual cravings. Try again.",
      loading: false,
    });
    const failedRenderer = await render(failedLoadProps);
    expect(button(failedRenderer, "Add a craving").props.disabled).toBe(true);
    act(() => button(failedRenderer, "Add a craving").props.onPress());
    expect(failedRenderer.root.findByType(Modal).props.visible).toBe(false);
  });

  test("focuses input on show and restores once for cancel and native dismiss", async () => {
    const restore = jest
      .spyOn(AccessibilityInfo, "setAccessibilityFocus")
      .mockImplementation();
    const renderer = await render();
    focusInput.mockClear();
    act(() => button(renderer, "Add a craving").props.onPress());
    const modal = renderer.root.findByType(Modal);
    act(() => modal.props.onShow());
    expect(focusInput).toHaveBeenCalledTimes(1);
    expect(renderer.root.findByType(KeyboardAvoidingView).props.behavior).toBe(
      "padding",
    );
    expect(
      renderer.root.findByProps({ accessibilityViewIsModal: true }),
    ).toBeDefined();

    act(() => button(renderer, "Cancel").props.onPress());
    expect(findNodeHandle).toHaveBeenCalled();
    expect(restore).toHaveBeenCalledWith(42);
    act(() => modal.props.onDismiss());
    expect(restore).toHaveBeenCalledTimes(1);

    act(() => button(renderer, "Add a craving").props.onPress());
    const reopenedModal = renderer.root.findByType(Modal);
    act(() => reopenedModal.props.onRequestClose());
    expect(restore).toHaveBeenCalledTimes(2);
    act(() => reopenedModal.props.onDismiss());
    expect(restore).toHaveBeenCalledTimes(2);
    restore.mockRestore();
  });

  test("restores trigger focus on accessibility escape and successful save", async () => {
    const restore = jest
      .spyOn(AccessibilityInfo, "setAccessibilityFocus")
      .mockImplementation();
    const onCreate = jest.fn(async () => craving);
    const renderer = await render({ onCreate });

    act(() => button(renderer, "Add a craving").props.onPress());
    act(() =>
      renderer.root
        .findByProps({ accessibilityViewIsModal: true })
        .props.onAccessibilityEscape(),
    );
    expect(restore).toHaveBeenCalledTimes(1);

    act(() => button(renderer, "Add a craving").props.onPress());
    await act(async () =>
      renderer.root
        .findByProps({ accessibilityLabel: "Craving name" })
        .props.onChangeText("Ice cream"),
    );
    await act(async () => button(renderer, "Add craving").props.onPress());
    expect(onCreate).toHaveBeenCalledWith("Ice cream");
    expect(restore).toHaveBeenCalledTimes(2);
    restore.mockRestore();
  });

  test("preserves input and re-enables controls after a failed save", async () => {
    const onCreate = jest.fn(async () => {
      throw new Error("Could not add craving.");
    });
    const renderer = await render({ onCreate });
    act(() => button(renderer, "Add a craving").props.onPress());
    await act(async () =>
      renderer.root
        .findByProps({ accessibilityLabel: "Craving name" })
        .props.onChangeText("Ice cream"),
    );
    await act(async () => button(renderer, "Add craving").props.onPress());

    expect(JSON.stringify(renderer.toJSON())).toContain("Could not add craving.");
    expect(
      renderer.root.findByProps({ accessibilityLabel: "Craving name" }).props
        .value,
    ).toBe("Ice cream");
    expect(
      renderer.root.findByProps({ accessibilityLabel: "Craving name" }).props
        .editable,
    ).toBe(true);
    expect(button(renderer, "Add craving").props.disabled).toBe(false);
  });
});
