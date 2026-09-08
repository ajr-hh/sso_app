import React from "react";
import {
  act,
  create,
  type ReactTestInstance,
  type ReactTestRenderer,
} from "react-test-renderer";
import { ScrollView, Text } from "react-native";

import type {
  AccountabilityContact,
  CreateAccountabilityContactInput,
} from "../src/data/accountabilityContacts";
import type { Craving } from "../src/data/cravings";
import type { Profile } from "../src/types";

jest.mock("../src/data/accountabilityContacts", () => ({
  createAccountabilityContact: jest.fn(),
  fetchAccountabilityContacts: jest.fn(),
  removeAccountabilityContact: jest.fn(),
}));
jest.mock("../src/data/profile", () => ({
  fetchProfile: jest.fn(),
  saveProfile: jest.fn(),
}));
jest.mock("../src/data/cravings", () => ({
  createCraving: jest.fn(),
  fetchCravings: jest.fn(),
  removeCraving: jest.fn(),
}));
jest.mock("../src/lib/session", () => ({
  signOut: jest.fn(),
}));
jest.mock("./FoodRulesSection", () => {
  const ReactModule = jest.requireActual("react") as typeof React;
  return {
    FoodRulesSection: (props: Record<string, unknown>) =>
      ReactModule.createElement("FoodRulesSection", props),
  };
});
jest.mock("./UsualCravingsSection", () => {
  const ReactModule = jest.requireActual("react") as typeof React;
  return {
    UsualCravingsSection: (props: Record<string, unknown>) =>
      ReactModule.createElement("UsualCravingsSection", props),
  };
});
const mockSetParams = jest.fn();
let mockProfileSection: string | string[] | undefined;
let mockFocusCallback: (() => undefined | (() => void)) | null = null;

jest.mock("expo-router", () => {
  const ReactModule = jest.requireActual("react") as typeof React;
  return {
    useFocusEffect: (callback: () => undefined | (() => void)) => {
      ReactModule.useEffect(() => {
        mockFocusCallback = callback;
        return () => {
          mockFocusCallback = null;
        };
      }, [callback]);
    },
    useLocalSearchParams: () => ({ section: mockProfileSection }),
    useRouter: () => ({ push: jest.fn(), setParams: mockSetParams }),
  };
});

jest.mock("./YourPeopleSection", () => {
  const ReactModule = jest.requireActual("react") as typeof React;
  return {
    YourPeopleSection: (props: Record<string, unknown>) =>
      ReactModule.createElement("YourPeopleSection", props),
  };
});

import ProfileScreen from "../app/(app)/(tabs)/profile";
import {
  createAccountabilityContact,
  fetchAccountabilityContacts,
  removeAccountabilityContact,
} from "../src/data/accountabilityContacts";
import {
  createCraving,
  fetchCravings,
  removeCraving,
} from "../src/data/cravings";
import { fetchProfile, saveProfile } from "../src/data/profile";
import { signOut } from "../src/lib/session";
import { PROFILE_LOG_OUT } from "../src/presentation/profile";
import type { FoodRulesSectionProps } from "./FoodRulesSection";
import type { UsualCravingsSectionProps } from "./UsualCravingsSection";
import type { YourPeopleSectionProps } from "./YourPeopleSection";

const mockedCreateContact = jest.mocked(createAccountabilityContact);
const mockedFetchContacts = jest.mocked(fetchAccountabilityContacts);
const mockedRemoveContact = jest.mocked(removeAccountabilityContact);
const mockedCreateCraving = jest.mocked(createCraving);
const mockedFetchCravings = jest.mocked(fetchCravings);
const mockedRemoveCraving = jest.mocked(removeCraving);
const mockedFetchProfile = jest.mocked(fetchProfile);
const mockedSaveProfile = jest.mocked(saveProfile);
const mockedSignOut = jest.mocked(signOut);

const profile: Profile = {
  age: 40,
  allergens: [],
  coach_style: "marcus",
  coach_style_set: false,
  diet_flags: [],
  display_name: "Alex",
  email: "alex@example.test",
  food_rules_set: false,
  id: "user-1",
  motivators: "Better Choices",
  phone: null,
  rail_order: [],
  why_matters: "Health",
};

