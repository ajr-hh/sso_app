# Profile Motivation and Your People Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let members choose one SOS reinforcement as their motivation and securely add, view, and remove accountability contacts from Profile.

**Architecture:** Keep motivation and contact validation in pure presentation modules, isolate Supabase operations in a contact data module, and keep the modal/list UI in a dedicated component so the profile route remains an orchestrator. Persist contacts in a normalized owner-scoped table with RLS and soft deletion.

**Tech Stack:** Expo 57, Expo Router, React Native 0.86, TypeScript 6, Supabase Postgres/Auth/RLS, Jest 29.

**Spec:** `docs/superpowers/specs/2026-09-04-profile-motivation-people-design.md`

## Global Constraints

- Read the exact Expo 57 documentation at `https://docs.expo.dev/versions/v57.0.0/` before changing React Native UI.
- Preserve the established Ink `#141B1D`, Ember `#FF7348`, canvas `#F6F6F6` visual system.
- Motivation is single-select and uses the seven SOS reinforcement labels in the specified order.
- Name, phone, email, and relationship are all required.
- Contacts are private owner-scoped PII and must be protected by RLS.
- Removal is a soft delete; do not grant physical delete.
- Do not implement actual calls, messages, contact editing, or address-book import.
- Keep unrelated uncommitted SOS changes out of feature commits.

---

### Task 1: Pure profile and contact rules

**Files:**
- Create: `apps/mobile/src/presentation/profile.ts`
- Create: `apps/mobile/src/presentation/profile.test.ts`
- Create: `apps/mobile/src/presentation/accountabilityContacts.ts`
- Create: `apps/mobile/src/presentation/accountabilityContacts.test.ts`

**Interfaces:**
- Produces: `MOTIVATION_PROMPT`, `MOTIVATION_OPTIONS`, `MotivationOption`, and `isMotivationOption(value: string): value is MotivationOption`.
- Produces: `RELATIONSHIP_OPTIONS`, `RelationshipValue`, `AccountabilityContactInput`, `normalizeAccountabilityContact(input)`, and `getAccountabilityContactValidationError(input): string | null`.

- [ ] **Step 1: Write failing motivation tests**

```ts
import {
  isMotivationOption,
  MOTIVATION_OPTIONS,
  MOTIVATION_PROMPT,
} from "./profile";

describe("profile motivation options", () => {
  test("uses the requested profile prompt", () => {
    expect(MOTIVATION_PROMPT).toBe("How do you want to be motivated");
  });

  test("matches the SOS reinforcement labels and order", () => {
    expect(MOTIVATION_OPTIONS).toEqual([
      "Better Choices",
      "Coach Messages",
      "Hard Truths",
      "Remember Your Why",
      "Small Wins",
      "Talk to Someone",
      "The Numbers",
    ]);
  });

  test("rejects a legacy profile value without crashing", () => {
    expect(isMotivationOption("Family")).toBe(false);
    expect(isMotivationOption("Better Choices")).toBe(true);
  });
});
```

- [ ] **Step 2: Run the motivation test and verify RED**

Run: `cd apps/mobile && npx jest src/presentation/profile.test.ts --runInBand`

Expected: FAIL because `./profile` does not exist.

- [ ] **Step 3: Implement the motivation rules**

```ts
export const MOTIVATION_OPTIONS = [
  "Better Choices",
  "Coach Messages",
  "Hard Truths",
  "Remember Your Why",
  "Small Wins",
  "Talk to Someone",
  "The Numbers",
] as const;

export const MOTIVATION_PROMPT = "How do you want to be motivated";

export type MotivationOption = (typeof MOTIVATION_OPTIONS)[number];

const motivationOptions = new Set<string>(MOTIVATION_OPTIONS);

export function isMotivationOption(value: string): value is MotivationOption {
  return motivationOptions.has(value);
}
```

- [ ] **Step 4: Run the motivation test and verify GREEN**

Run: `cd apps/mobile && npx jest src/presentation/profile.test.ts --runInBand`

Expected: PASS.

- [ ] **Step 5: Write failing relationship and validation tests**

```ts
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
```

- [ ] **Step 6: Run contact-rule tests and verify RED**

Run: `cd apps/mobile && npx jest src/presentation/accountabilityContacts.test.ts --runInBand`

Expected: FAIL because `./accountabilityContacts` does not exist.

- [ ] **Step 7: Implement relationship choices, normalization, and validation**

```ts
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
```

After successful validation, the caller checks that the normalized relationship is non-null before passing it to the data module.

