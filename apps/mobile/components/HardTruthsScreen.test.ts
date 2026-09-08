import React from "react";
import {
  act,
  create,
  type ReactTestInstance,
  type ReactTestRenderer,
} from "react-test-renderer";
import { ScrollView, Text } from "react-native";
import * as ImagePicker from "expo-image-picker";

import type { ReinforcementPhoto } from "../src/data/photos";
import type { Profile } from "../src/types";
import {
  getCoachNoFilterLabel,
  getFavoritePhotoLabel,
  getHardTruthTaggedLabel,
  HARD_TRUTHS_COPY,
  quoteHardTruthCaption,
} from "../src/presentation/hardTruths";
import { getCoachName } from "../src/presentation/coaches";

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
  launchImageLibraryAsync: jest.fn(),
}));
jest.mock("../src/data/sos", () => ({
  logSosEvent: jest.fn(async () => undefined),
}));
jest.mock("../src/data/photos", () => ({
  fetchPhotos: jest.fn(),
  saveReinforcementPhoto: jest.fn(),
  setPhotoFavorited: jest.fn(),
}));
jest.mock("../src/data/profile", () => ({
  fetchProfile: jest.fn(),
}));
jest.mock("../src/data/hardTruthsCoach", () => ({
  fetchHardTruthsCoachLine: jest.fn(),
  generateHardTruthsCoachLine: jest.fn(),
  saveHardTruthsCoachLine: jest.fn(),
}));

import HardTruthsScreen from "../app/(app)/sos/hard-truths";
import { fetchProfile } from "../src/data/profile";
import {
  fetchPhotos,
  setPhotoFavorited,
} from "../src/data/photos";
import {
  fetchHardTruthsCoachLine,
  generateHardTruthsCoachLine,
  saveHardTruthsCoachLine,
} from "../src/data/hardTruthsCoach";

const mockedFetchProfile = jest.mocked(fetchProfile);
const mockedFetchPhotos = jest.mocked(fetchPhotos);
const mockedFavorite = jest.mocked(setPhotoFavorited);
const mockedPicker = jest.mocked(ImagePicker.launchImageLibraryAsync);
const mockedFetchLine = jest.mocked(fetchHardTruthsCoachLine);
const mockedGenerateLine = jest.mocked(generateHardTruthsCoachLine);
const mockedSaveLine = jest.mocked(saveHardTruthsCoachLine);

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

const proud: ReinforcementPhoto = {
  id: "p1",
  user_id: "user-1",
  storage_key: "user-1/a.jpg",
  caption:
    "Walking my daughter down the aisle without stopping to catch my breath.",
  tag: "proud_of_this",
  mode: "hard_truths",
  favorited: false,
  created_at: "2026-09-07T12:00:00.000Z",
  signed_url: "https://example.test/a.jpg",
};

const neverAgain: ReinforcementPhoto = {
  ...proud,
  id: "p2",
  storage_key: "user-1/b.jpg",
  caption: "The night before my physical, dreading the scale. Not doing that again.",
  tag: "never_again",
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
    renderer = create(React.createElement(HardTruthsScreen));
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

describe("HardTruthsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedFetchProfile.mockResolvedValue(profile);
    mockedFetchPhotos.mockResolvedValue([]);
    mockedFetchLine.mockResolvedValue(null);
    mockedGenerateLine.mockResolvedValue(HARD_TRUTHS_COPY.coachDefault);
    mockedSaveLine.mockResolvedValue({
      id: "line-1",
      coach_style: "sam",
      body: HARD_TRUTHS_COPY.coachDefault,
    });
    mockedFavorite.mockResolvedValue(undefined);
  });

  test("uses the Hard Truths copy and the picked coach", async () => {
    const renderer = await renderScreen();
    expect(texts(renderer)).toEqual(
      expect.arrayContaining([
        HARD_TRUTHS_COPY.title,
        HARD_TRUTHS_COPY.subtitle,
        getCoachNoFilterLabel(getCoachName("sam")),
        HARD_TRUTHS_COPY.coachDefault,
        HARD_TRUTHS_COPY.yourCallEyebrow,
        HARD_TRUTHS_COPY.yourCallBody,
        HARD_TRUTHS_COPY.photosTitle,
        HARD_TRUTHS_COPY.addBody,
        HARD_TRUTHS_COPY.proud,
        HARD_TRUTHS_COPY.never,
        HARD_TRUTHS_COPY.upload,
        HARD_TRUTHS_COPY.footnote,
        HARD_TRUTHS_COPY.backOnTrack,
      ]),
    );
    expect(texts(renderer).join(" ")).not.toContain("Remember what changed");
    expect(mockedGenerateLine).toHaveBeenCalledWith("sam");
    expect(mockedSaveLine).toHaveBeenCalledWith({
      coachStyle: "sam",
      body: HARD_TRUTHS_COPY.coachDefault,
    });
  });

  test("shows saved photos with tag, caption, and a favorite control", async () => {
    mockedFetchPhotos.mockResolvedValue([proud, neverAgain]);
    const renderer = await renderScreen();
    expect(texts(renderer)).toEqual(
      expect.arrayContaining([
        getHardTruthTaggedLabel("proud_of_this"),
        HARD_TRUTHS_COPY.yourCaption,
        quoteHardTruthCaption(proud.caption!),
        getHardTruthTaggedLabel("never_again"),
        quoteHardTruthCaption(neverAgain.caption!),
      ]),
    );

    await act(async () => {
      renderer.root
        .findByProps({
          accessibilityLabel: getFavoritePhotoLabel(proud.caption!, false),
        })
        .props.onPress();
    });
    expect(mockedFavorite).toHaveBeenCalledWith("p1", true);
  });

  test("keeps Save photo reachable when the caption keyboard is open", async () => {
    mockedPicker.mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///truth.jpg", width: 800 }],
    } as never);
    const renderer = await renderScreen();
    await act(async () => {
      await button(renderer, HARD_TRUTHS_COPY.upload).props.onPress();
    });
    await flush();

    expect(
      renderer.root.findByType(ScrollView).props.automaticallyAdjustKeyboardInsets,
    ).toBe(true);
    const caption = renderer.root.findByProps({
      accessibilityLabel: HARD_TRUTHS_COPY.captionLabel,
    });
    expect(caption.props.returnKeyType).toBe("done");
    expect(caption.props.submitBehavior).toBe("blurAndSubmit");
  });

  test("takes them home from Okay. Back on track", async () => {
    const renderer = await renderScreen();
    await act(async () => {
      button(renderer, HARD_TRUTHS_COPY.backOnTrack).props.onPress();
    });
    expect(mockRouter.navigate).toHaveBeenCalledWith("/(app)/(tabs)/home");
  });
});