const contact: AccountabilityContact = {
  email: "jamie@example.test",
  id: "contact-1",
  name: "Jamie Rivera",
  phone: "555-867-5309",
  relationship: "friend",
};
const craving: Craving = { id: "craving-1", label: "Pizza", sort_order: 0 };

const input: CreateAccountabilityContactInput = {
  email: contact.email,
  name: contact.name,
  phone: contact.phone,
  relationship: contact.relationship,
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

async function renderScreen(): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(React.createElement(ProfileScreen));
    await Promise.resolve();
  });
  return renderer;
}

async function returnToProfile(): Promise<void> {
  await act(async () => {
    mockFocusCallback?.();
    await Promise.resolve();
  });
}

function peopleProps(renderer: ReactTestRenderer): YourPeopleSectionProps {
  return renderer.root.findByType(
    "YourPeopleSection" as unknown as React.ElementType,
  ).props as YourPeopleSectionProps;
}

function foodRulesProps(renderer: ReactTestRenderer): FoodRulesSectionProps {
  return renderer.root.findByType(
    "FoodRulesSection" as unknown as React.ElementType,
  ).props as FoodRulesSectionProps;
}

function cravingsProps(
  renderer: ReactTestRenderer,
): UsualCravingsSectionProps {
  return renderer.root.findByType(
    "UsualCravingsSection" as unknown as React.ElementType,
  ).props as UsualCravingsSectionProps;
}

function buttonByText(
  renderer: ReactTestRenderer,
  label: string,
): ReactTestInstance {
  const button = renderer.root
    .findAllByProps({ accessibilityRole: "button" })
    .find((candidate) =>
      candidate
        .findAllByType(Text)
        .some((text) => text.props.children === label),
    );
  if (!button) throw new Error(`Missing button "${label}".`);
  return button;
}

async function captureRejection(operation: () => Promise<unknown>) {
  let caught: unknown;
  await act(async () => {
    try {
      await operation();
    } catch (error) {
      caught = error;
    }
  });
  expect(caught).toBeInstanceOf(Error);
  return caught as Error;
}