- [ ] **Step 8: Run both pure test files and commit**

Run: `cd apps/mobile && npx jest src/presentation/profile.test.ts src/presentation/accountabilityContacts.test.ts --runInBand`

Expected: PASS.

```bash
git add apps/mobile/src/presentation/profile.ts apps/mobile/src/presentation/profile.test.ts apps/mobile/src/presentation/accountabilityContacts.ts apps/mobile/src/presentation/accountabilityContacts.test.ts
git commit -m "feat(mobile): define profile contact rules"
```

### Task 2: Owner-scoped accountability contact table

**Files:**
- Create: `supabase/migrations/20260904183000_accountability_contacts.sql`

**Interfaces:**
- Produces: `public.accountability_contacts` with active-row select, owner insert, owner soft-delete update, and no physical delete grant.
- Consumes: relationship values from Task 1 as the SQL check values.

- [ ] **Step 1: Add the migration**

```sql
create table if not exists public.accountability_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (btrim(name) <> ''),
  phone text not null check (btrim(phone) <> ''),
  email text not null check (btrim(email) <> ''),
  relationship text not null check (
    relationship in (
      'spouse',
      'father',
      'mother',
      'daughter',
      'son',
      'friend',
      'colleague',
      'other'
    )
  ),
  created_at timestamptz not null default now(),
  deleted boolean not null default false,
  deleted_at timestamptz
);

create index if not exists accountability_contacts_active_user_created_idx
on public.accountability_contacts (user_id, created_at, id)
where deleted = false;

alter table public.accountability_contacts enable row level security;

create policy "Members select their active accountability contacts"
on public.accountability_contacts for select to authenticated
using ((select auth.uid()) = user_id and deleted = false);

create policy "Members insert their active accountability contacts"
on public.accountability_contacts for insert to authenticated
with check ((select auth.uid()) = user_id and deleted = false);

create policy "Members soft-delete their accountability contacts"
on public.accountability_contacts for update to authenticated
using ((select auth.uid()) = user_id and deleted = false)
with check ((select auth.uid()) = user_id);

revoke all on table public.accountability_contacts from authenticated;
grant select, insert on table public.accountability_contacts to authenticated;
grant update (deleted, deleted_at)
on table public.accountability_contacts to authenticated;
```

- [ ] **Step 2: Review the SQL invariants**

Confirm:

- No delete policy or delete grant exists.
- Select excludes `deleted = true`.
- Insert requires the authenticated owner and `deleted = false`.
- Update may change only `deleted` and `deleted_at`.
- The relationship check exactly matches Task 1.

- [ ] **Step 3: Commit the migration**

```bash
git add supabase/migrations/20260904183000_accountability_contacts.sql
git commit -m "feat(db): add accountability contacts"
```

### Task 3: Accountability contact data access

**Files:**
- Create: `apps/mobile/src/data/accountabilityContacts.ts`
- Create: `apps/mobile/src/data/accountabilityContacts.test.ts`

**Interfaces:**
- Consumes: `RelationshipValue` and normalized values from Task 1.
- Produces: `AccountabilityContact`, `CreateAccountabilityContactInput`, `createAccountabilityContact(input)`, `fetchAccountabilityContacts()`, and `removeAccountabilityContact(id)`.

- [ ] **Step 1: Write failing fetch, insert, removal, and auth tests**

Use the same fluent Supabase mock style as `src/data/tasks.test.ts`. Cover these observable calls:

```ts
expect(select).toHaveBeenCalledWith("id, name, phone, email, relationship");
expect(ownerFilter).toHaveBeenCalledWith("user_id", "user-1");
expect(activeFilter).toHaveBeenCalledWith("deleted", false);
expect(createdOrder).toHaveBeenCalledWith("created_at", { ascending: true });

expect(insert).toHaveBeenCalledWith({
  user_id: "user-1",
  name: "Jamie Rivera",
  phone: "(555) 123-4567",
  email: "jamie@example.com",
  relationship: "friend",
});

expect(update).toHaveBeenCalledWith({
  deleted: true,
  deleted_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T.*Z$/),
});
expect(idFilter).toHaveBeenCalledWith("id", "contact-1");
expect(ownerFilter).toHaveBeenCalledWith("user_id", "user-1");
expect(activeFilter).toHaveBeenCalledWith("deleted", false);
```

Also assert each exported operation rejects with “You must be signed in to manage accountability contacts.” when `auth.getUser()` has no user, and propagates Supabase errors.

- [ ] **Step 2: Run the data test and verify RED**

