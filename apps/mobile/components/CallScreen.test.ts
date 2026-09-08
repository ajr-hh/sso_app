import React from "react";
import {
  act,
  create,
  type ReactTestInstance,
  type ReactTestRenderer,
} from "react-test-renderer";
import { Modal, Text } from "react-native";

import type { AccountabilityContact } from "../src/data/accountabilityContacts";
import { CALL_COPY } from "../src/presentation/accountabilityContacts";

const mockRouter = {
  back: jest.fn(),
  canGoBack: jest.fn(() => true),
  navigate: jest.fn(),
  push: jest.fn(),
  replace: jest.fn(),
};

const mockOpenURL = jest.fn(async (_url: string) => undefined);
const mockCanOpenURL = jest.fn(async (_url: string) => true);

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
jest.mock("expo-linking", () => ({
  canOpenURL: (url: string) => mockCanOpenURL(url),
  openURL: (url: string) => mockOpenURL(url),
}));
jest.mock("../src/data/sos", () => ({
  logSosEvent: jest.fn(async () => undefined),
}));
jest.mock("../src/data/accountabilityContacts", () => ({
  createAccountabilityContact: jest.fn(),
  fetchAccountabilityContacts: jest.fn(),
}));

import CallScreen from "../app/(app)/sos/call";
import {
  createAccountabilityContact,
  fetchAccountabilityContacts,
} from "../src/data/accountabilityContacts";

const mockedFetch = jest.mocked(fetchAccountabilityContacts);
const mockedCreate = jest.mocked(createAccountabilityContact);

const jamie: AccountabilityContact = {
  id: "contact-1",
  name: "Jamie Rivera",
  phone: "(555) 123-4567",
  email: "jamie@example.com",
  relationship: "friend",
};

const morgan: AccountabilityContact = {
  id: "contact-2",
  name: "Morgan Rivera",
  phone: "+1 (555) 555-0100",
  email: "morgan@example.com",
  relationship: "spouse",
};

async function flush(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

async function renderScreen(): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(React.createElement(CallScreen));
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

describe("CallScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCanOpenURL.mockResolvedValue(true);
    mockOpenURL.mockResolvedValue(undefined);
    mockedFetch.mockResolvedValue([]);
    mockedCreate.mockResolvedValue(jamie);
  });

  test("asks them to add a contact when Your people is empty", async () => {
    const renderer = await renderScreen();
    expect(texts(renderer)).toEqual(
      expect.arrayContaining([
        CALL_COPY.title,
        CALL_COPY.emptyTitle,
        CALL_COPY.addContact,
      ]),
    );
    expect(() => button(renderer, CALL_COPY.call)).toThrow(
      `Missing button "${CALL_COPY.call}"`,
    );
    expect(() => button(renderer, CALL_COPY.text)).toThrow(
      `Missing button "${CALL_COPY.text}"`,
    );
  });

  test("lists each Profile contact with Call and Text", async () => {
    mockedFetch.mockResolvedValue([jamie, morgan]);
    const renderer = await renderScreen();
    expect(texts(renderer)).toEqual(
      expect.arrayContaining([
        "Jamie Rivera",
        "Friend",
        "(555) 123-4567",
        "Morgan Rivera",
        "Spouse",
        "+1 (555) 555-0100",
        CALL_COPY.call,
        CALL_COPY.text,
      ]),
    );
  });

  test("Call opens the phone app with that contact's number ready", async () => {
    mockedFetch.mockResolvedValue([jamie]);
    const renderer = await renderScreen();
    await act(async () => {
      await renderer.root
        .findByProps({ accessibilityLabel: `Call ${jamie.name}` })
        .props.onPress();
    });
    expect(mockOpenURL).toHaveBeenCalledWith("tel:5551234567");
  });

  test("Text opens messages with that contact's number prefilled", async () => {
    mockedFetch.mockResolvedValue([jamie]);
    const renderer = await renderScreen();
    await act(async () => {
      await renderer.root
        .findByProps({ accessibilityLabel: `Text ${jamie.name}` })
        .props.onPress();
    });
    expect(mockOpenURL).toHaveBeenCalledWith("sms:5551234567");
  });

  test("Add a contact opens the same Your people form", async () => {
    const renderer = await renderScreen();
    const modal = renderer.root.findByType(Modal);
    expect(modal.props.visible).toBe(false);
    await act(async () => {
      button(renderer, CALL_COPY.addContact).props.onPress();
    });
    expect(modal.props.visible).toBe(true);
    expect(texts(renderer)).toEqual(
      expect.arrayContaining(["Add a loved one"]),
    );
  });
});
