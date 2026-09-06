import React from "react";
import {
  act,
  create,
  type ReactTestInstance,
  type ReactTestRenderer,
} from "react-test-renderer";
import {
  AccessibilityInfo,
  findNodeHandle,
  Modal,
  Text,
} from "react-native";

jest.mock("react-native", () => {
  const actual = jest.requireActual("react-native");
  const mocked = Object.create(actual);
  Object.defineProperties(mocked, {
    __esModule: { value: true },
    findNodeHandle: { value: jest.fn(() => 7) },
  });
  return mocked;
});

import type { CravingSwap } from "../src/data/cravingSwaps";
import type { Craving } from "../src/data/cravings";
import type { GeneratedSwap } from "../src/data/generate";
import type { Profile } from "../src/types";

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
      ReactModule.useEffect(callback, [callback]);
    },
    useLocalSearchParams: () => ({}),
    useRouter: () => mockRouter,
  };
});
jest.mock("../src/content/food-swaps", () => ({
  FOOD_SWAPS: {
    "Ice cream": ["Frozen yogurt bark", "Almond butter apple"],
  },
  FOOD_SWAP_TAGS: {
    "Frozen yogurt bark": ["dairy"],
    "Almond butter apple": ["nuts"],
  },
}));
jest.mock("../src/data/sos", () => ({ logSosEvent: jest.fn() }));
jest.mock("../src/data/profile", () => ({ fetchProfile: jest.fn() }));
jest.mock("../src/data/cravings", () => ({
  createCraving: jest.fn(),
  fetchCravings: jest.fn(),
}));
jest.mock("../src/data/cravingSwaps", () => ({
  createCravingSwap: jest.fn(),
  fetchCravingSwaps: jest.fn(),
  setSwapFavorited: jest.fn(),
}));
jest.mock("../src/data/generate", () => ({ generateFoodSwaps: jest.fn() }));

import FoodScreen from "../app/(app)/sos/food";
import {
  createCravingSwap,
  fetchCravingSwaps,
  setSwapFavorited,
} from "../src/data/cravingSwaps";
import { createCraving, fetchCravings } from "../src/data/cravings";
import { generateFoodSwaps } from "../src/data/generate";
import { fetchProfile } from "../src/data/profile";
import { logSosEvent } from "../src/data/sos";
import {
  FOOD_SCREEN_COPY,
  FOOD_SCREEN_ERRORS,
} from "../src/presentation/foodScreen";
import { ErrorBanner } from "./ErrorBanner";

const mockedCreateCraving = jest.mocked(createCraving);
const mockedCreateSwap = jest.mocked(createCravingSwap);
const mockedFetchCravings = jest.mocked(fetchCravings);
const mockedFetchProfile = jest.mocked(fetchProfile);
const mockedFetchSwaps = jest.mocked(fetchCravingSwaps);
const mockedGenerate = jest.mocked(generateFoodSwaps);
const mockedLogSosEvent = jest.mocked(logSosEvent);
const mockedSetFavorited = jest.mocked(setSwapFavorited);