Run: `cd apps/mobile && npx jest src/data/accountabilityContacts.test.ts --runInBand`

Expected: FAIL because `./accountabilityContacts` does not exist.

- [ ] **Step 3: Implement the data module**

```ts
import type { RelationshipValue } from "../presentation/accountabilityContacts";
import { getSupabase } from "../lib/supabase";

export type AccountabilityContact = {
  id: string;
  name: string;
  phone: string;
  email: string;
  relationship: RelationshipValue;
};

export type CreateAccountabilityContactInput = Omit<
  AccountabilityContact,
  "id"
>;

async function requireUserId(): Promise<string> {
  const { data, error } = await getSupabase().auth.getUser();
  if (error) throw new Error(error.message);
  if (!data.user) {
    throw new Error(
      "You must be signed in to manage accountability contacts.",
    );
  }
  return data.user.id;
}
```

Implement `fetchAccountabilityContacts()` with `.select(...)`, `.eq("user_id", userId)`, `.eq("deleted", false)`, `.order("created_at", { ascending: true })`, and `.order("id", { ascending: true })`.

Implement `createAccountabilityContact(input: CreateAccountabilityContactInput)` with an owner-injected insert followed by `.select("id, name, phone, email, relationship").single()`.

Implement `removeAccountabilityContact(id)` with `.update({ deleted: true, deleted_at: new Date().toISOString() })` filtered by id, user id, and active status.

- [ ] **Step 4: Run the data tests and commit**

Run: `cd apps/mobile && npx jest src/data/accountabilityContacts.test.ts --runInBand`

Expected: PASS.

```bash
git add apps/mobile/src/data/accountabilityContacts.ts apps/mobile/src/data/accountabilityContacts.test.ts
git commit -m "feat(mobile): add accountability contact data access"
```

### Task 4: Accessible Your People tile and flyout

**Files:**
- Create: `apps/mobile/components/YourPeopleSection.tsx`
- Create: `apps/mobile/components/YourPeopleSection.test.ts`
- Modify: `apps/mobile/components/MaterialSymbol.tsx`
- Modify: `apps/mobile/package.json`
- Modify: `apps/mobile/package-lock.json`

**Interfaces:**
- Consumes: contact types and operations from Task 3; relationship options and validation from Task 1; `ErrorBanner`.
- Produces: controlled `<YourPeopleSection contacts loading loadError modalVisible onCreate onRemove onRetry onModalVisibleChange status />`.

- [ ] **Step 1: Verify Expo 57 component APIs**

Read the Expo 57 / React Native documentation linked from `apps/mobile/AGENTS.md` for `Modal`, `KeyboardAvoidingView`, `TextInput`, `Alert`, and accessibility props. Confirm every planned prop exists in React Native 0.86 before implementation.

- [ ] **Step 2: Add the component test dependency**

Run:

```bash
cd apps/mobile
npm install --save-dev react-test-renderer@19.2.3 @types/react-test-renderer
```

This pins the renderer to the installed React version instead of relying on Jest’s transitive dependency.

- [ ] **Step 3: Write a failing component contract test**

Create a `.test.ts` test using `React.createElement` and `react-test-renderer` so it matches the repository’s `.test.ts` Jest pattern. Render controlled props and assert:

```ts
expect(renderedText).toContain("Your people");
expect(renderedText).toContain(
  "Accountability partners SOS can reach on your behalf.",
);
expect(renderedText).toContain("Add a loved one");
expect(renderedText).toContain("Jamie Rivera");
expect(renderedText).toContain("Friend");
```

Render again with `modalVisible: true` and assert the sheet includes Name, Phone number, Email, all eight relationship labels, Cancel, and Save loved one. Pass `jest.fn()` async callbacks; no Supabase mock belongs in this component test.

- [ ] **Step 4: Run the component test and verify RED**

Run: `cd apps/mobile && npx jest components/YourPeopleSection.test.ts --runInBand`

Expected: FAIL because `./YourPeopleSection` does not exist.

- [ ] **Step 5: Add the person-add symbol**

Add `"person_add"` to `MaterialSymbolName` and map it to Material Symbols codepoint `\u{EA4D}` in `glyphs`.

- [ ] **Step 6: Define controlled section props**

```ts
type YourPeopleSectionProps = {
  contacts: readonly AccountabilityContact[];
  loading: boolean;
  loadError: string | null;
  modalVisible: boolean;
  status: string | null;
  onCreate: (
    input: CreateAccountabilityContactInput,
  ) => Promise<AccountabilityContact>;
  onModalVisibleChange: (visible: boolean) => void;
  onRemove: (contact: AccountabilityContact) => Promise<void>;
  onRetry: () => void;
};
```

