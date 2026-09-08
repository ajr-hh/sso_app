import React from "react";
import {
  act,
  create,
  type ReactTestInstance,
  type ReactTestRenderer,
} from "react-test-renderer";
import { Alert, Modal, Text } from "react-native";

import type { MilestoneReward } from "../src/data/rewards";
import {
  getMilestoneTileLabel,
  REWARDS_COPY,
} from "../src/presentation/rewards";

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
jest.mock("../src/data/rewards", () => ({
  createMilestoneReward: jest.fn(),
  fetchMilestoneRewards: jest.fn(),
  removeMilestoneReward: jest.fn(),
  updateMilestoneReward: jest.fn(),
}));

import RewardsScreen from "../app/(app)/sos/rewards";
import {
  createMilestoneReward,
  fetchMilestoneRewards,
  removeMilestoneReward,
  updateMilestoneReward,
} from "../src/data/rewards";

const mockedFetch = jest.mocked(fetchMilestoneRewards);
const mockedCreate = jest.mocked(createMilestoneReward);
const mockedUpdate = jest.mocked(updateMilestoneReward);
const mockedRemove = jest.mocked(removeMilestoneReward);

const earned: MilestoneReward = {
  id: "m1",
  milestone: "Lose 10 pounds",
  reward: "A new shirt",
  progress_note: null,
  completed: true,
  completed_at: "2026-09-07T12:00:00.000Z",
};

const inProgress: MilestoneReward = {
  id: "m2",
  milestone: "Lose 20 pounds",
  reward: "A weekend drive",
  progress_note: "6 lbs to go",
  completed: false,
  completed_at: null,
};

