# Humanaut SOS — Expo native app (v1)

Date: 2026-09-03  
Status: draft, pending user review  
Product: in-the-moment diet/relapse support for Humanaut Health members

## Goal

Replace the Next.js clickable wireframe with a real Expo (React Native) app: each member has an account, their own data, working SOS/journal/photos, and a small in-app community. Run on a physical phone via Expo Go. No App Store / TestFlight in this pass.

The existing Next.js app in this repo is a **visual and copy reference only**. It is not a second product and is not an API.

## Constraints (locked)

- Stack: Expo + Expo Router + Supabase (Auth, Postgres, Storage). No Next.js runtime in the product path.
- Auth: magic-link email (not passwords).
- Hard Truths: member chooses the photo and writes the caption. The app never generates captions or appearance commentary.
- Live calling, restaurant finder, food alias, and group challenge are out of v1.
- Circle.so is **not** integrated in v1. Native feed now; Circle is a later option if we want a hosted community instead.

## App shape

Repo layout:

- `apps/mobile/` — Expo app (the product)
- `docs/clickable-prototype.html` and current `app/` screens — reference
- `supabase/` — SQL migrations and storage policies for this product

Navigation:

1. Unauthenticated: sign-in screen (email → magic link). Deep link `humanaut-sos://` completes the session.
2. Authenticated tabs: **Home**, **Activity** (journal), **Community**, **Profile**, plus a center **SOS** button (same chrome as the wireframe).

Brand: Ink `#141B1D`, Ember `#FF7348`, canvas `#F6F6F6`, Darker Grotesque for headlines. Phone-width, not tablet-first.

Success for this pass: open Expo Go, magic-link in, edit profile/goals/tasks, write a journal entry (streak updates), post/read community, run an SOS, save a Why or Hard Truths photo you captured and captioned.

## Accounts and data

**Auth.** Supabase Auth `signInWithOtp`. Redirect URL uses the app scheme so the email opens Expo (Expo Go in development). Session persisted with Expo SecureStore. No Clerk, NextAuth, or passwords in v1.

**Profile row.** Created on first successful session (`auth.users.id` = `profiles.id`). Fields: display name, age (optional), contact info (optional), why-it-matters, preferred motivators (text list), coach style default `marcus`.

**Member-owned tables** (RLS: `auth.uid() = user_id` for select/insert/update/delete):

| Table | Purpose |
|---|---|
| `profiles` | Display name, why, motivators |
| `goals` | Ordered labels |
| `daily_tasks` | Label + done + date |
| `journal_entries` | Mood + text + created_at |
| `sos_events` | Path (`off_the_rails` \| `planned_event`) + reinforcement key |
| `reinforcement_photos` | storage_key, caption, tag, mode (`remember_why` \| `hard_truths`) |

**Streak.** Consecutive calendar days with at least one `journal_entries` row. Displayed on Home. Not a stored counter that can drift.

**Built-in content (not DB):** curated health-risk stats, static food swaps, coach message library (Marcus/Elena copy from the wireframe). Rewards UI can read streak + task completion; no separate prize backend.

**Photos.** Private bucket `sos-photos`. Object key `{user_id}/{uuid}.ext`. Client uploads with the user JWT; RLS/storage policies: only that user can read/write their prefix. Display via short-lived signed URLs. Compress on device before upload (JPEG/WebP, cap ~2MB). Allowed types: jpeg, png, webp, heic.

**Environment.** `apps/mobile/.env` (gitignored) with `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` only. Service role keys never ship in the app. Commit `.env.example` with empty placeholders.

## SOS and photos

Entry: persistent SOS control → two paths (urgent vs planned event) → reinforcement picker.

Reinforcements in v1:

- Remember Your Why — member photos + captions (`mode = remember_why`)
- Hard Truths — member photos + captions + tag `proud_of_this` or `never_again` (`mode = hard_truths`); caption required
- The Numbers — static stats
- Better Choices — static swaps
- Small Wins / rewards — streak + tasks
- Coach messages — static rotating copy

Each completed SOS inserts `sos_events`. No 24-hour push follow-up in v1.

Camera: `expo-image-picker` camera **and** library. Hard Truths validation: tag + non-empty caption or the save is rejected. Never send photo bytes to an LLM or caption generator.

No live call UI in v1 (remove the fake “Calling…” path rather than ship it).

## Community

Fourth tab. Global encouragement feed for signed-in members.

Table `community_posts`: `id`, `user_id`, `text`, `created_at`. RLS: `SELECT` for all authenticated users; `INSERT`/`DELETE` only where `user_id = auth.uid()`. No update (edit) in v1.

Feed row: display name + initials derived from profile, body text, relative time. Composer on the Community screen. You can delete your own posts only.

No likes, comments, DMs, reports, or moderation tools. Intended for a small trusted tester group, not a public social network. Circle.so is explicitly out of v1.

## Error handling

- Magic link expired or opened on the wrong device: sign-in screen with a plain “request a new link” action.
- Network / Supabase errors: inline message, no silent empty states that look like “you have no data” when the fetch failed.
- Photo upload failure: keep the local draft (caption/tag) and allow retry; do not insert `reinforcement_photos` without a successful storage object.
- RLS/auth missing session: send the user to sign-in; do not fall back to a demo user.

## Testing

- Unit: streak calculation, Hard Truths validation (missing caption/tag rejected), initials from name.
- Manual on device (Expo Go): magic-link round trip, profile save, journal + streak, SOS path, camera upload visible after reload, community post visible in a second account.

## Out of v1

- Circle.so, live coach/loved-one calling, restaurant, food alias, group challenge
- Push notifications, App Store, TestFlight, Apple Developer packaging
- Passwords, OAuth (Google/Apple), Next.js BFF
- Clinical/legal sign-off tracked in `SPEC.md` remains a Humanaut process item; this build is a functional prototype for testers who know it is a prototype

## Non-goals for this repo’s Next.js tree

Do not add auth, Capacitor, or new features to the Next.js app as part of this work. Point README at `apps/mobile` as the product when implementation starts.
