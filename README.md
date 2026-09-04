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
3. In the Supabase SQL editor, apply the whole of
   [`supabase/migrations/20260903120000_init.sql`](./supabase/migrations/20260903120000_init.sql).
   It is idempotent, so re-run the entire file after pulling schema updates
   (including to enable soft delete) or if a partial run ever fails.
4. Start the dev server:

   ```bash
   cd apps/mobile && npm start
   ```

5. Open **Expo Go** on your phone and scan the QR code.

### Data deletion

Ordinary deletion in the app is a soft delete: it sets `deleted = true` and
`deleted_at`, while retaining the database row. The app only shows rows where
`deleted` is false. Re-run the whole
[`supabase/migrations/20260903120000_init.sql`](./supabase/migrations/20260903120000_init.sql)
file for these changes to take effect. Deleting a Supabase Auth account is
permanent account erasure and cascades to that member's app data.

The legacy Next.js wireframe uses Prisma separately. If you run that reference
app against an existing database, apply its migrations with:

```bash
npx prisma migrate deploy
```

### Email sign-in codes

Sign-in uses an emailed numeric code, not a magic link, so there is no redirect
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

Code length is a project setting — **Authentication → Sign In / Providers →
Email → Email OTP length** — and is 6 to 10 digits depending on when the project
was created. The app accepts that whole range, so no client change is needed if
you adjust it. Codes expire after 1 hour and can be requested once every 60
seconds; both are configurable in the same place.

## Stack

Expo · Expo Router · TypeScript · Supabase (Auth, Postgres, Storage)