async function flush(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

async function renderScreen(): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(React.createElement(RewardsScreen));
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

function input(renderer: ReactTestRenderer, label: string): ReactTestInstance {
  return renderer.root.findByProps({ accessibilityLabel: label });
}

describe("RewardsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedFetch.mockResolvedValue([]);
    mockedCreate.mockResolvedValue(inProgress);
    mockedUpdate.mockResolvedValue(earned);
    mockedRemove.mockResolvedValue(undefined);
  });

  test("uses the Small Wins copy", async () => {
    const renderer = await renderScreen();
    expect(texts(renderer)).toEqual(
      expect.arrayContaining([
        REWARDS_COPY.title,
        REWARDS_COPY.subtitle,
        REWARDS_COPY.add,
        REWARDS_COPY.privacy,
      ]),
    );
    expect(texts(renderer).join(" ")).not.toContain(
      "Progress is still progress",
    );
  });

  test("shows each milestone, reward, and how far to go", async () => {
    mockedFetch.mockResolvedValue([earned, inProgress]);
    const renderer = await renderScreen();
    expect(texts(renderer)).toEqual(
      expect.arrayContaining([
        "Lose 10 pounds",
        "A new shirt",
        REWARDS_COPY.earned,
        "Lose 20 pounds",
        "A weekend drive",
        "6 lbs to go",
      ]),
    );
    expect(
      renderer.root.findByProps({
        accessibilityLabel: getMilestoneTileLabel(earned),
      }),
    ).toBeTruthy();
    expect(
      renderer.root.findByProps({
        accessibilityLabel: getMilestoneTileLabel(inProgress),
      }),
    ).toBeTruthy();
  });

  test("opens an add popup with milestone and reward fields", async () => {
    const renderer = await renderScreen();
    const modal = renderer.root.findByType(Modal);
    expect(modal.props.visible).toBe(false);

    await act(async () => {
      button(renderer, REWARDS_COPY.add).props.onPress();
    });

    expect(modal.props.visible).toBe(true);
    expect(input(renderer, REWARDS_COPY.milestoneLabel)).toBeTruthy();
    expect(input(renderer, REWARDS_COPY.rewardLabel)).toBeTruthy();
    expect(() => input(renderer, REWARDS_COPY.progressLabel)).toThrow();
  });

  test("saves a new milestone reward from the popup", async () => {
    const renderer = await renderScreen();
    await act(async () => {
      button(renderer, REWARDS_COPY.add).props.onPress();
    });
    await act(async () => {
      input(renderer, REWARDS_COPY.milestoneLabel).props.onChangeText(
        "Lose 20 pounds",
      );
      input(renderer, REWARDS_COPY.rewardLabel).props.onChangeText(
        "A weekend drive",
      );
    });
    await act(async () => {
      button(renderer, REWARDS_COPY.save).props.onPress();
    });
    await flush();

    expect(mockedCreate).toHaveBeenCalledWith({
      milestone: "Lose 20 pounds",
      reward: "A weekend drive",
    });
  });

  test("lets them edit, mark complete, set how close, and remove", async () => {
    mockedFetch.mockResolvedValue([inProgress]);
    const renderer = await renderScreen();

    await act(async () => {
      renderer.root
        .findByProps({
          accessibilityLabel: getMilestoneTileLabel(inProgress),
        })
        .props.onPress();
    });

    expect(renderer.root.findByType(Modal).props.visible).toBe(true);
    expect(input(renderer, REWARDS_COPY.progressLabel).props.value).toBe(
      "6 lbs to go",
    );

    await act(async () => {
      input(renderer, REWARDS_COPY.progressLabel).props.onChangeText(
        "4 lbs to go",
      );
    });
    await act(async () => {
      button(renderer, REWARDS_COPY.save).props.onPress();
    });
    await flush();
    expect(mockedUpdate).toHaveBeenCalledWith("m2", {
      milestone: "Lose 20 pounds",
      reward: "A weekend drive",
      progress_note: "4 lbs to go",
    });

    await act(async () => {
      renderer.root
        .findByProps({
          accessibilityLabel: getMilestoneTileLabel(inProgress),
        })
        .props.onPress();
    });
    await act(async () => {
      input(renderer, REWARDS_COPY.progressLabel).props.onChangeText(
        "4 lbs to go",
      );
    });
    await act(async () => {
      button(renderer, REWARDS_COPY.markComplete).props.onPress();
    });
    await flush();
    expect(mockedUpdate).toHaveBeenCalledWith("m2", {
      milestone: "Lose 20 pounds",
      reward: "A weekend drive",
      progress_note: "4 lbs to go",
      completed: true,
    });

    const alert = jest.spyOn(Alert, "alert").mockImplementation();
    await act(async () => {
      renderer.root
        .findByProps({
          accessibilityLabel: getMilestoneTileLabel(inProgress),
        })
        .props.onPress();
    });
    await act(async () => {
      button(renderer, REWARDS_COPY.remove).props.onPress();
    });
    expect(mockedRemove).not.toHaveBeenCalled();
    expect(alert).toHaveBeenCalledWith(
      REWARDS_COPY.removeTitle,
      REWARDS_COPY.removeBody(inProgress.milestone),
      expect.any(Array),
    );
    await act(async () => {
      alert.mock.calls.at(-1)?.[2]?.[1].onPress?.();
    });
    await flush();
    expect(mockedRemove).toHaveBeenCalledWith("m2");
    alert.mockRestore();
  });

  test("ignores a second save tap while the first is still writing", async () => {
    let finishCreate!: (value: MilestoneReward) => void;
    mockedCreate.mockImplementation(
      () =>
        new Promise((resolve) => {
          finishCreate = resolve;
        }),
    );
    const renderer = await renderScreen();
    await act(async () => {
      button(renderer, REWARDS_COPY.add).props.onPress();
    });
    await act(async () => {
      input(renderer, REWARDS_COPY.milestoneLabel).props.onChangeText(
        "Lose 20 pounds",
      );
      input(renderer, REWARDS_COPY.rewardLabel).props.onChangeText(
        "A weekend drive",
      );
    });
    await act(async () => {
      button(renderer, REWARDS_COPY.save).props.onPress();
      button(renderer, REWARDS_COPY.save).props.onPress();
    });
    expect(mockedCreate).toHaveBeenCalledTimes(1);
    await act(async () => {
      finishCreate(inProgress);
    });
    await flush();
  });
});
