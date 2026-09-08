# Humanaut SOS

In-the-moment diet and relapse support for Humanaut Health members. This repository is the standalone SOS product. It is not wired into the main Humanaut app.

The real app lives in the `apps/mobile` folder. It is an iPhone app (Expo / React Native) that talks to Supabase for sign-in, data, and photos.

This guide is written so someone who is not a developer can pull the latest work, run the app on a phone, save changes back to `main`, and update the live database. If a word is new, it is explained the first time it appears.

The Next.js site at the repo root (`app/` and `npm run dev` from the top folder) is an **old clickable wireframe only**. Do not use it as the product, and do not treat it as a live server for the phone app.

---

## Typical day (do these in order)

1. **Get the latest code** (pull from `main`). See [Pull the latest from main](#pull-the-latest-from-main).
2. If anyone changed app packages, run the install step in that same section.
3. If anyone added files under `supabase/migrations`, **update the database**. See [Update the database](#update-the-database). Pulling code does **not** update the live database by itself.
4. **Start the local server**. See [Start the local server](#start-the-local-server).
5. **Open Humanaut SOS** on your iPhone (the orange app, not Expo Go). See [Use the app in development mode](#use-the-app-in-development-mode).
6. When your work is ready to share, **commit and push to `main`**. See [Save your work to main](#save-your-work-to-main).

If this is a brand new computer, start at [First-time setup](#first-time-setup) instead.

---

## Words you will see

| Word | Plain meaning |
| --- | --- |
| **GitHub** | The shared locker on the internet that holds this project. Address: [https://github.com/ajr-hh/sso_app](https://github.com/ajr-hh/sso_app) |
| **`main`** | The official copy of the project. This team works directly on `main`. |
| **Pull** | Download the official copy onto your computer so you are not behind. |
| **Commit** | Take a named snapshot of the files you changed on your computer. |
| **Push** | Send that snapshot to GitHub so everyone else can pull it. |
| **Local server** (also called Metro) | A program that stays running in a Terminal window and sends the latest app code to your phone. |
| **Development app** | The **Humanaut SOS** icon on your iPhone. It is a special build that can load live code from your computer. It is **not** the Expo Go app. |
| **Database** (Supabase) | Where member accounts, profiles, and SOS data live. Project name: **sos_hh**. |
| **Migration** | A saved SQL file that changes the database. New files appear in `supabase/migrations`. |
| **`.env` file** | Private keys on your computer only. Never commit this file. Never paste it into Slack or email. |

---

## What you need

Ask a teammate to invite you to all four of these before you start:

1. The GitHub repo **ajr-hh/sso_app**
2. The Expo organization **humanauthealth** (project slug `hh-sos-app`)
3. The Supabase project **sos_hh**
4. The Humanaut SOS **development build** installed on your iPhone (orange icon). If you do not have it, see [Install or rebuild the iPhone development app](#install-or-rebuild-the-iphone-development-app).

On your Mac you also need:

- [GitHub Desktop](https://desktop.github.com) (the easiest way to pull, commit, and push)
- [Cursor](https://cursor.com) or another editor, so you can open the project and a Terminal
- [Node.js LTS](https://nodejs.org) (pick the LTS button, currently 20 or newer)
- The same Wi-Fi as your iPhone when you run the app

You do **not** need to know how to write code to follow the daily steps.

---

## Pull the latest from main

Do this at the start of every work session, and again if someone else just pushed.

### Option A: GitHub Desktop (recommended)

1. Open **GitHub Desktop**.
2. In the top left, make sure the current repository is **sso_app**.
3. In the top bar, the current branch must say **main**. If it says something else, click it and choose **main**.
4. Click **Fetch origin**. This only checks GitHub. It does not change your files yet.
5. If the button changes to **Pull origin**, click **Pull origin**.
6. Wait until it finishes. You now have the official copy.

If GitHub Desktop warns that you have local changes that would be overwritten, stop. Either finish [saving your work](#save-your-work-to-main) first, or ask a teammate. Do not click through a warning you do not understand.

### Option B: Terminal

In Cursor, click anywhere in the file tree so you are in the **sso_app** project, then open a Terminal (**Terminal → New Terminal**) and paste:

```bash
git pull origin main
```

Cursor’s Terminal usually opens already inside the project folder. If the command says it is not a git repository, type `cd` then a space, drag the **sso_app** folder from Finder onto the Terminal window, press Return, and try `git pull origin main` again.

### After a pull: install packages if needed

If the pull mentioned `apps/mobile/package.json` or `apps/mobile/package-lock.json`, install those packages before you start the server:

```bash
cd apps/mobile
npm install --legacy-peer-deps
```

That `cd` line assumes the Terminal is already in the **sso_app** folder. The `--legacy-peer-deps` flag is required for this project. Leave it in. Expo cloud builds read `apps/mobile/.npmrc` so they use the same setting without you typing the flag.

If the pull added files under `supabase/migrations`, go to [Update the database](#update-the-database) next. Do not skip that.

---

## Start the local server

The phone app does not contain the latest screens by itself. While you are developing, your Mac must keep a local server running.

1. In Cursor, open the **sso_app** folder.
2. Open a Terminal (**Terminal → New Terminal**).
3. Paste this and press Return:

```bash
cd apps/mobile
npm start
```

If you already ran `cd apps/mobile` in this same Terminal, skip that line and just run `npm start`.

4. Wait until you see a QR code and text that mentions Metro / Expo.
5. **Leave this window open.** Closing it, or pressing Ctrl+C, stops the app on your phone from loading new code.

The first start after an install can take a minute. If it asks you to press `i` (iOS simulator) you can ignore that. This team uses a real iPhone.

If the command says `npm: command not found`, Node.js is not installed. Install LTS from [nodejs.org](https://nodejs.org), quit and reopen Terminal, and try again.

If it says modules are missing, run the `npm install --legacy-peer-deps` command from the pull section, then `npm start` again.

---

## Use the app in development mode

Development mode means: the **Humanaut SOS** app on your phone, plus the local server on your Mac.

1. Make sure the local server is still running (previous section).
2. Put your iPhone on the **same Wi-Fi** as your Mac.
3. Open the orange **Humanaut SOS** app. Do **not** open **Expo Go**. Expo Go will show the wrong splash screen and can miss native features this app needs.
4. If the app asks to connect to a development server, choose the computer that is running `npm start`, or scan the QR code from that Terminal window.
5. Sign in with your email. Supabase emails a numeric code. Type that code in the app. See [Email sign-in codes](#email-sign-in-codes) if the email contains a link instead of a number.

You should see the orange Humanaut SOS mark on launch, then sign-in or the home tabs.

### If the phone cannot find the server

- Confirm the Terminal is still running `npm start` and has not printed an error.
- Confirm phone and Mac are on the same Wi-Fi, not a guest network or phone hotspot mismatch.
- Wake the Mac. Sleeping the laptop often drops the connection.
- In the Terminal running Metro, press `r` to reload, or shake the iPhone and tap **Reload**.
- If you recently installed new native packages (anything that required `eas build`), you need a new development app. See [Install or rebuild the iPhone development app](#install-or-rebuild-the-iphone-development-app).

### What you can test this way

Almost all product work: sign-in, profile, SOS rails, Better Choices, journal, community, photos. The phone is talking to the **live sos_hh** database, so treat data as real. Prefer your own test account.

---

## Save your work to main

This team commits and pushes directly to **main**. Only do this when you want everyone else to receive your changes.

Never commit these:

- `apps/mobile/.env` (private keys)
- anything inside `supabase/.temp/` (Supabase’s local cache)
- files named `.pem`, `.p8`, `.p12`, or anything that looks like a password or API key

If GitHub Desktop or Cursor offers to include those files, **uncheck them**.

### Option A: GitHub Desktop (recommended)

1. Open **GitHub Desktop**. Branch must be **main**.
2. On the left you will see a list of changed files. Click each one and glance at the right-hand preview so you are not committing a surprise.
3. Uncheck anything in the “never commit” list above.
4. At the bottom left, type a short summary of **why** you changed things, not a file list. Example: `Show the orange SOS mark while the app is loading`.
5. Click **Commit to main**.
6. Click **Push origin**. Until you push, only your computer has the snapshot.

If **Push origin** is greyed out, you may already be in sync, or you have not committed yet.

### Option B: Cursor

1. Click the branch / source-control icon in the left sidebar (it looks like a fork, and may show a number).
2. Review the file list. Uncheck secrets.
3. Type the same kind of short message.
4. Click **Commit**.
5. Click **Sync** or **Push**.

### Option C: Terminal

```bash
git status
git add -p
git commit -m "Your short why-message here"
git push origin main
```

Run these from the **sso_app** folder, not from `apps/mobile`.

If you are not comfortable with `git add -p`, use GitHub Desktop instead. Do not run force-push (`git push --force`) against `main`.

### After you push

Tell teammates they should **pull**. If you added a file under `supabase/migrations`, they must also [update the database](#update-the-database). The person who wrote the migration should apply it to **sos_hh** the same day, or say clearly who will.

---

## Update the database

Two different things get out of date:

1. **The code on your computer** (fixed by pull).
2. **The live database on Supabase** (fixed only by applying migrations).

A migration is a file like `supabase/migrations/20260908183000_lock_legacy_prisma_tables.sql`. The date at the front is the order. Always apply oldest first.

### When you must do this

- You pulled and new files appeared in `supabase/migrations`.
- You wrote a new migration yourself.
- Sign-in or a screen fails with a database or “permission denied” error after someone else shipped a schema change.

### Preferred method: Supabase CLI (`db push`)

This records which files the live project has already applied, so you do not run the same change twice.

First time on a computer (one-time):

```bash
npx supabase login
npx supabase link --project-ref cxvsqsxhezroebinasdy
```

A browser window will ask you to log into Supabase. The project ref above is **sos_hh**.

Every time you need to apply new migrations:

```bash
npx supabase db push
```

Run that from the **sso_app** folder (the one that contains the `supabase` directory).

Read the list it prints. Type `Y` only if the file names match the new migrations you expect. If it wants to drop a table or delete data and you did not ask for that, type `N` and stop.

### Backup method: Supabase Dashboard SQL editor

Use this only if the CLI is not set up.

1. Open [https://supabase.com/dashboard](https://supabase.com/dashboard) and choose project **sos_hh**.
2. Left sidebar → **SQL Editor** → **New query**.
3. On your computer, open the new file in `supabase/migrations` (oldest new date first).
4. Copy the **entire** file and paste it into the SQL editor.
5. Click **Run**.
6. If there are several new files, run the next one the same way, in date order.
7. Tell a technical teammate that you applied the files in the dashboard, so they can keep the official migration history in sync with `npx supabase db push` later.

Do **not** re-run the giant first file `20260903120000_init.sql` as a shortcut after the project is already live. Later files already assume that first file was applied once.

### Rules that protect member data

- Do not drop tables unless a technical person has marked that change as a deliberate `DROP`.
- Do not paste production data into Slack.
- Ordinary delete-in-the-app is a **soft delete**: the row stays in the database with `deleted = true`, and the app hides it. Deleting a member in **Supabase → Authentication** is permanent and removes that person’s app data.

---

## First-time setup

Do this once per new computer. After this, use the typical-day list at the top.

### 1. Install tools

1. Install [GitHub Desktop](https://desktop.github.com) and sign in with the GitHub account that has access to **ajr-hh/sso_app**.
2. Install [Node.js LTS](https://nodejs.org).
3. Install [Cursor](https://cursor.com).
4. Optional, for database updates from Terminal: you will use `npx supabase` (no separate install required).

### 2. Get a copy of the project

**GitHub Desktop:** File → **Clone repository** → choose **ajr-hh/sso_app** → pick a folder on your Mac → **Clone**.

**Terminal:**

```bash
git clone https://github.com/ajr-hh/sso_app.git
cd sso_app
```

Then open that folder in Cursor (**File → Open Folder**).

### 3. Install the phone app packages

```bash
cd apps/mobile
npm install --legacy-peer-deps
```

### 4. Create your private `.env` file

1. In `apps/mobile`, copy `.env.example` and name the copy `.env`.
2. Open [Supabase](https://supabase.com/dashboard) → **sos_hh** → **Project Settings → API**.
3. Paste these two values only:

```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

4. Save the file. Do not add `OPENAI_API_KEY` here. The phone must never hold that key.

### 5. Install the development app on your iPhone

See the next section. You cannot finish first-time setup with Expo Go alone.

### 6. Email templates (once per Supabase project, not per laptop)

See [Email sign-in codes](#email-sign-in-codes). If a teammate already did this on **sos_hh**, skip it.

### 7. Start and sign in

Follow [Start the local server](#start-the-local-server) and [Use the app in development mode](#use-the-app-in-development-mode).

---

## Install or rebuild the iPhone development app

The development app is a real iPhone install with the orange Humanaut SOS icon. You need it because this project uses a custom splash screen and native modules that Expo Go does not provide.

You only need a **new** build when:

- you have never installed Humanaut SOS on this phone, or
- someone added or changed a native package (for example `expo-dev-client`, image picker, splash screen) and the old app crashes or will not connect.

Day-to-day screen and copy changes do **not** need a new build. `npm start` is enough.

### Install a build that already exists

1. Sign in at [https://expo.dev](https://expo.dev) as a member of **humanauthealth**.
2. Open the project **hh-sos-app**.
3. Open **Builds** and find the latest successful **iOS** build with profile **development**.
4. Install it on your iPhone from the link Expo gives you (email, QR, or the build page). You must be in the internal distribution list.
5. After it installs, still run `npm start` on your Mac whenever you want live code.

### Make a new development build

From a Terminal, after you are logged into Expo (`npx eas login`):

```bash
cd apps/mobile
npx eas build --platform ios --profile development
```

Wait for Expo to finish (often 10–20 minutes). Install from the build page. Then start the local server again.

This does **not** publish to the App Store. It only makes an internal development copy.

Do not run `eas build`, `eas submit`, or `expo prebuild` unless you mean to. Those are slow and, for submit, go toward TestFlight / the store.

---

## Email sign-in codes

Sign-in uses an emailed **number**, not a magic link. There is no redirect URL to configure.

Supabase sends a link unless the email templates include `{{ .Token }}`. A teammate should already have set this on **sos_hh**. If new testers get a link instead of a code, fix it:

1. Supabase → **sos_hh** → **Authentication → Emails**.
2. Edit **Magic Link** (existing members) and **Confirm signup** (first time).
3. Use copy like:

```html
<h2>Your Humanaut SOS code</h2>
<p>Enter this code to sign in: {{ .Token }}</p>
```

Code length lives at **Authentication → Sign In / Providers → Email → Email OTP length** (6 to 10 digits). The app accepts that whole range. Codes expire after 1 hour and can be requested once every 60 seconds.

---

## Secrets and the AI feature

The phone app is only allowed to know:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Better Choices recipes, menu scan, and other generated copy go through the Supabase Edge Function `sos-generate`. That function reads `OPENAI_API_KEY` on the server.

To set or rotate that key (technical step, do not put it in `apps/mobile/.env`):

1. Supabase → **sos_hh** → **Edge Functions → Secrets** (or `npx supabase secrets set OPENAI_API_KEY=...` from this repo).
2. Deploy only when the function code changed:

```bash
npx supabase functions deploy sos-generate
```

Run that from the **sso_app** folder.

If generation features fail but the rest of the app works, the usual cause is a missing function secret or a function that was never deployed. Not a phone `.env` problem.

---

## Tests (optional)

From `apps/mobile`:

```bash
cd apps/mobile
npm test -- --watchman=false
```

You want to see the run finish with no failed tests. If you do not write code, you can skip this unless a teammate asks you to run it.

---

## If something goes wrong

| What you see | What to try |
| --- | --- |
| GitHub Desktop will not pull | Fetch first. If it still complains about local changes, commit or ask a teammate. Do not force-push. |
| `npm start` dies immediately | Run `npm install --legacy-peer-deps` inside `apps/mobile`, then start again. |
| Phone shows Expo Go or the old splash | You opened the wrong app. Open **Humanaut SOS**. Keep `npm start` running. |
| Phone spins and never loads | Same Wi-Fi, Mac awake, Terminal still running. Reload. |
| Sign-in email is a link | Fix the two Supabase email templates. |
| App says it cannot reach Supabase | Check `apps/mobile/.env` has both `EXPO_PUBLIC_` values and that you restarted `npm start` after editing `.env`. |
| App works until a new screen that needs new tables | You pulled code but did not [update the database](#update-the-database). |
| You committed a secret by mistake | Tell a technical teammate immediately so the key can be rotated. Do not try to hide it with another commit. |

---

## Extra product notes

- **Brand.** Ember `#FF7348` (splash uses `#FF7248` to match the icon), ink `#141B1D`. Full brand lives in the Humanaut Health Brand Guidelines and `docs/clickable-prototype.html`.
- **Design spec.** [docs/superpowers/specs/2026-09-03-expo-sos-app-design.md](docs/superpowers/specs/2026-09-03-expo-sos-app-design.md)
- **Implementation plan.** [docs/superpowers/plans/2026-09-03-expo-sos-app.md](docs/superpowers/plans/2026-09-03-expo-sos-app.md)
- **Old browser prototype.** [docs/clickable-prototype.html](./docs/clickable-prototype.html)

## Stack

Expo SDK 57 · Expo Router · TypeScript · Supabase (Auth, Postgres, Storage, Edge Function `sos-generate`) · EAS (development and store builds)

## Old Next.js wireframe

The root `package.json` scripts (`npm run dev`, Prisma, and so on) start the historical visual reference, not Humanaut SOS. Do not run Prisma migrate against **sos_hh** unless a technical person is deliberately working on that wireframe. The Expo app does not use Prisma.
