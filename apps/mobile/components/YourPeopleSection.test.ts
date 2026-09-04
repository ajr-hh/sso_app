import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";

import type { AccountabilityContact } from "../src/data/accountabilityContacts";
import { RELATIONSHIP_OPTIONS } from "../src/presentation/accountabilityContacts";
import { YourPeopleSection } from "./YourPeopleSection";

const contact: AccountabilityContact = {
  id: "contact-1",
  name: "Jamie Rivera",
  phone: "(555) 867-5309",
  email: "jamie@example.com",
  relationship: "friend",
};

const props = {
  contacts: [contact],
  loading: false,
  loadError: null,
  modalVisible: false,
  status: null,
  onCreate: jest.fn(async () => contact),
  onModalVisibleChange: jest.fn(),
  onRemove: jest.fn(async () => undefined),
  onRetry: jest.fn(),
};

async function render(modalVisible: boolean): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(
      React.createElement(YourPeopleSection, {
        ...props,
        modalVisible,
      }),
    );
  });
  return renderer;
}

describe("YourPeopleSection", () => {
  test("renders the controlled tile and contact", async () => {
    const renderer = await render(false);
    const renderedText = JSON.stringify(renderer.toJSON());

    expect(renderedText).toContain("Your people");
    expect(renderedText).toContain(
      "Accountability partners SOS can reach on your behalf.",
    );
    expect(renderedText).toContain("Add a loved one");
    expect(renderedText).toContain("Jamie Rivera");
    expect(renderedText).toContain("Friend");
  });

  test("renders the complete add flyout when visible", async () => {
    const renderer = await render(true);
    const renderedText = JSON.stringify(renderer.toJSON());

    expect(renderedText).toContain("Name");
    expect(renderedText).toContain("Phone number");
    expect(renderedText).toContain("Email");
    for (const option of RELATIONSHIP_OPTIONS) {
      expect(renderedText).toContain(option.label);
    }
    expect(renderedText).toContain("Cancel");
    expect(renderedText).toContain("Save loved one");
  });
});
