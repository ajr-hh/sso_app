# Profile Motivation and Your People

Date: 2026-09-04  
Status: approved for implementation  
Product: Humanaut SOS Expo app

## Goal

Update Profile so members can choose one of the seven SOS reinforcement types as their preferred motivation and manage loved ones whom SOS may contact on their behalf.

## Profile experience

Rename “What motivates you” to “How do you want to be motivated.”

Keep the existing single-select behavior. Present these seven options using the same labels and order as the SOS reinforcement list:

1. Better Choices
2. Coach Messages
3. Hard Truths
4. Remember Your Why
5. Small Wins
6. Talk to Someone
7. The Numbers

The selected value remains stored in `profiles.motivators` as text. Existing values that are not in the new set may load without crashing; if the member tries to save before choosing a current option, the screen shows an actionable validation error and does not submit.

## Your people experience

Add a white “Your people” tile directly below Coach style. Supporting copy:

> Accountability partners SOS can reach on your behalf.

The tile contains:

- Existing saved contacts as compact rows showing name, relationship, phone, and email.
- A Remove action on each row. Removal requires confirmation and then soft-deletes the contact.
- A large white button with black text, a person-add icon on the left, and the label “Add a loved one.”

Pressing Add a loved one opens an accessible bottom-sheet-style modal. The modal contains required fields for:

- Name
- Phone number
- Email
- Relationship

Relationship is selected from Spouse, Father, Mother, Daughter, Son, Friend, Colleague, or Other. “Other” is itself the stored relationship value; it does not reveal a second custom relationship field.

All four fields are required. Email must have a basic valid email shape. Phone must contain at least seven digits after formatting characters are removed. Invalid input stays in the modal and shows an actionable validation message.

On successful save, the modal closes and the new contact appears immediately in Your people. A failed request leaves the form open with its entered values intact and displays the server error. While saving, duplicate submissions are disabled.

## Data model

Add a new timestamped migration after `20260903120000_init.sql` that creates `public.accountability_contacts` with:

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `name text not null`
- `phone text not null`
- `email text not null`
- `relationship text not null` with a check constraint for the eight supported lowercase values
- `created_at timestamptz not null default now()`
- `deleted boolean not null default false`
- `deleted_at timestamptz`

Add an index on `(user_id, created_at, id)` for active rows only.

Enable row-level security. Authenticated members may select, insert, and update only rows where `auth.uid() = user_id`. Do not grant physical delete; removal updates `deleted` and `deleted_at`. Restrict update grants to the soft-delete fields because this version does not include contact editing.

The mobile data layer returns typed active contacts in creation order, inserts owner-scoped rows, and soft-deletes by both contact id and authenticated user id. The client never accepts a caller-supplied owner id.

## Component boundaries

- `profile.tsx` owns screen state, modal visibility, contact loading, immediate local insertion after a successful save, and confirmed removal.
- A focused presentation module owns relationship constants, labels, normalization, and validation so these rules can be tested without rendering React Native.
- A focused data module owns Supabase contact queries and authentication checks.
- The existing `MaterialSymbol` component gains the person-add glyph.
- The existing profile save flow continues to save only profile fields; contact operations save independently.

## Accessibility

- The motivation choices remain a radio group with one selected option.
- The add button has a descriptive accessibility label and at least a 48-point target.
- The modal has a visible title, labels every field, moves focus into the form, supports keyboard avoidance, and provides a clear Cancel action.
- Relationship choices expose selected state.
- Validation and request errors use alert semantics.
- Successful additions and removals use polite live-region status text.
- Remove confirmation names the contact being removed.

## Testing and verification

Use test-driven development for:

- The exact seven motivation options and their order.
- Contact validation, relationship normalization, email validation, and phone digit requirements.
- Data queries that scope fetch, insert, and soft-delete operations to the authenticated user and active rows.
- Profile loading with a legacy motivator value.

Run the mobile Jest suite and `tsc --noEmit`. Request both iOS and Android development bundles from the running Expo server to catch platform compilation failures.

## Out of scope

- Editing a saved contact.
- Custom relationship text beyond the “Other” option.
- Actually placing calls or sending email/SMS on the member’s behalf.
- Choosing which loved one receives a specific SOS outreach.
- Importing contacts from the device address book.
