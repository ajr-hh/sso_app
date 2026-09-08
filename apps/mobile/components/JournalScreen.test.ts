import React from "react";
import {
  act,
  create,
  type ReactTestInstance,
  type ReactTestRenderer,
} from "react-test-renderer";
import { ScrollView, StyleSheet, Text } from "react-native";

import {
  OTHER_TOOL_ROUTES,
  RESTAURANT_COPY,
} from "../src/presentation/otherTools";
import { colors } from "../src/theme/colors";

const mockRouter = {
  back: jest.fn(),
  canGoBack: jest.fn(() => true),
  navigate: jest.fn(),
  push: jest.fn(),
  replace: jest.fn(),
};

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
    useRouter: () => mockRouter,
  };
});
jest.mock("../src/data/journal", () => ({
  addJournalEntry: jest.fn(),
  deleteJournalEntry: jest.fn(),
  fetchJournal: jest.fn(),
  updateJournalEntry: jest.fn(),
}));

import JournalScreen from "../app/(app)/(tabs)/journal";
import { fetchJournal } from "../src/data/journal";

const mockedFetchJournal = jest.mocked(fetchJournal);

async function flush(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

async function renderScreen(): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(React.createElement(JournalScreen));
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

describe("JournalScreen Other tools", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedFetchJournal.mockResolvedValue([]);
  });

  test("puts Restaurant finder at the bottom as a black button", async () => {
    const renderer = await renderScreen();
    const finder = button(renderer, RESTAURANT_COPY.button);
    const style = StyleSheet.flatten(finder.props.style);

    expect(style.backgroundColor).toBe(colors.ink);

    const scroll = renderer.root.findByType(ScrollView);
    const lastChild = [...scroll.children]
      .reverse()
      .find((child): child is ReactTestInstance => typeof child !== "string");
    expect(
      lastChild
        ?.findAllByType(Text)
        .some(({ props }) => props.children === RESTAURANT_COPY.button),
    ).toBe(true);

    await act(async () => {
      finder.props.onPress();
    });
    expect(mockRouter.push).toHaveBeenCalledWith(OTHER_TOOL_ROUTES.restaurant);
  });
});