The profile route owns persisted-contact state and operations. `YourPeopleSection` owns only transient form values, validation messages, and per-action busy state. A load failure renders `ErrorBanner` and a “Try again” action without hiding the Add button.

- [ ] **Step 7: Implement the requested tile**

Render:

- Header: `Your people`
- Supporting line: `Accountability partners SOS can reach on your behalf.`
- A compact row per contact with title-cased relationship, phone, email, and a `Remove` button.
- An outlined white `Add a loved one` button with `MaterialSymbol name="person_add"` on the left, black text, one-point neutral border, and minimum height 54.

Use `Alert.alert("Remove loved one?", ...)` with a destructive confirmation whose message names the contact. Only remove the row after the data request succeeds; report failure in the tile.

- [ ] **Step 8: Implement the bottom flyout**

Use a transparent React Native `Modal` with `animationType="slide"`, a dim dismissible backdrop, and a bottom-aligned rounded white sheet. Inside a `KeyboardAvoidingView`, render:

- Header “Add a loved one”
- Labeled Name, Phone number, and Email `TextInput` controls
- Relationship label and the eight wrapping radio-style choices
- Cancel and Save loved one actions

Hold form state as:

```ts
const EMPTY_FORM: AccountabilityContactInput = {
  name: "",
  phone: "",
  email: "",
  relationship: null,
};
```

On Save:

1. Call `getAccountabilityContactValidationError(form)`.
2. Show the returned message as an alert inside the sheet and stop on error.
3. Normalize the form.
4. Call the `onCreate` prop with the normalized values and now non-null relationship.
5. After it resolves, clear the form and request that the parent close the modal. The parent appends the returned contact and sets status to “Loved one added.”
6. Preserve values and show the request error if creation fails.

Disable Cancel, backdrop dismissal, and Save while the request is in flight. Use `onShow={() => nameRef.current?.focus()}` to place focus in Name.

- [ ] **Step 9: Run focused tests and TypeScript**

Run:

```bash
cd apps/mobile
npx jest src/presentation/accountabilityContacts.test.ts src/data/accountabilityContacts.test.ts --runInBand
npx jest components/YourPeopleSection.test.ts --runInBand
npx tsc --noEmit
```

Expected: PASS with no TypeScript diagnostics.

- [ ] **Step 10: Commit the UI component**

```bash
git add apps/mobile/components/YourPeopleSection.tsx apps/mobile/components/YourPeopleSection.test.ts apps/mobile/components/MaterialSymbol.tsx apps/mobile/package.json apps/mobile/package-lock.json
git commit -m "feat(mobile): add Your people profile tile"
```

### Task 5: Integrate the new profile choices and tile

**Files:**
- Modify: `apps/mobile/app/(app)/(tabs)/profile.tsx`
- Modify: `apps/mobile/src/types.ts`
- Modify: `apps/mobile/src/data/profile.ts`
- Modify: `apps/mobile/src/data/profile.test.ts`

**Interfaces:**
- Consumes: `MOTIVATION_OPTIONS`, `isMotivationOption`, contact data operations, and `YourPeopleSection`.
- Preserves: existing `fetchProfile()` and `saveProfile()` APIs.

- [ ] **Step 1: Write a characterization test for legacy motivation values**

Update the existing `fetchProfile()` fixture with `motivators: "Family"` and assert:

```ts
await expect(fetchProfile()).resolves.toMatchObject({
  motivators: "Family",
});
```

- [ ] **Step 2: Run the profile data test**

Run: `cd apps/mobile && npx jest src/data/profile.test.ts --runInBand`

Expected: PASS because loading legacy text is existing behavior. Record that no production data change is required for legacy loading.

- [ ] **Step 3: Add contact state and operations to the profile screen**

Add:

```ts
const [contacts, setContacts] = useState<AccountabilityContact[]>([]);
const [contactsLoading, setContactsLoading] = useState(true);
const [contactsError, setContactsError] = useState<string | null>(null);
const [contactsStatus, setContactsStatus] = useState<string | null>(null);
const [peopleModalVisible, setPeopleModalVisible] = useState(false);
```

Load profile and contacts independently on mount so a contact request failure does not hide the profile. `loadContacts()` calls `fetchAccountabilityContacts()`, sets an actionable error on failure, and always clears its loading state.

Implement:

