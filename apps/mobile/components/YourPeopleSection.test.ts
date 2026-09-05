import React from "react";
import {
  act,
  create,
  type ReactTestInstance,
  type ReactTestRenderer,
} from "react-test-renderer";
import { Alert, Modal, StyleSheet, Text } from "react-native";

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
    TextInput: { value: TextInput },
  });
  return mocked;
});

import type { AccountabilityContact } from "../src/data/accountabilityContacts";
import {
  CONTACT_FIELD_LIMITS,
  RELATIONSHIP_OPTIONS,
} from "../src/presentation/accountabilityContacts";
import {
  YourPeopleSection,
  type YourPeopleSectionProps,
} from "./YourPeopleSection";

const focusInput = (
  jest.requireMock("react-native") as { __focusInput: jest.Mock }
).__focusInput;

const contact: AccountabilityContact = {
  id: "contact-1",
  name: "Jamie Rivera",
  phone: "(555) 867-5309",
  email: "jamie@example.com",
  relationship: "friend",
};

const secondContact: AccountabilityContact = {
  id: "contact-2",
  name: "Morgan Rivera",
  phone: "555-555-0100",
  email: "morgan@example.com",
  relationship: "colleague",
};

function createProps(
  overrides: Partial<YourPeopleSectionProps> = {},
): YourPeopleSectionProps {
  return {
    contacts: [contact],
    loading: false,
    loadError: null,
    modalVisible: false,
    status: null,
    onCreate: jest.fn(async () => contact),
    onModalVisibleChange: jest.fn(),
    onRemove: jest.fn(async () => undefined),
    onRetry: jest.fn(),
    ...overrides,
  };
}

async function render(
  overrides: Partial<YourPeopleSectionProps> = {},
): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(
      React.createElement(YourPeopleSection, createProps(overrides)),
    );
  });
  return renderer;
}

function pressableByText(
  renderer: ReactTestRenderer,
  text: string,
): ReactTestInstance {
  const pressable = renderer.root
    .findAllByProps({ accessibilityRole: "button" })
    .find((candidate) =>
      candidate
        .findAllByType(Text)
        .some((node) => node.props.children === text),
  );
  if (!pressable) {
    throw new Error(`No pressable found for "${text}".`);
  }
  return pressable;
}

async function changeText(
  renderer: ReactTestRenderer,
  label: string,
  value: string,
) {
  await act(async () => {
    renderer.root.findByProps({ accessibilityLabel: label }).props.onChangeText(
      value,
    );
  });
}