const profile: Profile = {
  age: null,
  allergens: [],
  coach_style: "marcus",
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

const iceCream: Craving = { id: "craving-1", label: "Ice cream", sort_order: 0 };
const ramen: Craving = { id: "craving-2", label: "Ramen", sort_order: 1 };

function savedSwap(overrides: Partial<CravingSwap> = {}): CravingSwap {
  return {
    id: "swap-1",
    craving_id: iceCream.id,
    label: "Frozen yogurt bark",
    favorited: false,
    source: "catalog",
    rule_tags: ["dairy"],
    ...overrides,
  };
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

async function flush(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

async function renderScreen(): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(React.createElement(FoodScreen));
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

function banners(renderer: ReactTestRenderer): string[] {
  return renderer.root
    .findAllByType(ErrorBanner)
    .map(({ props }) => props.message as string);
}

function chips(renderer: ReactTestRenderer): ReactTestInstance[] {
  // deep: false stops at the outermost match so one chip is one instance.
  return renderer.root.findAllByProps(
    { accessibilityRole: "tab" },
    { deep: false },
  );
}

function text(renderer: ReactTestRenderer): string {
  return JSON.stringify(renderer.toJSON());
}

describe("Better Choices food screen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouter.canGoBack.mockReturnValue(true);
    mockedLogSosEvent.mockResolvedValue();
    mockedFetchProfile.mockResolvedValue(profile);
    mockedFetchCravings.mockResolvedValue([iceCream]);
    mockedFetchSwaps.mockResolvedValue([]);
    mockedSetFavorited.mockResolvedValue();
    let createdCount = 0;
    mockedCreateSwap.mockImplementation(async (input) => ({
      ...input,
      id: `created-${++createdCount}`,
    }));
    mockedCreateCraving.mockResolvedValue(ramen);
    mockedGenerate.mockResolvedValue([]);
  });

  test("keeps SOS logging and the back control", async () => {
    const renderer = await renderScreen();

    expect(mockedLogSosEvent).toHaveBeenCalledWith("off_the_rails", "food");
    expect(
      renderer.root.findByProps({ accessibilityLabel: "Go back" }),
    ).toBeDefined();
    expect(text(renderer)).toContain("BETTER CHOICES");
    expect(text(renderer)).toContain(FOOD_SCREEN_COPY.title);
  });

  test("sends members without food rules to Profile and loads no swaps", async () => {
    mockedFetchProfile.mockResolvedValue({ ...profile, food_rules_set: false });
    const renderer = await renderScreen();

    expect(text(renderer)).toContain(FOOD_SCREEN_COPY.needsRulesTitle);
    act(() =>
      button(renderer, FOOD_SCREEN_COPY.needsRulesButton).props.onPress(),
    );
    expect(mockRouter.navigate).toHaveBeenCalledWith("/(app)/(tabs)/profile");
    expect(mockRouter.push).not.toHaveBeenCalled();
    expect(mockedFetchSwaps).not.toHaveBeenCalled();
    expect(mockedGenerate).not.toHaveBeenCalled();
  });

  test("invites a first craving once rules are set", async () => {
    mockedFetchCravings.mockResolvedValue([]);
    const renderer = await renderScreen();

    expect(text(renderer)).toContain(FOOD_SCREEN_COPY.emptyCravingsTitle);
    expect(chips(renderer)).toHaveLength(0);
    expect(mockedFetchSwaps).not.toHaveBeenCalled();
    expect(button(renderer, FOOD_SCREEN_COPY.addCraving).props.disabled).toBe(
      false,
    );
  });

  test("disables adding a craving until the first load settles", async () => {
    const pending = deferred<Craving[]>();
    mockedFetchCravings.mockReturnValue(pending.promise);
    const renderer = await renderScreen();

    expect(button(renderer, FOOD_SCREEN_COPY.addCraving).props.disabled).toBe(
      true,
    );

    await act(async () => {
      pending.resolve([iceCream]);
      await pending.promise;
    });
    await flush();
    expect(button(renderer, FOOD_SCREEN_COPY.addCraving).props.disabled).toBe(
      false,
    );
  });

  test("selects the first craving and seeds its catalog swaps once", async () => {
    const seeded = [
      savedSwap({ id: "swap-1", label: "Frozen yogurt bark" }),
      savedSwap({
        id: "swap-2",
        label: "Almond butter apple",
        rule_tags: ["nuts"],
      }),
    ];
    mockedFetchSwaps.mockResolvedValueOnce([]).mockResolvedValueOnce(seeded);
    const renderer = await renderScreen();

    expect(chips(renderer)).toHaveLength(1);
    expect(chips(renderer)[0].props.accessibilityState).toEqual({
      selected: true,
    });
    expect(mockedCreateSwap).toHaveBeenCalledTimes(2);
    expect(mockedCreateSwap).toHaveBeenCalledWith({
      craving_id: iceCream.id,
      favorited: false,
      label: "Frozen yogurt bark",
      rule_tags: ["dairy"],
      source: "catalog",
    });
    expect(mockedFetchSwaps).toHaveBeenCalledTimes(2);
    expect(
      renderer.root.findByProps({
        accessibilityLabel: "Save Frozen yogurt bark",
      }),
    ).toBeDefined();
    expect(text(renderer)).not.toContain(FOOD_SCREEN_COPY.generateButton);
    expect(text(renderer)).not.toContain(FOOD_SCREEN_COPY.ingredientNote);
  });

  test("refetches instead of surfacing a duplicate seed insert", async () => {
    const existing = [savedSwap({ id: "swap-1" })];
    mockedFetchSwaps.mockResolvedValueOnce([]).mockResolvedValueOnce(existing);
    mockedCreateSwap.mockRejectedValueOnce(
      new Error(
        'duplicate key value violates unique constraint "craving_swaps_active_craving_label_idx"',
      ),
    );
    const renderer = await renderScreen();

    expect(banners(renderer)).toEqual([]);
    expect(text(renderer)).not.toContain("duplicate key");
    expect(
      renderer.root.findByProps({
        accessibilityLabel: "Save Frozen yogurt bark",
      }),
    ).toBeDefined();
  });

  test("reports a failed swap load with a retry that recovers", async () => {
    mockedFetchSwaps
      .mockRejectedValueOnce(new Error("relation craving_swaps does not exist"))
      .mockResolvedValueOnce([savedSwap()]);
    const renderer = await renderScreen();

    expect(banners(renderer)).toEqual([FOOD_SCREEN_ERRORS.swaps]);
    await act(async () =>
      renderer.root
        .findByProps({ accessibilityLabel: "Reload swaps" })
        .props.onPress(),
    );
    await flush();
    expect(banners(renderer)).toEqual([]);
    expect(text(renderer)).toContain("Frozen yogurt bark");
  });

  test("never calls the model until Get swap ideas is tapped", async () => {
    mockedFetchCravings.mockResolvedValue([ramen]);
    const generated: GeneratedSwap[] = [
      { label: "Broth with greens", ruleTags: [] },
      { label: "Egg drop soup", ruleTags: ["eggs"] },
      { label: "Miso and tofu", ruleTags: ["soy"] },
      { label: "Zucchini noodles", ruleTags: [] },
    ];
    const pending = deferred<GeneratedSwap[]>();
    mockedGenerate.mockReturnValue(pending.promise);
    const renderer = await renderScreen();

    expect(mockedGenerate).not.toHaveBeenCalled();
    expect(mockedCreateSwap).not.toHaveBeenCalled();
    expect(text(renderer)).toContain(FOOD_SCREEN_COPY.ingredientNote);

    act(() =>
      button(renderer, FOOD_SCREEN_COPY.generateButton).props.onPress(),
    );
    expect(mockedGenerate).toHaveBeenCalledWith({
      cravingLabel: "Ramen",
      rules: { foodRulesSet: true, dietFlags: [], allergens: [] },
    });
    expect(
      button(renderer, FOOD_SCREEN_COPY.generateBusyButton).props.disabled,
    ).toBe(true);

    await act(async () => {
      pending.resolve(generated);
      await pending.promise;
    });
    await flush();

    expect(mockedCreateSwap).toHaveBeenCalledTimes(4);
    expect(mockedCreateSwap).toHaveBeenCalledWith({
      craving_id: ramen.id,
      favorited: false,
      label: "Egg drop soup",
      rule_tags: ["eggs"],
      source: "ai",
    });
    expect(text(renderer)).toContain("Zucchini noodles");
    expect(text(renderer)).toContain(FOOD_SCREEN_COPY.ingredientNote);
  });

  test("shows a generation failure without inventing rows", async () => {
    mockedFetchCravings.mockResolvedValue([ramen]);
    mockedGenerate.mockRejectedValueOnce(
      new Error("Couldn't get swap ideas right now. Try again."),
    );
    const renderer = await renderScreen();

    await act(async () =>
      button(renderer, FOOD_SCREEN_COPY.generateButton).props.onPress(),
    );
    await flush();

    expect(banners(renderer)).toEqual([
      "Couldn't get swap ideas right now. Try again.",
    ]);
    expect(mockedCreateSwap).not.toHaveBeenCalled();
    expect(button(renderer, FOOD_SCREEN_COPY.generateButton).props.disabled).toBe(
      false,
    );
  });

  test("waits for the server before showing a swap as saved", async () => {
    mockedFetchSwaps.mockResolvedValue([savedSwap()]);
    const pending = deferred<void>();
    mockedSetFavorited.mockReturnValue(pending.promise);
    const renderer = await renderScreen();

    act(() =>
      renderer.root
        .findByProps({ accessibilityLabel: "Save Frozen yogurt bark" })
        .props.onPress(),
    );
    expect(mockedSetFavorited).toHaveBeenCalledWith("swap-1", true);
    expect(
      renderer.root.findByProps({
        accessibilityLabel: "Save Frozen yogurt bark",
      }).props.accessibilityState,
    ).toEqual({ busy: true, selected: false });

    await act(async () => {
      pending.resolve();
      await pending.promise;
    });
    expect(
      renderer.root.findByProps({
        accessibilityLabel: "Remove save on Frozen yogurt bark",
      }),
    ).toBeDefined();
  });

  test("leaves the star alone when saving fails", async () => {
    mockedFetchSwaps.mockResolvedValue([savedSwap()]);
    mockedSetFavorited.mockRejectedValueOnce(new Error("permission denied"));
    const renderer = await renderScreen();

    await act(async () =>
      renderer.root
        .findByProps({ accessibilityLabel: "Save Frozen yogurt bark" })
        .props.onPress(),
    );

    expect(banners(renderer)).toEqual([FOOD_SCREEN_ERRORS.favorite]);
    expect(text(renderer)).not.toContain("permission denied");
    expect(
      renderer.root.findByProps({
        accessibilityLabel: "Save Frozen yogurt bark",
      }),
    ).toBeDefined();
  });

  test("persists a catalog row that has no saved row when it is starred", async () => {
    mockedFetchSwaps.mockResolvedValue([savedSwap({ id: "swap-1" })]);
    const renderer = await renderScreen();

    await act(async () =>
      renderer.root
        .findByProps({ accessibilityLabel: "Save Almond butter apple" })
        .props.onPress(),
    );

    expect(mockedSetFavorited).not.toHaveBeenCalled();
    expect(mockedCreateSwap).toHaveBeenCalledWith({
      craving_id: iceCream.id,
      favorited: true,
      label: "Almond butter apple",
      rule_tags: ["nuts"],
      source: "catalog",
    });
    expect(
      renderer.root.findByProps({
        accessibilityLabel: "Remove save on Almond butter apple",
      }),
    ).toBeDefined();
  });

  test("offers a custom swap when every catalog idea breaks the rules", async () => {
    mockedFetchProfile.mockResolvedValue({
      ...profile,
      allergens: ["nuts"],
      diet_flags: ["dairy_free"],
    });
    const renderer = await renderScreen();

    expect(text(renderer)).toContain(FOOD_SCREEN_COPY.filteredOut);
    expect(text(renderer)).toContain(FOOD_SCREEN_COPY.ingredientNote);
    expect(mockedCreateSwap).not.toHaveBeenCalled();

    await act(async () =>
      renderer.root
        .findByProps({ accessibilityLabel: FOOD_SCREEN_COPY.customSwapLabel })
        .props.onChangeText("  Frozen grapes  "),
    );
    await act(async () =>
      button(renderer, FOOD_SCREEN_COPY.customSwapButton).props.onPress(),
    );

    expect(mockedCreateSwap).toHaveBeenCalledWith({
      craving_id: iceCream.id,
      favorited: true,
      label: "Frozen grapes",
      rule_tags: [],
      source: "custom",
    });
    expect(text(renderer)).toContain("Frozen grapes");
  });

  test("validates an empty custom swap before calling the server", async () => {
    mockedFetchProfile.mockResolvedValue({
      ...profile,
      allergens: ["nuts"],
      diet_flags: ["dairy_free"],
    });
    const renderer = await renderScreen();

    await act(async () =>
      button(renderer, FOOD_SCREEN_COPY.customSwapButton).props.onPress(),
    );
    expect(mockedCreateSwap).not.toHaveBeenCalled();
    expect(banners(renderer)).toEqual(["Enter a swap."]);
  });

  test("keeps a stale swap load from overwriting the selected craving", async () => {
    mockedFetchCravings.mockResolvedValue([iceCream, ramen]);
    const stale = deferred<CravingSwap[]>();
    mockedFetchSwaps.mockReturnValueOnce(stale.promise).mockResolvedValue([
      savedSwap({
        id: "swap-9",
        craving_id: ramen.id,
        label: "Broth with greens",
        rule_tags: [],
        source: "ai",
      }),
    ]);
    const renderer = await renderScreen();

    await act(async () => chips(renderer)[1].props.onPress());
    await flush();
    expect(text(renderer)).toContain("Broth with greens");

    await act(async () => {
      stale.resolve([savedSwap({ id: "swap-1" })]);
      await stale.promise;
    });
    await flush();

    expect(text(renderer)).toContain("Broth with greens");
    expect(text(renderer)).not.toContain("Save Frozen yogurt bark");
    expect(chips(renderer)[1].props.accessibilityState).toEqual({
      selected: true,
    });
  });

  test("selects a newly added craving and loads its swaps", async () => {
    const renderer = await renderScreen();
    mockedFetchSwaps.mockClear();

    act(() => button(renderer, FOOD_SCREEN_COPY.addCraving).props.onPress());
    await act(async () =>
      renderer.root
        .findByProps({ accessibilityLabel: "Craving name" })
        .props.onChangeText("Ramen"),
    );
    await act(async () => button(renderer, "Add craving").props.onPress());
    await flush();

    expect(mockedCreateCraving).toHaveBeenCalledWith("Ramen");
    expect(chips(renderer)).toHaveLength(2);
    expect(chips(renderer)[1].props.accessibilityState).toEqual({
      selected: true,
    });
    expect(mockedFetchSwaps).toHaveBeenCalledWith(ramen.id);
  });

  test("returns accessibility focus to the add trigger after the flyout closes", async () => {
    const restore = jest
      .spyOn(AccessibilityInfo, "setAccessibilityFocus")
      .mockImplementation();
    (findNodeHandle as jest.Mock).mockClear();
    const renderer = await renderScreen();

    act(() => button(renderer, FOOD_SCREEN_COPY.addCraving).props.onPress());
    expect(renderer.root.findByType(Modal).props.visible).toBe(true);

    act(() => button(renderer, "Cancel").props.onPress());
    expect(restore).not.toHaveBeenCalled();

    act(() => renderer.root.findByType(Modal).props.onDismiss());
    expect(restore).toHaveBeenCalledWith(7);
    expect(restore).toHaveBeenCalledTimes(1);
    restore.mockRestore();
  });

  test("keeps a failed craving add generic", async () => {
    mockedCreateCraving.mockRejectedValueOnce(
      new Error("duplicate key value violates unique constraint"),
    );
    const renderer = await renderScreen();

    act(() => button(renderer, FOOD_SCREEN_COPY.addCraving).props.onPress());
    await act(async () =>
      renderer.root
        .findByProps({ accessibilityLabel: "Craving name" })
        .props.onChangeText("Ramen"),
    );
    await act(async () => button(renderer, "Add craving").props.onPress());

    expect(text(renderer)).toContain(FOOD_SCREEN_ERRORS.addCraving);
    expect(text(renderer)).not.toContain("duplicate key");
  });

  test("retries a failed food rules load before loading swaps", async () => {
    mockedFetchProfile
      .mockRejectedValueOnce(new Error("relation profiles does not exist"))
      .mockResolvedValueOnce(profile);
    const renderer = await renderScreen();

    expect(banners(renderer)).toEqual([FOOD_SCREEN_ERRORS.rules]);
    expect(mockedFetchSwaps).not.toHaveBeenCalled();

    await act(async () =>
      renderer.root
        .findByProps({ accessibilityLabel: "Reload your food rules" })
        .props.onPress(),
    );
    await flush();
    expect(banners(renderer)).toEqual([]);
    expect(mockedFetchSwaps).toHaveBeenCalledWith(iceCream.id);
  });
});
