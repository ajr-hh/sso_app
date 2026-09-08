import React from "react";
import {
  act,
  create,
  type ReactTestInstance,
  type ReactTestRenderer,
} from "react-test-renderer";
import { StyleSheet, Text } from "react-native";

import { MaterialSymbol } from "./MaterialSymbol";
import { CHALLENGE_COPY, OTHER_TOOL_ROUTES } from "../src/presentation/otherTools";
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
jest.mock("../src/data/community", () => ({
  createPost: jest.fn(),
  deletePost: jest.fn(),
  fetchPosts: jest.fn(),
}));
jest.mock("../src/lib/session", () => ({
  getSession: jest.fn(),
}));

import CommunityScreen from "../app/(app)/(tabs)/community";
import { fetchPosts } from "../src/data/community";
import { getSession } from "../src/lib/session";

const mockedFetchPosts = jest.mocked(fetchPosts);
const mockedGetSession = jest.mocked(getSession);

async function flush(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

async function renderScreen(): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(React.createElement(CommunityScreen));
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

describe("CommunityScreen Other tools", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedFetchPosts.mockResolvedValue([]);
    mockedGetSession.mockResolvedValue({ user: { id: "user-1" } } as never);
  });

  test("opens Join a challenge from a black tile with the trophy icon", async () => {
    const renderer = await renderScreen();
    const tile = button(renderer, CHALLENGE_COPY.joinLabel);
    const style = StyleSheet.flatten(tile.props.style);

    expect(style.backgroundColor).toBe(colors.ink);

    const trophy = tile
      .findAllByType(MaterialSymbol)
      .find((node) => node.props.name === "emoji_events");
    expect(trophy?.props.color).toBe(colors.ember);
    const badge = trophy?.parent;
    expect(StyleSheet.flatten(badge?.props.style).backgroundColor).toBe(
      colors.emberTint,
    );

    await act(async () => {
      tile.props.onPress();
    });
    expect(mockRouter.push).toHaveBeenCalledWith(OTHER_TOOL_ROUTES.challenge);
  });
});
