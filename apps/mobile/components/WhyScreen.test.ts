import React from "react";
import {
  act,
  create,
  type ReactTestInstance,
  type ReactTestRenderer,
} from "react-test-renderer";
import { ScrollView, Text, TextInput } from "react-native";

import type { ReinforcementPhoto } from "../src/data/photos";
import type { WhyReason } from "../src/data/whyReasons";
import { quoteWhyReason, WHY_COPY } from "../src/presentation/why";

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
jest.mock("expo-image-picker", () => ({
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
}));
jest.mock("../src/data/sos", () => ({
  logSosEvent: jest.fn(async () => undefined),
}));
jest.mock("../src/data/whyReasons", () => ({
  createWhyReason: jest.fn(),
  fetchWhyReasons: jest.fn(),
}));
jest.mock("../src/data/photos", () => ({
  fetchPhotos: jest.fn(),
  removeReinforcementPhoto: jest.fn(),
  saveReinforcementPhoto: jest.fn(),
  updateReinforcementPhotoCaption: jest.fn(),
}));

import WhyScreen from "../app/(app)/sos/why";
import { fetchPhotos } from "../src/data/photos";
import { createWhyReason, fetchWhyReasons } from "../src/data/whyReasons";

const mockedFetchReasons = jest.mocked(fetchWhyReasons);
const mockedCreateReason = jest.mocked(createWhyReason);
const mockedFetchPhotos = jest.mocked(fetchPhotos);

const reasons: WhyReason[] = [
  { id: "r1", label: "My kids", sort_order: 0 },
  { id: "r2", label: "My health", sort_order: 1 },
  { id: "r3", label: "The person I want to be", sort_order: 2 },
];

const firstPhoto: ReinforcementPhoto = {
  id: "p1",
  user_id: "user-1",
  storage_key: "user-1/a.jpg",
  caption: "The day I finished.",
  tag: "remember_why",
  mode: "remember_why",
  favorited: false,
  created_at: "2026-09-07T12:00:00.000Z",
  signed_url: "https://example.test/a.jpg",
};

const secondPhoto: ReinforcementPhoto = {
  ...firstPhoto,
  id: "p2",
  storage_key: "user-1/b.jpg",
  caption: "Someone I admire.",
  signed_url: "https://example.test/b.jpg",
};

async function flush(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

async function renderScreen(): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(React.createElement(WhyScreen));
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

describe("WhyScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedFetchReasons.mockResolvedValue([]);
    mockedFetchPhotos.mockResolvedValue([]);
    mockedCreateReason.mockImplementation(async (label) => ({
      id: `r-${label}`,
      label,
      sort_order: 0,
    }));
  });

  test("uses the new Remember Your Why copy", async () => {
    const renderer = await renderScreen();
    expect(texts(renderer)).toEqual(
      expect.arrayContaining([
        WHY_COPY.title,
        WHY_COPY.subtitle,
        WHY_COPY.reasonsTitle,
        WHY_COPY.photosTitle,
        WHY_COPY.photosBody,
      ]),
    );
    expect(texts(renderer).join(" ")).not.toContain(
      "Reconnect with your reason",
    );
  });

  test("asks for three reasons before showing the top-reason pill", async () => {
    const renderer = await renderScreen();
    expect(texts(renderer)).toEqual(
      expect.arrayContaining([WHY_COPY.reasonsTitle, WHY_COPY.addReason]),
    );
    expect(texts(renderer)).not.toEqual(
      expect.arrayContaining([quoteWhyReason("My kids")]),
    );
  });

  test("keeps Save photo reachable when the caption keyboard is open", async () => {
    mockedFetchReasons.mockResolvedValue(reasons);
    const renderer = await renderScreen();
    const screen = renderer.root.findByType(ScrollView);
    expect(screen.props.automaticallyAdjustKeyboardInsets).toBe(true);
    expect(screen.props.keyboardDismissMode).toBe("interactive");

    const caption = renderer.root
      .findAllByType(TextInput)
      .find((node) => node.props.accessibilityLabel === WHY_COPY.captionLabel);
    expect(caption?.props.returnKeyType).toBe("done");
    expect(caption?.props.submitBehavior).toBe("blurAndSubmit");
  });

  test("shows the first reason in a quoted pill after three are saved", async () => {
    mockedFetchReasons.mockResolvedValue(reasons);
    const renderer = await renderScreen();
    expect(texts(renderer)).toEqual(
      expect.arrayContaining([
        WHY_COPY.topReasonLabel,
        quoteWhyReason("My kids"),
      ]),
    );
  });

  test("shows a saved photo, rotates it, and opens photo settings", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0);
    mockedFetchReasons.mockResolvedValue(reasons);
    mockedFetchPhotos.mockResolvedValue([firstPhoto, secondPhoto]);
    const renderer = await renderScreen();
    expect(texts(renderer)).toEqual(
      expect.arrayContaining([firstPhoto.caption!, WHY_COPY.rotate]),
    );

    await act(async () => {
      button(renderer, WHY_COPY.rotate).props.onPress();
    });
    expect(texts(renderer)).toEqual(
      expect.arrayContaining([secondPhoto.caption!]),
    );

    await act(async () => {
      renderer.root
        .findByProps({ accessibilityLabel: WHY_COPY.settingsLabel })
        .props.onPress();
    });
    expect(texts(renderer)).toEqual(
      expect.arrayContaining([WHY_COPY.settingsTitle]),
    );
    jest.spyOn(Math, "random").mockRestore();
  });
});
