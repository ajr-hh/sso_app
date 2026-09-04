# Humanaut SOS Expo App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a functional Expo app in `apps/mobile` where a member can magic-link in, own their profile/journal/SOS/photos, and use a small community feed — runnable on a phone via Expo Go.

**Architecture:** React Native (Expo Router) talks to Supabase Auth, Postgres (RLS), and a private Storage bucket. Domain rules live in pure TypeScript with Jest. The Next.js tree is visual/copy reference only.

**Tech Stack:** Expo + Expo Router + TypeScript, `@supabase/supabase-js`, Expo SecureStore, expo-image-picker, expo-image-manipulator, Jest + jest-expo.

**Spec:** `docs/superpowers/specs/2026-09-03-expo-sos-app-design.md`

## Global Constraints

- Product path is `apps/mobile/` only; Next.js `app/` is reference, not an API.
- Auth is magic-link email via `signInWithOtp` — no passwords, OAuth, Clerk, or NextAuth.
- Hard Truths: member chooses the photo and writes the caption; never generate captions or appearance commentary.
- No live calling, restaurant, food alias, group challenge, Circle.so, push, TestFlight, or App Store.
- Client env: `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` only.
- Brand: Ink `#141B1D`, Ember `#FF7348`, canvas `#F6F6F6`.
- Deep link scheme: `humanaut-sos`.
- Storage bucket: `sos-photos`, object key `{user_id}/{uuid}.ext`.
- Do not fall back to a demo user when auth is missing.
- Commits: as each task specifies while executing this plan; never `--no-verify`.
- Root `.gitignore` uses `.env*`; Task 1 must add `!apps/mobile/.env.example`.

## Tasks

### Task 1: Scaffold Expo app and Jest

Create `apps/mobile` with `npx create-expo-app@latest apps/mobile --template blank-typescript`, remove nested `.git`. Install expo-router, linking, secure-store, image-picker, image-manipulator, constants, font, splash-screen, safe-area, screens, gesture-handler, `@supabase/supabase-js`, jest, jest-expo, `@types/jest`. `main`: `expo-router/entry`. Scripts: start, android, ios, test. app.json name Humanaut SOS, slug humanaut-sos, scheme humanaut-sos, plugins expo-router, expo-secure-store, expo-image-picker. jest-expo preset, testMatch `**/*.test.ts`. `.env.example` with the two EXPO_PUBLIC keys. Sanity test 1+1, fail then pass. Expo start smoke. Commit `feat(mobile): scaffold Expo app and Jest`.

### Task 2: Domain lib

TDD then implement `toDayKey`, `addDays`, `journalStreak`, `initialsFromName`, `validateReinforcementPhoto`, `RAIL_OPTIONS` (no call), `rankRails`, `isPreferredRail`. Test cases: streak 0/3/1/dedupe; initials RT/JI/?; hard truths tag and caption errors; remember_why empty ok; rails prefer stats, omit call. Commit `feat(mobile): domain rules for streak, photos, rails`.

### Task 3: Static content

colors.ts + STATS, FOOD_SWAPS, COACH_LIBRARY, PLANNED_TIPS duplicated from wireframe `lib/demo-data.ts` and `lib/messages.ts`. content.test.ts. Commit `feat(mobile): static SOS content and brand colors`.

### Task 4: SQL

`supabase/migrations/20260903120000_init.sql` — profiles, goals, daily_tasks, journal_entries, sos_events, reinforcement_photos, community_posts; RLS; handle_new_user; sos-photos bucket. Commit `feat(db): initial SOS schema and storage RLS`.

### Task 5: Client

getSupabase (SecureStore), getSession, onAuthChange, explainError, Profile type. No demo user. tsc. Commit `feat(mobile): supabase client and session helpers`.

### Task 6: Auth UI

Root layout session, sign-in magic link, ErrorBanner, redirects. Commit `feat(mobile): magic-link sign-in`.

### Task 7: Chrome

Tabs Home/Activity/Community/Profile, Ember SOS to `/(app)/sos`. Commit `feat(mobile): app chrome with SOS button`.

### Task 8: Profile data + screen. Commit `feat(mobile): profile goals and tasks`.

### Task 9: Home + journal + streak. Commit `feat(mobile): home and journal`.

### Task 10: Community feed. Commit `feat(mobile): community feed`.

### Task 11: SOS paths, no call. Commit `feat(mobile): SOS paths and static reinforcements`.

### Task 12: Why/Hard Truths photos. Commit `feat(mobile): reinforcement photo capture`.

### Task 13: README points at Expo. Commit `docs: point README at Expo app`.
