import React from "react";
import {
  act,
  create,
  type ReactTestRenderer,
} from "react-test-renderer";
import { Text } from "react-native";

import {
  CHALLENGE_COPY,
  formatChallengeDuration,
} from "../src/presentation/otherTools";

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
    useLocalSearchParams: () => ({ id: "new" }),
    useRouter: () => mockRouter,
  };
});
jest.mock("expo-linking", () => ({
  canOpenURL: jest.fn(async () => true),
  openURL: jest.fn(async () => undefined),
}));
jest.mock("../src/data/groupChallenges", () => ({
  createGroupChallenge: jest.fn(),
  fetchGroupChallenges: jest.fn(),
}));

import ChallengeDetailScreen from "../app/(app)/tools/challenges/[id]";
import { createGroupChallenge } from "../src/data/groupChallenges";

const mockedCreate = jest.mocked(createGroupChallenge);

async function flush(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

describe("Challenge create page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedCreate.mockResolvedValue({
      id: "ch-1",
      duration_days: 30,
      buy_in: 20,
      created_at: "2026-09-07T12:00:00.000Z",
      invited_emails: [],
    });
  });

  test("creates a challenge on /new and shows the rules and prize copy", async () => {
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = create(React.createElement(ChallengeDetailScreen));
    });
    await flush();

    expect(mockedCreate).toHaveBeenCalled();
    const labels = renderer.root
      .findAllByType(Text)
      .map((node) => node.props.children)
      .flat(8)
      .filter((value): value is string => typeof value === "string");

    expect(labels).toEqual(
      expect.arrayContaining([
        CHALLENGE_COPY.title,
        CHALLENGE_COPY.subtitle,
        CHALLENGE_COPY.rules,
        formatChallengeDuration(30),
        CHALLENGE_COPY.logWeight,
        CHALLENGE_COPY.missRule,
        CHALLENGE_COPY.prize,
        CHALLENGE_COPY.prizeBody(20),
        CHALLENGE_COPY.invite,
      ]),
    );
  });
});
