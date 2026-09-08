import React from "react";
import {
  act,
  create,
  type ReactTestInstance,
  type ReactTestRenderer,
} from "react-test-renderer";
import { StyleSheet, Text } from "react-native";

import { STATS } from "../src/content/stats";
import type { ResearchFact } from "../src/presentation/statsScreen";
import { STATS_COPY } from "../src/presentation/statsScreen";
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
jest.mock("../src/data/researchFacts", () => ({
  createResearchFact: jest.fn(),
  fetchResearchFacts: jest.fn(),
  generateResearchFact: jest.fn(),
}));

import StatsScreen from "../app/(app)/sos/stats";
import {
  createResearchFact,
  fetchResearchFacts,
  generateResearchFact,
} from "../src/data/researchFacts";

const mockedFetch = jest.mocked(fetchResearchFacts);
const mockedCreate = jest.mocked(createResearchFact);
const mockedGenerate = jest.mocked(generateResearchFact);

const saved: ResearchFact = {
  id: "f1",
  num: "8%",
  title: "A saved AI fact",
  body: "Generated for this member.",
  source: "ai",
};

async function flush(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

async function renderScreen(): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(React.createElement(StatsScreen));
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

describe("StatsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedFetch.mockResolvedValue([]);
    mockedCreate.mockImplementation(async (input) => ({
      id: "new-1",
      ...input,
      num: input.num ?? null,
    }));
    mockedGenerate.mockResolvedValue({
      num: "15%",
      title: "A new research fact",
      body: "Generated just now.",
    });
  });

  test("uses the research copy and starts on the first editorial fact", async () => {
    const renderer = await renderScreen();
    expect(texts(renderer)).toEqual(
      expect.arrayContaining([
        STATS_COPY.title,
        STATS_COPY.subtitle,
        STATS[0].title,
        STATS_COPY.rotate,
        STATS_COPY.generate,
        STATS_COPY.addHeading,
        STATS_COPY.footnote,
        STATS_COPY.backOnTrack,
      ]),
    );
    expect(texts(renderer).join(" ")).not.toContain("Your next choice matters");
    expect(texts(renderer).join(" ")).not.toContain(
      "I’m ready for my next choice",
    );

    const save = button(renderer, STATS_COPY.save);
    const saveStyle = StyleSheet.flatten(save.props.style);
    expect(saveStyle.backgroundColor).toBe("#FFFFFF");
    expect(saveStyle.borderColor).toBe(colors.ink);
    expect(saveStyle.borderWidth).toBeGreaterThanOrEqual(1);
    const saveLabel = StyleSheet.flatten(
      save.findAllByType(Text)[0]?.props.style,
    );
    expect(saveLabel.color).toBe(colors.ink);

    const add = renderer.root.findByProps({
      testID: "stats-add-fact",
    });
    expect(StyleSheet.flatten(add.props.style).borderStyle).toBe("dashed");
  });

  test("takes them home from Facts work. Back on track", async () => {
    const renderer = await renderScreen();
    await act(async () => {
      button(renderer, STATS_COPY.backOnTrack).props.onPress();
    });
    expect(mockRouter.navigate).toHaveBeenCalledWith("/(app)/(tabs)/home");
  });

  test("rotates to the next fact", async () => {
    const renderer = await renderScreen();
    await act(async () => {
      button(renderer, STATS_COPY.rotate).props.onPress();
    });
    expect(texts(renderer)).toEqual(expect.arrayContaining([STATS[1].title]));
  });

  test("creates more by generating and saving an AI fact", async () => {
    mockedFetch.mockResolvedValueOnce([]).mockResolvedValue([saved]);
    const renderer = await renderScreen();
    await act(async () => {
      await button(renderer, STATS_COPY.generate).props.onPress();
    });
    expect(mockedGenerate).toHaveBeenCalledWith(0);
    expect(mockedCreate).toHaveBeenCalledWith({
      num: "15%",
      title: "A new research fact",
      body: "Generated just now.",
      source: "ai",
    });
    expect(texts(renderer)).toEqual(
      expect.arrayContaining(["A new research fact"]),
    );
  });

  test("saves a member fact from the bottom form", async () => {
    const renderer = await renderScreen();
    await act(async () => {
      renderer.root.findByProps({
        accessibilityLabel: STATS_COPY.titleLabel,
      }).props.onChangeText("My own fact");
      renderer.root.findByProps({
        accessibilityLabel: STATS_COPY.bodyLabel,
      }).props.onChangeText("I read this in a paper.");
    });
    await act(async () => {
      await button(renderer, STATS_COPY.save).props.onPress();
    });
    expect(mockedCreate).toHaveBeenCalledWith({
      num: null,
      title: "My own fact",
      body: "I read this in a paper.",
      source: "member",
    });
  });
});