```ts
const createContact = async (
  input: CreateAccountabilityContactInput,
): Promise<AccountabilityContact> => {
  const created = await createAccountabilityContact(input);
  setContacts((current) => [...current, created]);
  setContactsStatus("Loved one added.");
  setContactsError(null);
  return created;
};

const removeContact = async (
  contact: AccountabilityContact,
): Promise<void> => {
  await removeAccountabilityContact(contact.id);
  setContacts((current) => current.filter(({ id }) => id !== contact.id));
  setContactsStatus(`${contact.name} removed.`);
  setContactsError(null);
};
```

Convert caught operation failures with `explainError`, store them in `contactsError`, and rethrow so the controlled component can preserve its form or keep the row visible.

- [ ] **Step 4: Update motivation and render Your people**

Replace the local three-item `motivatorOptions` constant with `MOTIVATION_OPTIONS`. Use `MOTIVATION_PROMPT` as the section title and radio-group label.

Render:

```tsx
<ChoiceSection
  options={MOTIVATION_OPTIONS}
  selected={profile.motivators}
  title={MOTIVATION_PROMPT}
  update={(value) => updateProfile("motivators", value)}
/>
```

Before `saveProfile`, guard with:

```ts
if (!isMotivationOption(profile.motivators)) {
  setError("Choose how you want to be motivated.");
  return;
}
```

Add this directly after the Coach style `ChoiceSection` and before Save profile:

```tsx
<YourPeopleSection
  contacts={contacts}
  loading={contactsLoading}
  loadError={contactsError}
  modalVisible={peopleModalVisible}
  onCreate={createContact}
  onModalVisibleChange={setPeopleModalVisible}
  onRemove={removeContact}
  onRetry={() => void loadContacts()}
  status={contactsStatus}
/>
```

- [ ] **Step 5: Keep the profile type compatible**

Keep `Profile.motivators` as `string` because existing database rows may hold legacy values. Do not narrow the fetched profile type to `MotivationOption`; validation occurs before saving.

No query field changes are required in `src/data/profile.ts`. Keep the existing select and patch behavior.

- [ ] **Step 6: Run profile and presentation tests**

Run:

```bash
cd apps/mobile
npx jest src/data/profile.test.ts src/presentation/profile.test.ts --runInBand
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 7: Commit profile integration**

```bash
git add apps/mobile/app/\(app\)/\(tabs\)/profile.tsx apps/mobile/src/types.ts apps/mobile/src/data/profile.ts apps/mobile/src/data/profile.test.ts
git commit -m "feat(mobile): expand profile support preferences"
```

Only add files that actually changed; omit `src/types.ts` or `src/data/profile.ts` if the characterization confirms no edit is needed.

### Task 6: Full review and verification

**Files:**
- Review all files changed in Tasks 1–5.

**Interfaces:**
- Verifies the complete feature and migration as one unit.

- [ ] **Step 1: Run focused static checks**

Run:

```bash
cd apps/mobile
npx tsc --noEmit
npx jest --runInBand
```

Expected: all suites pass and TypeScript produces no diagnostics.

- [ ] **Step 2: Build both development bundles**

With Expo running on port 8081, request:

```bash
curl --fail --max-time 240 \
  "http://localhost:8081/node_modules/expo-router/entry.bundle?platform=ios&dev=true&transform.engine=hermes" \
  --output /tmp/sso-profile-ios.bundle

curl --fail --max-time 240 \
  "http://localhost:8081/node_modules/expo-router/entry.bundle?platform=android&dev=true&transform.engine=hermes" \
  --output /tmp/sso-profile-android.bundle
```

Expected: both requests return HTTP 200 and non-empty bundles.

- [ ] **Step 3: Review security and UX**

Confirm:

- Contact queries inject the authenticated user id.
- Every read/update filters active rows.
- No physical delete API exists.
- The migration grants only select, insert, and soft-delete columns.
- All four fields block empty submissions.
- Failed saves preserve form input.
- The modal cannot double-submit.
- Motivation remains single-select.
- Copy exactly matches the approved spec.

- [ ] **Step 4: Run language and framework reviewers**

Run the TypeScript reviewer and React reviewer over the feature diff. Run the database reviewer over the migration and the security reviewer over the PII/RLS path. Apply valid findings and repeat Steps 1–3.

- [ ] **Step 5: Inspect the final diff**

Run:

```bash
git status --short
git diff --check
git diff --stat
```

Expected: no whitespace errors; pre-existing uncommitted SOS files remain distinguishable from this feature.
