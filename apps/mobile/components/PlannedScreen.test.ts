import React from "react";
import {
  act,
  create,
  type ReactTestInstance,
  type ReactTestRenderer,
} from "react-test-renderer";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { MaterialSymbol } from "./MaterialSymbol";
import type { Profile } from "../src/types";
import {
  CHECK_IN_LABEL,
  HOLIDAY_MEAL_SUGGESTIONS,
  PLAN_AHEAD_COPY,
  type PlannedSuggestion,
} from "../src/presentation/planned";
import { colors } from "../src/theme/colors";

const mockRouter = {
  back: jest.fn(),
  canGoBack: jest.fn(() => true),
  navigate: jest.fn(),
  push: jest.fn(),
  replace: jest.fn(),
};

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));
jest.mock("expo-router", () => {
  const ReactModule = jest.requireActual("react") as typeof React;
  return {
    useFocusEffect: (callback: () => undefined | (() => void)) => {
      ReactModule.useEffect(() => {
        const cleanup = callback();
        return () => {
          if (typeof cleanup === "function") cleanup();
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
  saveRailOrder: jest.fn(),
}));
jest.mock("../src/data/tasks", () => ({
  addTask: jest.fn(),
  taskDayKey: () => "2026-09-07",
}));
jest.mock("../src/data/plannedSuggestions", () => ({
  fetchPlannedEventPlan: jest.fn(),
  fetchPlannedEventPlans: jest.fn(),
  generatePlannedSuggestions: jest.fn(),
  removePlannedEventPlan: jest.fn(),
  savePlannedEventPlan: jest.fn(),
  updatePlannedEventSuggestions: jest.fn(),
}));

import PlannedScreen from "../app/(app)/sos/planned";
import { fetchProfile } from "../src/data/profile";
import { addTask } from "../src/data/tasks";
import {
  fetchPlannedEventPlan,
  fetchPlannedEventPlans,
  generatePlannedSuggestions,
  removePlannedEventPlan,
  savePlannedEventPlan,
  updatePlannedEventSuggestions,
} from "../src/data/plannedSuggestions";
import { getRemoveEventLabel } from "../src/presentation/planned";

const mockedFetchProfile = jest.mocked(fetchProfile);
const mockedFetchPlan = jest.mocked(fetchPlannedEventPlan);
const mockedFetchPlans = jest.mocked(fetchPlannedEventPlans);
const mockedGenerate = jest.mocked(generatePlannedSuggestions);
const mockedSavePlan = jest.mocked(savePlannedEventPlan);
const mockedRemovePlan = jest.mocked(removePlannedEventPlan);
const mockedUpdateSuggestions = jest.mocked(updatePlannedEventSuggestions);
const mockedAddTask = jest.mocked(addTask);

const profile: Profile = {
  age: null,
  allergens: [],
  coach_style: "sam",
  coach_style_set: true,
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

async function flush(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

async function renderScreen(): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(React.createElement(PlannedScreen));
  });
  await flush();
  return renderer;
}

function texts(renderer: ReactTestRenderer): string[] {
  return renderer.root
    .findAllByType(Text)
    .map((node) => node.props.children)
    .flat(8)
    .filter((value): value is string => typeof value === "string");
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

describe("PlannedScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedFetchProfile.mockResolvedValue(profile);
    mockedFetchPlan.mockResolvedValue(null);
    mockedFetchPlans.mockResolvedValue([]);
    mockedGenerate.mockResolvedValue([...HOLIDAY_MEAL_SUGGESTIONS]);
    mockedSavePlan.mockImplementation(async (input) => ({
      id: "plan-1",
      event_kind: input.eventKind,
      custom_label: input.customLabel ?? null,
      suggestions: [...input.suggestions],
    }));
    mockedAddTask.mockResolvedValue({
      id: "task-1",
      label: "Check in on your holiday meal plan",
      done: false,
    });
    mockedRemovePlan.mockResolvedValue();
    mockedUpdateSuggestions.mockImplementation(async (id, suggestions) => ({
      id,
      event_kind: "holiday_meal",
      custom_label: null,
      suggestions: [...suggestions],
    }));
  });

  test("shows the three events plus Other, and no suggestions yet", async () => {
    const renderer = await renderScreen();
    expect(texts(renderer)).toEqual(
      expect.arrayContaining([
        "Holiday meal",
        "Celebration",
        "Travel",
        "Other",
        CHECK_IN_LABEL,
      ]),
    );
    expect(texts(renderer)).not.toEqual(
      expect.arrayContaining([HOLIDAY_MEAL_SUGGESTIONS[0].text]),
    );
    expect(texts(renderer)).not.toEqual(
      expect.arrayContaining(["Choose a reinforcement"]),
    );
    expect(renderer.root.findAllByType(TextInput)).toHaveLength(0);
  });

  test("lets Other type a label, then Save generates the suggestion tile", async () => {
    mockedGenerate.mockResolvedValue([...HOLIDAY_MEAL_SUGGESTIONS]);
    const renderer = await renderScreen();

    await act(async () => {
      button(renderer, "Other").props.onPress();
    });
    expect(mockedGenerate).not.toHaveBeenCalled();
    expect(renderer.root.findAllByType(TextInput)).toHaveLength(1);

    const save = button(renderer, PLAN_AHEAD_COPY.save);
    const saveStyle = StyleSheet.flatten(save.props.style);
    expect(saveStyle.backgroundColor).toBe("#FFFFFF");
    expect(saveStyle.borderColor).toBe(colors.ink);

    await act(async () => {
      renderer.root.findByType(TextInput).props.onChangeText("Office dinner");
    });
    await act(async () => {
      await button(renderer, PLAN_AHEAD_COPY.save).props.onPress();
    });
    await flush();

    expect(mockedGenerate).toHaveBeenCalledWith({
      eventKind: "other",
      eventLabel: "Office dinner",
    });
    expect(texts(renderer)).toEqual(
      expect.arrayContaining([
        "Office dinner",
        "Suggestions for Office dinner",
        HOLIDAY_MEAL_SUGGESTIONS[0].text,
        HOLIDAY_MEAL_SUGGESTIONS[1].text,
        HOLIDAY_MEAL_SUGGESTIONS[2].text,
      ]),
    );
    expect(button(renderer, "Office dinner").props.accessibilityState).toEqual(
      expect.objectContaining({ selected: true }),
    );
    expect(button(renderer, "Other").props.accessibilityState).toEqual(
      expect.objectContaining({ selected: false }),
    );
  });

  test("generates Holiday meal suggestions in one divided tile with the three icons", async () => {
    const renderer = await renderScreen();
    await act(async () => {
      await button(renderer, "Holiday meal").props.onPress();
    });
    await flush();

    expect(mockedGenerate).toHaveBeenCalledWith({
      eventKind: "holiday_meal",
    });
    expect(texts(renderer)).toEqual(
      expect.arrayContaining([
        "Suggestions for Holiday meal",
        HOLIDAY_MEAL_SUGGESTIONS[0].text,
        HOLIDAY_MEAL_SUGGESTIONS[1].text,
        HOLIDAY_MEAL_SUGGESTIONS[2].text,
      ]),
    );

    const icons = renderer.root
      .findAllByType(MaterialSymbol)
      .map((node) => node.props.name);
    expect(icons).toEqual(
      expect.arrayContaining(["restaurant", "local_bar", "chat"]),
    );

    const restaurant = renderer.root
      .findAllByType(MaterialSymbol)
      .find((node) => node.props.name === "restaurant");
    expect(restaurant?.props.color).toBe(colors.ink);

    const tile = renderer.root.findByProps({ testID: "planned-suggestions" });
    const dividers = tile.findAll(
      (node) =>
        node.type === View && node.props.testID === "planned-suggestion-divider",
    );
    expect(dividers).toHaveLength(2);
  });

  test("clears the last event's suggestions while the next one generates", async () => {
    let resolveCelebration: ((value: PlannedSuggestion[]) => void) | undefined;
    mockedGenerate
      .mockResolvedValueOnce([...HOLIDAY_MEAL_SUGGESTIONS])
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveCelebration = resolve;
          }),
      );

    const renderer = await renderScreen();
    await act(async () => {
      await button(renderer, "Holiday meal").props.onPress();
    });
    await flush();
    expect(texts(renderer)).toEqual(
      expect.arrayContaining([HOLIDAY_MEAL_SUGGESTIONS[0].text]),
    );

    await act(async () => {
      button(renderer, "Celebration").props.onPress();
    });
    expect(texts(renderer)).not.toEqual(
      expect.arrayContaining([HOLIDAY_MEAL_SUGGESTIONS[0].text]),
    );
    expect(texts(renderer)).toEqual(
      expect.arrayContaining(["Celebration"]),
    );

    await act(async () => {
      resolveCelebration?.([
        {
          icon: "restaurant",
          text: "Eat before the party so you are not starving on arrival.",
        },
        {
          icon: "local_bar",
          text: "Decide your drink count now, not after the second toast.",
        },
        {
          icon: "chat",
          text: "Tell one person there what you are working on to help be your champion.",
        },
      ]);
    });
    await flush();
  });

  test("sets a check in for tomorrow from the bottom button", async () => {
    const renderer = await renderScreen();
    await act(async () => {
      await button(renderer, "Holiday meal").props.onPress();
    });
    await flush();
    await act(async () => {
      await button(renderer, CHECK_IN_LABEL).props.onPress();
    });
    expect(mockedAddTask).toHaveBeenCalledWith(
      "Check in on your holiday meal plan",
      "2026-09-08",
    );
  });

  test("loads a new AI set without repeating the current lines", async () => {
    const nextSet = [
      { icon: "restaurant" as const, text: "Start with grilled fish and greens." },
      { icon: "local_bar" as const, text: "Keep the toast to one glass." },
      { icon: "chat" as const, text: "Ask a friend to sit between you and the buffet." },
    ];
    mockedGenerate
      .mockResolvedValueOnce([...HOLIDAY_MEAL_SUGGESTIONS])
      .mockResolvedValueOnce(nextSet);
    const renderer = await renderScreen();
    await act(async () => {
      await button(renderer, "Holiday meal").props.onPress();
    });
    await flush();
    await act(async () => {
      await button(renderer, PLAN_AHEAD_COPY.loadMore).props.onPress();
    });
    await flush();
    expect(mockedGenerate).toHaveBeenLastCalledWith({
      eventKind: "holiday_meal",
      avoidTexts: HOLIDAY_MEAL_SUGGESTIONS.map((item) => item.text),
    });
    expect(texts(renderer)).toEqual(expect.arrayContaining([nextSet[0].text]));
  });

  test("lets them remove a saved Other event", async () => {
    mockedFetchPlans.mockResolvedValue([
      {
        id: "plan-2",
        event_kind: "other",
        custom_label: "Office dinner",
        suggestions: [...HOLIDAY_MEAL_SUGGESTIONS],
      },
    ]);
    const renderer = await renderScreen();
    expect(texts(renderer)).toEqual(expect.arrayContaining(["Office dinner"]));
    await act(async () => {
      await renderer.root
        .findByProps({ accessibilityLabel: getRemoveEventLabel("Office dinner") })
        .props.onPress();
    });
    await flush();
    expect(mockedRemovePlan).toHaveBeenCalledWith("plan-2");
    expect(texts(renderer)).not.toEqual(expect.arrayContaining(["Office dinner"]));
  });
});