async function fillValidForm(renderer: ReactTestRenderer) {
  await changeText(renderer, "Name", "  Jamie Rivera  ");
  await changeText(renderer, "Phone number", " (555) 867-5309 ");
  await changeText(renderer, "Email", " JAMIE@EXAMPLE.COM ");
  await act(async () => {
    renderer.root
      .findAllByProps({ accessibilityRole: "radio" })
      .find((node) =>
        node.findAllByType(Text).some((text) => text.props.children === "Friend"),
      )
      ?.props.onPress();
  });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

describe("YourPeopleSection", () => {
  test("renders the controlled tile and contact", async () => {
    const renderer = await render();
    const renderedText = JSON.stringify(renderer.toJSON());

    expect(renderedText).toContain("Your people");
    expect(renderedText).toContain(
      "Accountability partners SOS can reach on your behalf.",
    );
    expect(renderedText).toContain("Add a loved one");
    expect(renderedText).toContain("Jamie Rivera");
    expect(renderedText).toContain("Friend");
  });

  test("renders the complete add flyout when visible", async () => {
    const renderer = await render({ modalVisible: true });
    const renderedText = JSON.stringify(renderer.toJSON());

    expect(renderedText).toContain("Name");
    expect(renderedText).toContain("Phone number");
    expect(renderedText).toContain("Email");
    for (const option of RELATIONSHIP_OPTIONS) {
      expect(renderedText).toContain(option.label);
    }
    expect(renderedText).toContain("Cancel");
    expect(renderedText).toContain("Save loved one");
  });

  test("marks every flyout field visibly and accessibly required", async () => {
    const renderer = await render({ modalVisible: true });
    const visibleLabels = renderer.root
      .findAllByType(Text)
      .map(({ props }) =>
        Array.isArray(props.children) ? props.children.join("") : props.children,
      );

    for (const label of ["Name", "Phone number", "Email", "Relationship"]) {
      expect(visibleLabels).toContain(`${label} *`);
      expect(
        renderer.root.findByProps({ accessibilityLabel: label }).props
          .accessibilityHint,
      ).toBe("Required");
    }
  });

  test("caps every text field at its stored column length", async () => {
    const renderer = await render({ modalVisible: true });

    for (const [label, maxLength] of [
      ["Name", CONTACT_FIELD_LIMITS.name],
      ["Phone number", CONTACT_FIELD_LIMITS.phone],
      ["Email", CONTACT_FIELD_LIMITS.email],
    ] as const) {
      expect(
        renderer.root.findByProps({ accessibilityLabel: label }).props.maxLength,
      ).toBe(maxLength);
    }
  });

  test("clears an abandoned form on cancel but keeps invalid input to correct", async () => {
    const onModalVisibleChange = jest.fn();
    const controlledProps = createProps({
      modalVisible: true,
      onModalVisibleChange,
    });
    const renderer = await render(controlledProps);
    await changeText(renderer, "Name", "Jamie Rivera");

    await act(async () => {
      pressableByText(renderer, "Save loved one").props.onPress();
    });
    expect(JSON.stringify(renderer.toJSON())).toContain(
      "Enter their phone number.",
    );
    expect(
      renderer.root.findByProps({ accessibilityLabel: "Name" }).props.value,
    ).toBe("Jamie Rivera");

    await act(async () => {
      pressableByText(renderer, "Cancel").props.onPress();
    });
    expect(onModalVisibleChange).toHaveBeenLastCalledWith(false);

    for (const modalVisible of [false, true]) {
      await act(async () => {
        renderer.update(
          React.createElement(YourPeopleSection, {
            ...controlledProps,
            modalVisible,
          }),
        );
      });
    }
    expect(
      renderer.root.findByProps({ accessibilityLabel: "Name" }).props.value,
    ).toBe("");
    expect(JSON.stringify(renderer.toJSON())).not.toContain(
      "Enter their phone number.",
    );
  });

  test("clears the removal error after a successful add and on a fresh add flow", async () => {
    const alert = jest.spyOn(Alert, "alert").mockImplementation();
    const onRemove = jest.fn(async () => {
      throw new Error("Removal failed.");
    });
    const renderer = await render({ modalVisible: true, onRemove });
    const failRemoval = async () => {
      act(() => {
        renderer.root
          .findByProps({ accessibilityLabel: `Remove ${contact.name}` })
          .props.onPress();
      });
      await act(async () => {
        alert.mock.calls.at(-1)?.[2]?.[1].onPress?.();
      });
      expect(JSON.stringify(renderer.toJSON())).toContain("Removal failed.");
    };

    await failRemoval();
    await fillValidForm(renderer);
    await act(async () => {
      pressableByText(renderer, "Save loved one").props.onPress();
    });
    expect(JSON.stringify(renderer.toJSON())).not.toContain("Removal failed.");

    await failRemoval();
    act(() => {
      renderer.root
        .findByProps({
          accessibilityLabel: "Add a loved one to Your people",
        })
        .props.onPress();
    });
    expect(JSON.stringify(renderer.toJSON())).not.toContain("Removal failed.");
    alert.mockRestore();
  });

  test("validates before create and exposes the error as an alert", async () => {
    const onCreate = jest.fn(async () => contact);
    const renderer = await render({ modalVisible: true, onCreate });

    await act(async () => {
      pressableByText(renderer, "Save loved one").props.onPress();
    });

    expect(onCreate).not.toHaveBeenCalled();
    expect(JSON.stringify(renderer.toJSON())).toContain("Enter their name.");
  });

  test("normalizes successful input, clears it, and requests close", async () => {
    const onCreate = jest.fn(async () => contact);
    const onModalVisibleChange = jest.fn();
    const renderer = await render({
      modalVisible: true,
      onCreate,
      onModalVisibleChange,
    });
    await fillValidForm(renderer);

    await act(async () => {
      pressableByText(renderer, "Save loved one").props.onPress();
    });

    expect(onCreate).toHaveBeenCalledWith({
      name: "Jamie Rivera",
      phone: "(555) 867-5309",
      email: "jamie@example.com",
      relationship: "friend",
    });
    expect(onModalVisibleChange).toHaveBeenCalledWith(false);
    expect(
      renderer.root.findByProps({ accessibilityLabel: "Name" }).props.value,
    ).toBe("");
  });

  test("preserves entered values and reports create failures", async () => {
    const onCreate = jest.fn(async () => {
      throw new Error("Create failed.");
    });
    const onModalVisibleChange = jest.fn();
    const renderer = await render({
      modalVisible: true,
      onCreate,
      onModalVisibleChange,
    });
    await fillValidForm(renderer);

    await act(async () => {
      pressableByText(renderer, "Save loved one").props.onPress();
    });

    expect(onModalVisibleChange).not.toHaveBeenCalledWith(false);
    expect(
      renderer.root.findByProps({ accessibilityLabel: "Name" }).props.value,
    ).toBe("  Jamie Rivera  ");
    expect(JSON.stringify(renderer.toJSON())).toContain("Create failed.");
  });

  test("prevents duplicate saves and dismissal while saving", async () => {
    const pending = deferred<AccountabilityContact>();
    const onCreate = jest.fn(() => pending.promise);
    const onModalVisibleChange = jest.fn();
    const renderer = await render({
      modalVisible: true,
      onCreate,
      onModalVisibleChange,
    });
    await fillValidForm(renderer);

    act(() => {
      const save = pressableByText(renderer, "Save loved one");
      save.props.onPress();
      save.props.onPress();
    });

    expect(onCreate).toHaveBeenCalledTimes(1);
    const saving = pressableByText(renderer, "Saving…");
    expect(saving.props.disabled).toBe(true);
    expect(saving.props.accessibilityState).toMatchObject({ busy: true });
    expect(pressableByText(renderer, "Cancel").props.disabled).toBe(true);
    expect(
      renderer.root.findByProps({
        accessibilityLabel: "Close add loved one form",
      }).props.disabled,
    ).toBe(true);

    act(() => {
      renderer.root.findByType(Modal).props.onRequestClose();
      renderer.root
        .findByProps({ accessibilityViewIsModal: true })
        .props.onAccessibilityEscape();
    });
    expect(onModalVisibleChange).not.toHaveBeenCalled();

    await act(async () => {
      pending.resolve(contact);
      await pending.promise;
    });
    expect(onModalVisibleChange).toHaveBeenCalledTimes(1);
  });

  test("opens, retries, wires initial focus, and exposes accessible target states", async () => {
    const onModalVisibleChange = jest.fn();
    const onRetry = jest.fn();
    const controlledProps = createProps({
      loadError: "Could not load.",
      modalVisible: false,
      onModalVisibleChange,
      onRetry,
    });
    const renderer = await render(controlledProps);

    act(() =>
      renderer.root
        .findByProps({
          accessibilityLabel: "Add a loved one to Your people",
        })
        .props.onPress(),
    );
    expect(onModalVisibleChange).toHaveBeenCalledWith(true);

    await act(async () => {
      renderer.update(
        React.createElement(YourPeopleSection, {
          ...controlledProps,
          modalVisible: true,
        }),
      );
    });

    const modal = renderer.root.findByType(Modal);
    expect(modal.props.onShow).toEqual(expect.any(Function));
    focusInput.mockClear();
    act(() => modal.props.onShow());
    expect(focusInput).toHaveBeenCalledTimes(1);
    expect(
      renderer.root.findByProps({ accessibilityLabel: "Name" }),
    ).toBeDefined();

    act(() => pressableByText(renderer, "Try again").props.onPress());
    expect(onRetry).toHaveBeenCalled();

    const add = renderer.root.findByProps({
      accessibilityLabel: "Add a loved one to Your people",
    });
    expect(StyleSheet.flatten(add.props.style).minHeight).toBeGreaterThanOrEqual(
      48,
    );
    for (const action of ["Try again", "Cancel", "Save loved one"]) {
      expect(
        StyleSheet.flatten(pressableByText(renderer, action).props.style)
          .minHeight,
      ).toBeGreaterThanOrEqual(48);
    }
    expect(
      StyleSheet.flatten(
        renderer.root.findByProps({
          accessibilityLabel: `Remove ${contact.name}`,
        }).props.style,
      ).minHeight,
    ).toBeGreaterThanOrEqual(48);
    const spouseRadio = renderer.root
      .findAllByProps({ accessibilityRole: "radio" })
      .find(
        (node) =>
          typeof node.props.onPress === "function" &&
          node.props.accessibilityState !== undefined,
      );
    expect(spouseRadio?.props.accessibilityState).toEqual({ selected: false });
    expect(
      StyleSheet.flatten(spouseRadio?.props.style).minHeight,
    ).toBeGreaterThanOrEqual(48);
  });

  test("keeps concurrent removals busy independently and reports failures", async () => {
    const first = deferred<void>();
    const second = deferred<void>();
    const onRemove = jest.fn((selected: AccountabilityContact) =>
      selected.id === contact.id ? first.promise : second.promise,
    );
    const alert = jest.spyOn(Alert, "alert").mockImplementation();
    const renderer = await render({
      contacts: [contact, secondContact],
      onRemove,
    });

    act(() => {
      renderer.root
        .findByProps({ accessibilityLabel: `Remove ${contact.name}` })
        .props.onPress();
    });
    expect(alert).toHaveBeenLastCalledWith(
      "Remove loved one?",
      `Remove ${contact.name} from Your people?`,
      expect.any(Array),
    );
    act(() => alert.mock.calls.at(-1)?.[2]?.[1].onPress?.());

    act(() => {
      renderer.root
        .findByProps({ accessibilityLabel: `Remove ${secondContact.name}` })
        .props.onPress();
    });
    act(() => alert.mock.calls.at(-1)?.[2]?.[1].onPress?.());

    expect(onRemove).toHaveBeenCalledTimes(2);
    expect(
      renderer.root.findByProps({
        accessibilityLabel: `Remove ${contact.name}`,
      }).props.disabled,
    ).toBe(true);
    expect(
      renderer.root.findByProps({
        accessibilityLabel: `Remove ${contact.name}`,
      }).props.accessibilityState,
    ).toEqual({ busy: true, disabled: true });
    expect(
      renderer.root.findByProps({
        accessibilityLabel: `Remove ${secondContact.name}`,
      }).props.disabled,
    ).toBe(true);

    await act(async () => {
      first.resolve();
      await first.promise;
    });
    expect(
      renderer.root.findByProps({
        accessibilityLabel: `Remove ${secondContact.name}`,
      }).props.disabled,
    ).toBe(true);

    await act(async () => {
      second.reject(new Error("Removal failed."));
      await second.promise.catch(() => undefined);
    });
    expect(JSON.stringify(renderer.toJSON())).toContain("Removal failed.");
    expect(
      renderer.root.findAllByProps({ accessibilityRole: "button" }).filter(
        (candidate) =>
          candidate
            .findAllByType(Text)
            .some((node) => node.props.children === "Try again"),
      ),
    ).toHaveLength(0);
    alert.mockRestore();
  });
});