describe("ProfileScreen contact orchestration", () => {
  beforeEach(() => {
    mockProfileSection = undefined;
    mockFocusCallback = null;
    jest.clearAllMocks();
    mockedFetchProfile.mockResolvedValue(profile);
    mockedFetchContacts.mockResolvedValue([]);
    mockedCreateContact.mockResolvedValue(contact);
    mockedRemoveContact.mockResolvedValue();
    mockedFetchCravings.mockResolvedValue([]);
    mockedCreateCraving.mockResolvedValue(craving);
    mockedRemoveCraving.mockResolvedValue();
    mockedSaveProfile.mockResolvedValue();
    mockedSignOut.mockResolvedValue();
  });

  test("renders the profile while contacts load independently", async () => {
    const pendingContacts = deferred<AccountabilityContact[]>();
    mockedFetchContacts.mockReturnValue(pendingContacts.promise);

    const renderer = await renderScreen();

    expect(JSON.stringify(renderer.toJSON())).toContain("Alex");
    expect(peopleProps(renderer).loading).toBe(true);

    await act(async () => {
      pendingContacts.resolve([]);
      await pendingContacts.promise;
    });
    expect(peopleProps(renderer).loading).toBe(false);
  });

  test("does not let an in-flight load overwrite a created contact", async () => {
    const staleLoad = deferred<AccountabilityContact[]>();
    mockedFetchContacts.mockReturnValue(staleLoad.promise);
    const renderer = await renderScreen();

    await act(async () => {
      await peopleProps(renderer).onCreate(input);
    });
    expect(peopleProps(renderer).contacts).toEqual([contact]);

    await act(async () => {
      staleLoad.resolve([]);
      await staleLoad.promise;
    });
    expect(peopleProps(renderer).contacts).toEqual([contact]);
    expect(peopleProps(renderer).loading).toBe(false);
  });

  test("does not let an in-flight reload restore a removed contact", async () => {
    const staleReload = deferred<AccountabilityContact[]>();
    mockedFetchContacts
      .mockResolvedValueOnce([contact])
      .mockReturnValueOnce(staleReload.promise);
    const renderer = await renderScreen();
    expect(peopleProps(renderer).contacts).toEqual([contact]);

    act(() => {
      peopleProps(renderer).onRetry();
    });
    await act(async () => {
      await peopleProps(renderer).onRemove(contact);
    });
    expect(peopleProps(renderer).contacts).toEqual([]);

    await act(async () => {
      staleReload.resolve([contact]);
      await staleReload.promise;
    });
    expect(peopleProps(renderer).contacts).toEqual([]);
  });

  test("ignores a stale retry started during a pending create", async () => {
    const pendingCreate = deferred<AccountabilityContact>();
    const staleRetry = deferred<AccountabilityContact[]>();
    mockedCreateContact.mockReturnValue(pendingCreate.promise);
    mockedFetchContacts
      .mockResolvedValueOnce([])
      .mockReturnValueOnce(staleRetry.promise);
    const renderer = await renderScreen();

    let createPromise!: Promise<AccountabilityContact>;
    act(() => {
      createPromise = peopleProps(renderer).onCreate(input);
      peopleProps(renderer).onRetry();
    });

    await act(async () => {
      pendingCreate.resolve(contact);
      await createPromise;
    });
    expect(peopleProps(renderer).contacts).toEqual([contact]);

    await act(async () => {
      staleRetry.resolve([]);
      await staleRetry.promise;
    });
    expect(peopleProps(renderer).contacts).toEqual([contact]);
  });

  test("ignores a stale retry started during a pending remove", async () => {
    const pendingRemove = deferred<void>();
    const staleRetry = deferred<AccountabilityContact[]>();
    mockedRemoveContact.mockReturnValue(pendingRemove.promise);
    mockedFetchContacts
      .mockResolvedValueOnce([contact])
      .mockReturnValueOnce(staleRetry.promise);
    const renderer = await renderScreen();

    let removePromise!: Promise<void>;
    act(() => {
      removePromise = peopleProps(renderer).onRemove(contact);
      peopleProps(renderer).onRetry();
    });

    await act(async () => {
      pendingRemove.resolve();
      await removePromise;
    });
    expect(peopleProps(renderer).contacts).toEqual([]);

    await act(async () => {
      staleRetry.resolve([contact]);
      await staleRetry.promise;
    });
    expect(peopleProps(renderer).contacts).toEqual([]);
  });

  test("labels motivation chips with their own names, not coach names", async () => {
    const renderer = await renderScreen();
    const labels = renderer.root
      .findAllByType(Text)
      .map((node) => node.props.children)
      .flat(Infinity)
      .filter((value): value is string => typeof value === "string");

    expect(labels).toEqual(
      expect.arrayContaining(["Better Choices", "Hard Truths", "Marcus"]),
    );
    expect(labels.filter((label) => label === "Marcus")).toHaveLength(1);
  });

  test("blocks saving a legacy motivator with an actionable error", async () => {
    mockedFetchProfile.mockResolvedValue({
      ...profile,
      motivators: "Family",
    });
    const renderer = await renderScreen();

    await act(async () => {
      buttonByText(renderer, "Save profile").props.onPress();
    });

    expect(mockedSaveProfile).not.toHaveBeenCalled();
    expect(JSON.stringify(renderer.toJSON())).toContain(
      "Choose how you want to be motivated.",
    );
  });

  test("updates contacts only after successful mutations", async () => {
    mockedFetchContacts.mockResolvedValue([contact]);
    const renderer = await renderScreen();
    const second = { ...contact, id: "contact-2", name: "Morgan Rivera" };

    mockedCreateContact.mockRejectedValueOnce(new Error("schema cache miss"));
    const createError = await captureRejection(() =>
      peopleProps(renderer).onCreate({ ...input, name: second.name }),
    );
    expect(createError.message).toBe(
      "We couldn’t add Morgan Rivera. Error: schema cache miss",
    );
    expect(peopleProps(renderer).contacts).toEqual([contact]);

    mockedCreateContact.mockResolvedValueOnce(second);
    await act(async () => {
      await peopleProps(renderer).onCreate({ ...input, name: second.name });
    });
    expect(peopleProps(renderer).contacts).toEqual([contact, second]);

    mockedRemoveContact.mockRejectedValueOnce(new Error("permission denied"));
    const removeError = await captureRejection(() =>
      peopleProps(renderer).onRemove(contact),
    );
    expect(removeError.message).toBe(
      "We couldn’t remove Jamie Rivera. Error: permission denied",
    );
    expect(peopleProps(renderer).contacts).toEqual([contact, second]);

    await act(async () => {
      await peopleProps(renderer).onRemove(contact);
    });
    expect(peopleProps(renderer).contacts).toEqual([second]);
  });

  test("separates load errors from controlled mutation errors", async () => {
    mockedFetchContacts.mockRejectedValueOnce(
      new Error("relation accountability_contacts does not exist"),
    );
    const renderer = await renderScreen();

    expect(peopleProps(renderer).loadError).toBe(
      "We couldn’t load your people. Try again.",
    );

    mockedCreateContact.mockRejectedValueOnce(new Error("raw insert failure"));
    const createError = await captureRejection(() =>
      peopleProps(renderer).onCreate(input),
    );
    expect(createError.message).toBe(
      "We couldn’t add Jamie Rivera. Error: raw insert failure",
    );
    expect(peopleProps(renderer).loadError).toBe(
      "We couldn’t load your people. Try again.",
    );
  });

  test("explains network and server mutation failures and keeps the cause", async () => {
    mockedFetchContacts.mockResolvedValue([contact]);
    const renderer = await renderScreen();

    const offline = new TypeError("Network request failed");
    mockedCreateContact.mockRejectedValueOnce(offline);
    const createError = await captureRejection(() =>
      peopleProps(renderer).onCreate(input),
    );
    expect(createError.message).toBe(
      "We couldn’t add Jamie Rivera. Couldn't reach the server. Check your connection.",
    );
    expect(createError.cause).toBe(offline);

    const denied = new Error("permission denied for table");
    mockedRemoveContact.mockRejectedValueOnce(denied);
    const removeError = await captureRejection(() =>
      peopleProps(renderer).onRemove(contact),
    );
    expect(removeError.message).toBe(
      "We couldn’t remove Jamie Rivera. Error: permission denied for table",
    );
    expect(removeError.cause).toBe(denied);
    expect(peopleProps(renderer).loadError).toBeNull();
    expect(peopleProps(renderer).contacts).toEqual([contact]);
  });

  test("keeps the load error until an applicable load succeeds", async () => {
    mockedFetchContacts.mockRejectedValueOnce(
      new Error("relation accountability_contacts does not exist"),
    );
    const renderer = await renderScreen();
    expect(peopleProps(renderer).loadError).toBe(
      "We couldn’t load your people. Try again.",
    );

    const invalidatedRetry = deferred<AccountabilityContact[]>();
    mockedFetchContacts.mockReturnValueOnce(invalidatedRetry.promise);
    let createPromise!: Promise<AccountabilityContact>;
    act(() => {
      peopleProps(renderer).onRetry();
      createPromise = peopleProps(renderer).onCreate(input);
    });
    await act(async () => {
      await createPromise;
    });
    await act(async () => {
      invalidatedRetry.resolve([]);
      await invalidatedRetry.promise;
    });
    expect(peopleProps(renderer).contacts).toEqual([contact]);
    expect(peopleProps(renderer).loadError).toBe(
      "We couldn’t load your people. Try again.",
    );

    mockedFetchContacts.mockResolvedValueOnce([contact]);
    await act(async () => {
      peopleProps(renderer).onRetry();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(peopleProps(renderer).loadError).toBeNull();
  });

  test("clears stale status at mutation start and identifies every success", async () => {
    const renderer = await renderScreen();

    await act(async () => {
      await peopleProps(renderer).onCreate(input);
    });
    expect(peopleProps(renderer).status).toBe("Jamie Rivera added.");

    const pendingCreate = deferred<AccountabilityContact>();
    mockedCreateContact.mockReturnValueOnce(pendingCreate.promise);
    let createPromise!: Promise<AccountabilityContact>;
    act(() => {
      createPromise = peopleProps(renderer).onCreate(input);
    });
    expect(peopleProps(renderer).status).toBeNull();

    await act(async () => {
      pendingCreate.resolve(contact);
      await createPromise;
    });
    expect(peopleProps(renderer).status).toBe("Jamie Rivera added.");
  });

  test("saves food rules independently with exactly the food rule fields", async () => {
    const renderer = await renderScreen();

    await act(async () => {
      await foodRulesProps(renderer).onSave({
        food_rules_set: true,
        diet_flags: ["vegetarian"],
        allergens: ["shellfish"],
      });
    });

    expect(mockedSaveProfile).toHaveBeenCalledWith({
      food_rules_set: true,
      diet_flags: ["vegetarian"],
      allergens: ["shellfish"],
    });
  });

  test("adopts a coach saved on Messages when Profile was not edited", async () => {
    const renderer = await renderScreen();
    mockedFetchProfile.mockResolvedValue({
      ...profile,
      coach_style: "sam",
      coach_style_set: true,
    });
    await returnToProfile();

    const sam = renderer.root
      .findAllByProps({ accessibilityRole: "radio" })
      .find((node) =>
        node.findAllByType(Text).some(({ props }) => props.children === "Sam"),
      );
    expect(sam?.props.accessibilityState.selected).toBe(true);
  });

  test("keeps an unsaved coach pick when Profile is focused again", async () => {
    const renderer = await renderScreen();
    const elena = renderer.root
      .findAllByProps({ accessibilityRole: "radio" })
      .find((node) =>
        node.findAllByType(Text).some(({ props }) => props.children === "Elena"),
      );
    if (!elena) throw new Error("Missing Elena coach chip.");

    await act(async () => {
      elena.props.onPress();
    });
    mockedFetchProfile.mockResolvedValue(profile);
    await returnToProfile();

    const selected = renderer.root
      .findAllByProps({ accessibilityRole: "radio" })
      .find((node) =>
        node.findAllByType(Text).some(({ props }) => props.children === "Elena"),
      );
    expect(selected?.props.accessibilityState.selected).toBe(true);
  });

  test("picks up contacts added on Call someone safe when Profile is focused again", async () => {
    const renderer = await renderScreen();
    expect(peopleProps(renderer).contacts).toEqual([]);

    mockedFetchContacts.mockResolvedValue([contact]);
    await returnToProfile();

    expect(peopleProps(renderer).contacts).toEqual([contact]);
  });

  test("picks up cravings added on Better Choices when Profile is focused again", async () => {
    const renderer = await renderScreen();
    expect(cravingsProps(renderer).cravings).toEqual([]);

    mockedFetchCravings.mockResolvedValue([craving]);
    await returnToProfile();

    expect(cravingsProps(renderer).cravings).toEqual([craving]);
  });

  test("does not let a stale cravings load overwrite a successful add", async () => {
    const staleLoad = deferred<Craving[]>();
    mockedFetchCravings.mockReturnValue(staleLoad.promise);
    const renderer = await renderScreen();

    await act(async () => {
      await cravingsProps(renderer).onCreate("Pizza");
    });
    expect(cravingsProps(renderer).cravings).toEqual([craving]);
    expect(cravingsProps(renderer).status).toBe("Pizza added.");

    await act(async () => {
      staleLoad.resolve([]);
      await staleLoad.promise;
    });
    expect(cravingsProps(renderer).cravings).toEqual([craving]);
  });

  test("keeps craving failure messages private while announcing removal", async () => {
    mockedFetchCravings.mockResolvedValue([craving]);
    const renderer = await renderScreen();
    mockedRemoveCraving.mockRejectedValueOnce(new Error("private Pizza value"));

    const error = await captureRejection(() =>
      cravingsProps(renderer).onRemove(craving),
    );
    expect(error.message).toBe("We couldn’t remove that craving. Try again.");
    expect(error.message).not.toContain(craving.label);

    await act(async () => {
      await cravingsProps(renderer).onRemove(craving);
    });
    expect(cravingsProps(renderer).status).toBe("Pizza removed.");
  });

  test("jumps to Food rules when opened with the section param", async () => {
    mockProfileSection = "food-rules";
    const scrollTo = jest.fn();
    jest.spyOn(ScrollView.prototype, "scrollTo").mockImplementation(scrollTo);

    const renderer = await renderScreen();
    const target = renderer.root.findByProps({ testID: "profile-food-rules" });
    act(() => {
      target.props.onLayout({
        nativeEvent: { layout: { y: 420, x: 0, width: 320, height: 200 } },
      });
    });

    expect(scrollTo).toHaveBeenCalledWith({ y: 420, animated: false });
    expect(mockSetParams).toHaveBeenCalledWith({ section: undefined });
  });

  test("puts Log out at the top right of the header", async () => {
    const renderer = await renderScreen();
    const logOut = buttonByText(renderer, PROFILE_LOG_OUT);
    let header: ReactTestInstance | null = logOut.parent;
    while (header && header.props.style?.flexDirection !== "row") {
      header = header.parent;
    }
    if (!header) {
      throw new Error("Log out has no header parent.");
    }

    expect(header.props.style).toEqual(
      expect.objectContaining({
        alignItems: "center",
        flexDirection: "row",
        justifyContent: "space-between",
      }),
    );
    expect(
      header
        .findAllByType(Text)
        .some((text) => text.props.children === "YOUR SUPPORT PLAN"),
    ).toBe(true);
    expect(logOut.props.accessibilityState).toEqual({
      busy: false,
      disabled: false,
    });
  });

  test("still offers Log out when the profile fails to load", async () => {
    mockedFetchProfile.mockRejectedValueOnce(new Error("profile missing"));
    const renderer = await renderScreen();

    expect(buttonByText(renderer, PROFILE_LOG_OUT)).toBeTruthy();
    expect(JSON.stringify(renderer.toJSON())).toContain("Try again");
  });

  test("disables Log out while sign out is in flight, then re-enables after failure", async () => {
    const pending = deferred<void>();
    mockedSignOut.mockReturnValueOnce(pending.promise);
    const renderer = await renderScreen();

    act(() => {
      void buttonByText(renderer, PROFILE_LOG_OUT).props.onPress();
    });
    expect(buttonByText(renderer, PROFILE_LOG_OUT).props.disabled).toBe(true);
    expect(buttonByText(renderer, PROFILE_LOG_OUT).props.accessibilityState).toEqual({
      busy: true,
      disabled: true,
    });

    await act(async () => {
      pending.reject(new Error("Couldn't finish signing out."));
      try {
        await pending.promise;
      } catch {
        // Expected rejection from the deferred sign out.
      }
    });

    expect(buttonByText(renderer, PROFILE_LOG_OUT).props.disabled).toBe(false);
    expect(buttonByText(renderer, PROFILE_LOG_OUT).props.accessibilityState).toEqual({
      busy: false,
      disabled: false,
    });
  });

  test("signs the member out when Log out is pressed", async () => {
    const renderer = await renderScreen();

    await act(async () => {
      await buttonByText(renderer, PROFILE_LOG_OUT).props.onPress();
    });

    expect(mockedSignOut).toHaveBeenCalledTimes(1);
  });

  test("shows a sign out error without leaving the profile", async () => {
    mockedSignOut.mockRejectedValueOnce(
      new Error("Couldn't finish signing out."),
    );
    const renderer = await renderScreen();

    await act(async () => {
      await buttonByText(renderer, PROFILE_LOG_OUT).props.onPress();
    });

    expect(JSON.stringify(renderer.toJSON())).toContain(
      "Couldn't finish signing out.",
    );
    expect(JSON.stringify(renderer.toJSON())).toContain("Profile");
  });
});
