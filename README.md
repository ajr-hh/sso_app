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

### Email sign-in codes

Sign-in uses a 6-digit emailed code, not a magic link, so there is no redirect
URL to configure and the code can be read on any device.

Supabase sends a link by default, so update two templates under **Supabase
Dashboard → Authentication → Emails** to include the `{{ .Token }}` variable:

- **Magic Link** — used for members who already exist
- **Confirm signup** — used the first time an email signs in

For example:

```html
<h2>Your Humanaut SOS code</h2>
<p>Enter this code to sign in: {{ .Token }}</p>
```

Codes expire after 1 hour and can be requested once every 60 seconds; both are
configurable under **Authentication → Sign In / Providers → Email**.

## Stack

Expo · Expo Router · TypeScript · Supabase (Auth, Postgres, Storage)
