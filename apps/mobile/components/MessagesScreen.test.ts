import React from "react";
import {
  act,
  create,
  type ReactTestInstance,
  type ReactTestRenderer,
} from "react-test-renderer";
import { KeyboardAvoidingView, StyleSheet, Text } from "react-native";

import type { CoachMessage } from "../src/data/coachMessages";
import type { Profile } from "../src/types";

const mockRouter = {
  back: jest.fn(),
  canGoBack: jest.fn(() => true),
  navigate: jest.fn(),
  push: jest.fn(),
  replace: jest.fn(),
};

let mockFocusCallback: (() => undefined | (() => void)) | null = null;
let mockBlurFocus: (() => void) | undefined;

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));
jest.mock("expo-router", () => {
  const ReactModule = jest.requireActual("react") as typeof React;
  return {
    useFocusEffect: (callback: () => undefined | (() => void)) => {
      ReactModule.useEffect(() => {
        mockFocusCallback = callback;
        const cleanup = callback();
        mockBlurFocus = typeof cleanup === "function" ? cleanup : undefined;
        return () => {
          mockBlurFocus?.();
          mockBlurFocus = undefined;
        };
      }, [callback]);
    },
    useLocalSearchParams: () => ({}),
    useRouter: () => mockRouter,
  };
});
jest.mock("../src/data/sos", () => ({
  logSosEvent: jest.fn(async () => undefined),
}));
jest.mock("../src/data/profile", () => ({
  fetchProfile: jest.fn(),
  saveProfile: jest.fn(),
}));
jest.mock("../src/data/coachMessages", () => ({
  createCoachMessage: jest.fn(),
  fetchCoachMessages: jest.fn(),
  generateCoachReply: jest.fn(),
  hideCoachMessage: jest.fn(),
  hideVisibleCoachMessages: jest.fn(),
}));

import MessagesScreen from "../app/(app)/sos/messages";
import {
  createCoachMessage,
  fetchCoachMessages,
  generateCoachReply,
  hideCoachMessage,
  hideVisibleCoachMessages,
} from "../src/data/coachMessages";
import { fetchProfile, saveProfile } from "../src/data/profile";
import { COACH_COPY } from "../src/presentation/coaches";
import { colors } from "../src/theme/colors";

const mockedCreate = jest.mocked(createCoachMessage);
const mockedFetchMessages = jest.mocked(fetchCoachMessages);
const mockedGenerate = jest.mocked(generateCoachReply);
const mockedHide = jest.mocked(hideCoachMessage);
const mockedHideVisible = jest.mocked(hideVisibleCoachMessages);
const mockedFetchProfile = jest.mocked(fetchProfile);
const mockedSaveProfile = jest.mocked(saveProfile);

const unsetProfile: Profile = {
  age: null,
  allergens: [],
  coach_style: "marcus",
  coach_style_set: false,
  diet_flags: [],
  display_name: "Alex",
  email: "alex@example.test",
  food_rules_set: true,
  id: "user-1",
  motivators: "Better Choices",
  phone: null,
  rail_order: [],
  why_matters: null,
};

const chosenProfile: Profile = {
  ...unsetProfile,
  coach_style: "sam",
  coach_style_set: true,
};

const opening: CoachMessage = {
  id: "msg-1",
  coach_style: "sam",
  role: "coach",
  body: "What's loud right now?",
  created_at: "2026-09-06T12:00:00.000Z",
  show_message: true,
};

async function flush(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

async function renderScreen(): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(React.createElement(MessagesScreen));
  });
  await flush();
  return renderer;
}

function button(renderer: ReactTestRenderer, label: string): ReactTestInstance {
  const match = renderer.root
    .findAllByProps({ accessibilityRole: "button" })
    .find((node) =>
      node.findAllByType(Text).some(({ props }) => props.children === label),
    );
  if (!match) throw new Error(`Missing button "${label}".`);
  return match;
}

function texts(renderer: ReactTestRenderer): string[] {
  return renderer.root
    .findAllByType(Text)
    .map((node) => node.props.children)
    .flat(8)
    .filter((value): value is string => typeof value === "string");
}

