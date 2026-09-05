export const RELATIONSHIP_OPTIONS = [
  { label: "Spouse", value: "spouse" },
  { label: "Father", value: "father" },
  { label: "Mother", value: "mother" },
  { label: "Daughter", value: "daughter" },
  { label: "Son", value: "son" },
  { label: "Friend", value: "friend" },
  { label: "Colleague", value: "colleague" },
  { label: "Other", value: "other" },
] as const;

export type RelationshipValue =
  (typeof RELATIONSHIP_OPTIONS)[number]["value"];

export const CONTACT_FIELD_LIMITS = {
  name: 120,
  phone: 40,
  email: 320,
} as const;

export type AccountabilityContactInput = {
  name: string;
  phone: string;
  email: string;
  relationship: RelationshipValue | null;
};

export function normalizeAccountabilityContact(
  input: AccountabilityContactInput,
) {
  return {
    name: input.name.trim(),
    phone: input.phone.trim(),
    email: input.email.trim().toLowerCase(),
    relationship: input.relationship,
  };
}

export function getAccountabilityContactValidationError(
  input: AccountabilityContactInput,
): string | null {
  const value = normalizeAccountabilityContact(input);
  if (!value.name) return "Enter their name.";
  if (!value.phone) return "Enter their phone number.";
  if ((value.phone.match(/\d/g) ?? []).length < 7) {
    return "Enter a phone number with at least 7 digits.";
  }
  if (!value.email) return "Enter their email address.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)) {
    return "Enter a valid email address.";
  }
  if (value.relationship === null) return "Choose their relationship.";
  return null;
}

export function shouldAnnounceContactStatus(platform: string): boolean {
  return platform === "ios";
}
