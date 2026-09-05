import React from "react";
import {
  act,
  create,
  type ReactTestInstance,
  type ReactTestRenderer,
} from "react-test-renderer";
import { Text } from "react-native";

import type {
  AccountabilityContact,
  CreateAccountabilityContactInput,
} from "../src/data/accountabilityContacts";
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
import { fetchProfile, saveProfile } from "../src/data/profile";
import type { YourPeopleSectionProps } from "./YourPeopleSection";

const mockedCreateContact = jest.mocked(createAccountabilityContact);
const mockedFetchContacts = jest.mocked(fetchAccountabilityContacts);
const mockedRemoveContact = jest.mocked(removeAccountabilityContact);
const mockedFetchProfile = jest.mocked(fetchProfile);
const mockedSaveProfile = jest.mocked(saveProfile);

const profile: Profile = {
  age: 40,
  coach_style: "marcus",
  display_name: "Alex",
  email: "alex@example.test",
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

function peopleProps(renderer: ReactTestRenderer): YourPeopleSectionProps {
  return renderer.root.findByType(
    "YourPeopleSection" as unknown as React.ElementType,
  ).props as YourPeopleSectionProps;
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
    jest.clearAllMocks();
    mockedFetchProfile.mockResolvedValue(profile);
    mockedFetchContacts.mockResolvedValue([]);
    mockedCreateContact.mockResolvedValue(contact);
    mockedRemoveContact.mockResolvedValue();
    mockedSaveProfile.mockResolvedValue();
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
      "We couldn’t add Morgan Rivera. Try again.",
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
      "We couldn’t remove Jamie Rivera. Try again.",
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
      "We couldn’t add Jamie Rivera. Try again.",
    );
    expect(peopleProps(renderer).loadError).toBe(
      "We couldn’t load your people. Try again.",
    );
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
});