describe("MessagesScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedSaveProfile.mockResolvedValue(undefined);
    mockedCreate.mockImplementation(async ({ role, body }) => ({
      id: `msg-${role}`,
      coach_style: "sam",
      role,
      body,
      created_at: "2026-09-06T12:02:00.000Z",
      show_message: true,
    }));
    mockedGenerate.mockResolvedValue("Stay with this. Then decide.");
    mockedHide.mockResolvedValue(undefined);
    mockedHideVisible.mockResolvedValue(undefined);
  });

  test("asks the member to pick a coach the first time they open messages", async () => {
    mockedFetchProfile.mockResolvedValue(unsetProfile);
    const renderer = await renderScreen();

    expect(texts(renderer)).toEqual(
      expect.arrayContaining([
        COACH_COPY.pickerTitle,
        "Marcus",
        "Elena",
        "Sam",
        "Jordan",
      ]),
    );
    expect(mockedFetchMessages).not.toHaveBeenCalled();
    expect(texts(renderer).join(" ")).not.toContain("—");
  });

  test("saves the first coach choice and then texts first", async () => {
    mockedFetchProfile
      .mockResolvedValueOnce(unsetProfile)
      .mockResolvedValue(chosenProfile);
    mockedFetchMessages.mockResolvedValue([]);
    mockedGenerate.mockResolvedValue("What's loud right now?");
    mockedCreate.mockResolvedValue(opening);

    const renderer = await renderScreen();
    await act(async () => {
      await button(renderer, "Sam").props.onPress();
    });

    expect(mockedSaveProfile).toHaveBeenCalledWith({
      coach_style: "sam",
      coach_style_set: true,
    });
    expect(mockedGenerate).toHaveBeenCalledWith("sam");
    expect(mockedCreate).toHaveBeenCalledWith({
      coachStyle: "sam",
      role: "coach",
      body: "What's loud right now?",
    });
    expect(texts(renderer)).toEqual(
      expect.arrayContaining(["What's loud right now?", COACH_COPY.send]),
    );
  });

  test("sends a member message and shows the coach reply", async () => {
    mockedFetchProfile.mockResolvedValue(chosenProfile);
    mockedFetchMessages.mockResolvedValue([opening]);

    const renderer = await renderScreen();
    const input = renderer.root.findByProps({
      accessibilityLabel: COACH_COPY.composerLabel,
    });
    await act(async () => {
      input.props.onChangeText("The craving is loud.");
    });
    await act(async () => {
      await button(renderer, COACH_COPY.send).props.onPress();
    });

    expect(mockedCreate).toHaveBeenNthCalledWith(1, {
      coachStyle: "sam",
      role: "member",
      body: "The craving is loud.",
    });
    expect(mockedGenerate).toHaveBeenCalledWith("sam");
    expect(mockedCreate).toHaveBeenNthCalledWith(2, {
      coachStyle: "sam",
      role: "coach",
      body: "Stay with this. Then decide.",
    });
    expect(texts(renderer)).toEqual(
      expect.arrayContaining([
        "The craving is loud.",
        "Stay with this. Then decide.",
      ]),
    );
    expect(texts(renderer).join(" ")).not.toContain("—");
  });

  test("keeps Send closed until the coach texts first", async () => {
    const openingReply = deferred<string>();
    mockedFetchProfile.mockResolvedValue(unsetProfile);
    mockedFetchMessages.mockResolvedValue([]);
    mockedGenerate.mockReturnValue(openingReply.promise);
    mockedCreate.mockResolvedValue(opening);

    const renderer = await renderScreen();
    let pick!: Promise<void>;
    await act(async () => {
      pick = button(renderer, "Sam").props.onPress();
    });
    await flush();

    expect(texts(renderer)).toEqual(
      expect.arrayContaining([COACH_COPY.opening]),
    );
    expect(() => button(renderer, COACH_COPY.send)).toThrow(
      `Missing button "${COACH_COPY.send}"`,
    );

    await act(async () => {
      openingReply.resolve("What's loud right now?");
      await pick;
    });
    expect(texts(renderer)).toEqual(
      expect.arrayContaining(["What's loud right now?", COACH_COPY.send]),
    );
  });

  test("ignores a second coach tap while the first pick is saving", async () => {
    const save = deferred<void>();
    mockedFetchProfile.mockResolvedValue(unsetProfile);
    mockedSaveProfile.mockReturnValue(save.promise);

    const renderer = await renderScreen();
    await act(async () => {
      void button(renderer, "Sam").props.onPress();
      void button(renderer, "Elena").props.onPress();
    });

    expect(mockedSaveProfile).toHaveBeenCalledTimes(1);
    expect(mockedSaveProfile).toHaveBeenCalledWith({
      coach_style: "sam",
      coach_style_set: true,
    });
    await act(async () => {
      save.resolve();
    });
  });

  test("double Send posts only one member message", async () => {
    const reply = deferred<string>();
    mockedFetchProfile.mockResolvedValue(chosenProfile);
    mockedFetchMessages.mockResolvedValue([opening]);
    mockedGenerate.mockReturnValue(reply.promise);

    const renderer = await renderScreen();
    await act(async () => {
      renderer.root.findByProps({
        accessibilityLabel: COACH_COPY.composerLabel,
      }).props.onChangeText("The craving is loud.");
    });
    await act(async () => {
      void button(renderer, COACH_COPY.send).props.onPress();
      void button(renderer, COACH_COPY.send).props.onPress();
    });

    expect(
      mockedCreate.mock.calls.filter(([{ role }]) => role === "member"),
    ).toHaveLength(1);
    await act(async () => {
      reply.resolve("Stay with this. Then decide.");
    });
  });

  test("finishes the opening text after a refocus during generate", async () => {
    mockedFetchProfile.mockResolvedValue(chosenProfile);
    mockedFetchMessages.mockResolvedValue([]);
    const openingReply = deferred<string>();
    mockedGenerate.mockReturnValue(openingReply.promise);
    mockedCreate.mockResolvedValue(opening);

    const renderer = await renderScreen();
    await act(async () => {
      mockFocusCallback?.();
    });
    expect(texts(renderer)).toEqual(
      expect.arrayContaining([COACH_COPY.opening]),
    );

    await act(async () => {
      openingReply.resolve("What's loud right now?");
      await flush();
    });
    expect(texts(renderer)).toEqual(
      expect.arrayContaining(["What's loud right now?", COACH_COPY.send]),
    );
  });

  test("does not let a newer focus reload wipe a send still in flight", async () => {
    const reply = deferred<string>();
    mockedFetchProfile.mockResolvedValue(chosenProfile);
    mockedFetchMessages.mockResolvedValue([opening]);
    mockedGenerate.mockReturnValue(reply.promise);

    const renderer = await renderScreen();
    await act(async () => {
      renderer.root.findByProps({
        accessibilityLabel: COACH_COPY.composerLabel,
      }).props.onChangeText("The craving is loud.");
    });
    await act(async () => {
      void button(renderer, COACH_COPY.send).props.onPress();
    });
    mockedFetchMessages.mockResolvedValue([opening]);
    await act(async () => {
      mockFocusCallback?.();
      await flush();
    });
    expect(texts(renderer)).toEqual(
      expect.arrayContaining(["The craving is loud."]),
    );
    await act(async () => {
      reply.resolve("Stay with this. Then decide.");
      await flush();
    });
  });

  test("does not let a stale thread reload wipe a just-sent message", async () => {
    const staleLoad = deferred<CoachMessage[]>();
    mockedFetchProfile.mockResolvedValue(chosenProfile);
    mockedFetchMessages
      .mockResolvedValueOnce([opening])
      .mockReturnValue(staleLoad.promise);

    const renderer = await renderScreen();
    await act(async () => {
      mockFocusCallback?.();
    });
    await act(async () => {
      renderer.root.findByProps({
        accessibilityLabel: COACH_COPY.composerLabel,
      }).props.onChangeText("The craving is loud.");
    });
    await act(async () => {
      await button(renderer, COACH_COPY.send).props.onPress();
    });

    await act(async () => {
      staleLoad.resolve([opening]);
      await staleLoad.promise;
    });

    expect(texts(renderer)).toEqual(
      expect.arrayContaining(["The craving is loud."]),
    );
  });

  test("picker announces the blurb with the name", async () => {
    mockedFetchProfile.mockResolvedValue(unsetProfile);
    const renderer = await renderScreen();
    expect(
      renderer.root.findByProps({
        accessibilityLabel: "Sam. A friend who keeps it real.",
      }),
    ).toBeTruthy();
  });

  test("Send tells assistive tech it is busy", async () => {
    const reply = deferred<string>();
    mockedFetchProfile.mockResolvedValue(chosenProfile);
    mockedFetchMessages.mockResolvedValue([opening]);
    mockedGenerate.mockReturnValue(reply.promise);

    const renderer = await renderScreen();
    await act(async () => {
      renderer.root.findByProps({
        accessibilityLabel: COACH_COPY.composerLabel,
      }).props.onChangeText("The craving is loud.");
    });
    await act(async () => {
      void button(renderer, COACH_COPY.send).props.onPress();
    });
    await flush();

    expect(button(renderer, COACH_COPY.sending).props.accessibilityState).toEqual(
      expect.objectContaining({ busy: true, disabled: true }),
    );
    await act(async () => {
      reply.resolve("Stay with this. Then decide.");
    });
  });

  test("keeps the composer above the keyboard", async () => {
    mockedFetchProfile.mockResolvedValue(chosenProfile);
    mockedFetchMessages.mockResolvedValue([opening]);
    const renderer = await renderScreen();
    expect(renderer.root.findByType(KeyboardAvoidingView)).toBeTruthy();
  });

  test("deletes one message from the screen without dropping the rest", async () => {
    const member: CoachMessage = {
      id: "msg-2",
      coach_style: "sam",
      role: "member",
      body: "The craving is loud.",
      created_at: "2026-09-06T12:02:00.000Z",
      show_message: true,
    };
    mockedFetchProfile.mockResolvedValue(chosenProfile);
    mockedFetchMessages.mockResolvedValue([opening, member]);
    const renderer = await renderScreen();

    await act(async () => {
      await renderer.root
        .findByProps({ accessibilityLabel: `Delete ${member.body}` })
        .props.onPress();
    });

    expect(mockedHide).toHaveBeenCalledWith("msg-2");
    expect(texts(renderer)).toEqual(
      expect.arrayContaining(["What's loud right now?"]),
    );
    expect(texts(renderer).join(" ")).not.toContain("The craving is loud.");
  });

  test("puts a small outlined clear control under Send", async () => {
    mockedFetchProfile.mockResolvedValue(chosenProfile);
    mockedFetchMessages.mockResolvedValue([opening]);
    const renderer = await renderScreen();
    const buttons = renderer.root.findAllByProps({
      accessibilityRole: "button",
    });
    const sendIndex = buttons.findIndex((node) =>
      node.findAllByType(Text).some(({ props }) => props.children === COACH_COPY.send),
    );
    const clearIndex = buttons.findIndex((node) =>
      node.findAllByType(Text).some(({ props }) => props.children === COACH_COPY.clear),
    );
    expect(clearIndex).toBeGreaterThan(sendIndex);

    const clear = button(renderer, COACH_COPY.clear);
    const style = StyleSheet.flatten(clear.props.style);
    expect(style.backgroundColor).toBe("transparent");
    expect(style.borderColor).toBe(colors.ink);
    expect(style.borderWidth).toBeGreaterThanOrEqual(1);
    expect(style.minHeight).toBeLessThan(40);

    const label = StyleSheet.flatten(
      clear.findAllByType(Text)[0]?.props.style,
    );
    expect(label.color).toBe(colors.ink);
    expect(label.fontSize).toBeLessThan(16);
  });

  test("clears the visible thread without deleting the rows", async () => {
    mockedFetchProfile.mockResolvedValue(chosenProfile);
    mockedFetchMessages.mockResolvedValue([opening]);
    const renderer = await renderScreen();

    await act(async () => {
      await button(renderer, COACH_COPY.clear).props.onPress();
    });

    expect(mockedHideVisible).toHaveBeenCalledWith("sam");
    expect(texts(renderer)).toEqual(expect.arrayContaining([COACH_COPY.send]));
    expect(texts(renderer).join(" ")).not.toContain("What's loud right now?");
    expect(mockedGenerate).not.toHaveBeenCalled();
  });
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}
