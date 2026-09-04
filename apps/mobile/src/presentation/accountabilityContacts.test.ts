import {
  getAccountabilityContactValidationError,
  normalizeAccountabilityContact,
  RELATIONSHIP_OPTIONS,
} from "./accountabilityContacts";

const valid = {
  name: " Jamie Rivera ",
  phone: " (555) 123-4567 ",
  email: " JAMIE@EXAMPLE.COM ",
  relationship: "friend" as const,
};

describe("accountability contact rules", () => {
  test("defines the exact relationship choices", () => {
    expect(RELATIONSHIP_OPTIONS.map(({ label }) => label)).toEqual([
      "Spouse",
      "Father",
      "Mother",
      "Daughter",
      "Son",
      "Friend",
      "Colleague",
      "Other",
    ]);
  });

  test.each([
    [{ ...valid, name: "" }, "Enter their name."],
    [{ ...valid, phone: "" }, "Enter their phone number."],
    [{ ...valid, phone: "123-45" }, "Enter a phone number with at least 7 digits."],
    [{ ...valid, email: "" }, "Enter their email address."],
    [{ ...valid, email: "not-an-email" }, "Enter a valid email address."],
    [{ ...valid, relationship: null }, "Choose their relationship."],
  ])("returns the first actionable validation error", (input, expected) => {
    expect(getAccountabilityContactValidationError(input)).toBe(expected);
  });

  test("normalizes values before persistence", () => {
    expect(normalizeAccountabilityContact(valid)).toEqual({
      name: "Jamie Rivera",
      phone: "(555) 123-4567",
      email: "jamie@example.com",
      relationship: "friend",
    });
  });
});
