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

export const CALL_COPY = {
  title: "Call someone safe",
  subtitle: "You do not have to solve this moment alone.",
  emptyTitle: "Add someone you can reach",
  emptyBody:
    "Add a contact so you can call or text them from here when you need a steady person.",
  addContact: "Add a contact",
  addAnother: "Add another contact",
  call: "Call",
  text: "Text",
} as const;

export function getRelationshipLabel(value: RelationshipValue): string {
  return (
    RELATIONSHIP_OPTIONS.find((option) => option.value === value)?.label ??
    value
  );
}

export function digitsForPhoneHref(phone: string): string {
  const trimmed = phone.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  return hasPlus ? `+${digits}` : digits;
}

export function phoneHrefForCall(phone: string): string {
  return `tel:${digitsForPhoneHref(phone)}`;
}

export function phoneHrefForSms(phone: string): string {
  return `sms:${digitsForPhoneHref(phone)}`;
}
