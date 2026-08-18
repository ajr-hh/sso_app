# Humanaut SOS

In-the-moment diet/relapse support feature for Humanaut Health members.
Standalone codebase (not wired into the main Humanaut app).

**Start here:** [`SPEC.md`](./SPEC.md) — full product spec, scope decisions,
and what's built vs. not yet built.

**Design reference:** [`docs/clickable-prototype.html`](./docs/clickable-prototype.html)
— open this in a browser for the full brand-matched clickable prototype
covering every screen. Source deck: [`docs/Diet_SOS_Button.pptx`](./docs/Diet_SOS_Button.pptx).

## Getting started

```bash
npm install
cp .env.example .env    # fill in DATABASE_URL once you've picked a Postgres provider
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — redirects to `/home`.

## What's actually built right now

Just the Home screen (`app/(app)/home/page.tsx`), using static placeholder
data and the brand-tokenized Tailwind theme (`app/globals.css`). Everything
else is scaffolding: folder structure under `app/(app)/` for `sos`,
`journal`, `community`, and a draft Prisma schema (`prisma/schema.prisma`)
that isn't connected to a real database yet.

See `SPEC.md` → "Not yet built in this repo" for the suggested build order.

## Stack

Next.js (App Router) · TypeScript · Tailwind v4 · Prisma (schema drafted,
not connected) · Postgres (not provisioned yet) · Vercel (not deployed yet)
