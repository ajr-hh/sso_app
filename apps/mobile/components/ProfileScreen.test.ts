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
});
