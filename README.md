# Humanaut SOS

In-the-moment diet/relapse support for Humanaut Health members. Standalone codebase (not wired into the main Humanaut app).

## Product

The app lives in **`apps/mobile`** — an Expo (React Native) app with Supabase auth, Postgres, and storage.

The Next.js tree at the repo root (`app/`, `npm run dev`) is the **old wireframe and visual reference only**. It is not the product and is not an API.

## Docs

- [Design spec](docs/superpowers/specs/2026-09-03-expo-sos-app-design.md) — product goals, constraints, and data model
- [Implementation plan](docs/superpowers/plans/2026-09-03-expo-sos-app.md) — build tasks and acceptance criteria

Legacy reference: [`docs/clickable-prototype.html`](./docs/clickable-prototype.html) (browser prototype) and the Next.js screens under `app/`.

## Run the Expo app

1. Copy `apps/mobile/.env.example` to `apps/mobile/.env`.
2. Fill in `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` from your Supabase project.
3. In the Supabase SQL editor, apply [`supabase/migrations/20260903120000_init.sql`](./supabase/migrations/20260903120000_init.sql).
4. Start the dev server:

   ```bash
   cd apps/mobile && npm start
   ```

5. Open **Expo Go** on your phone and scan the QR code.

## Stack

Expo · Expo Router · TypeScript · Supabase (Auth, Postgres, Storage)
