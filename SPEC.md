# Humanaut SOS — Product Spec (v0.1)

## What this is

An in-the-moment support feature for Humanaut Health members working on diet /
weight-loss goals. Two entry points from a persistent SOS button:

1. **"Help! I'm about to go off the rails"** — urgent, in-the-moment support
2. **"Assistance needed for a planned event"** — advance notice (holidays,
   celebrations, travel)

Secondary goal: add something genuinely engaging to the Humanaut app. Health
and wellness is serious; this feature doesn't have to be.

Full original concept: see `docs/Diet_SOS_Button.pptx` (source deck) and
`docs/clickable-prototype.html` (brand-matched clickable prototype — build
this UI against that prototype's screens and copy).

## Reinforcement types (v1 scope candidates)

| Type | Description | Build cost | v1? |
|---|---|---|---|
| Remember Your Why | User's own goals/photos/captions | Low | Yes |
| The Numbers | Curated health-risk stats | Low | Yes |
| Small Wins | Reward milestone tracker | Low | Yes |
| Better Choices | Food swap suggestions | Low (static list) / Medium (AI-generated) | Yes (static) |
| Hard Truths | User-selected photos (flattering OR unflattering, user's choice) + user-written captions, blunt coach tone | Medium | Yes |
| Daily journal | Freeform daily check-in | Low | Yes |
| Community support | Feed of encouragement from other members | Medium | v2 |
| Talk to a coach | Live call, real staffed coach queue | High (staffing + telephony) | v2 |
| Talk to a loved one | Live call to opted-in contact | High (telephony + consent flow) | v2 |
| Coach messages | Rotating message library, 2 original personas (Marcus/Elena) | Low | Yes |
| Group challenge | Weight-loss challenge with pooled prizes | Medium | v2 |
| Restaurant finder | AI menu scan/ranking | High | v2/v3 |
| Food alias | Craving → healthier swap finder | Medium (AI) | v2 |

## Critical design constraint: Hard Truths

This is the "no cheerleading" reinforcement mode. It must stay strictly
opt-in AND user-authored:

- **User selects the photo.** Can be flattering ("proud of this") or
  unflattering ("never again") — their choice, tagged by them.
- **User writes the caption.** Humanaut/the app never generates captions,
  commentary, or judgments about the user's appearance.
- Coach Marcus's message tone can be blunt/direct, but must reference the
  user's own stated goals/stakes — never appearance-based mockery.
- Rationale: system-generated body-shaming content is a documented trigger
  for disordered eating. User-authored content, opted into, is a materially
  different (and acceptable) product decision. Do not let this constraint
  erode over future iterations without clinical sign-off.

## Before building further

- [ ] Clinical sign-off from Humanaut's medical team (Amy Killen et al.) on
      reinforcement mechanics, especially Hard Truths
- [ ] Legal review of consent flow for loved-one calling feature (T&Cs,
      opt-out)
- [ ] Decide v1 cutline from the table above
- [ ] Decide coach staffing model before building the live-call feature

## Brand

Full brand reference lives in `app/globals.css` (Tailwind theme tokens) and
`docs/clickable-prototype.html` (reference UI). Source of truth: Humanaut
Health Brand Guidelines 2025 (Google Drive) + humanauthealth.com.

- Ink `#141B1D` / Ember `#FF7348` / Ember tint `#FFDCD1` / body gray `#484E4F`
- Darker Grotesque (headlines) + Helvetica (body)
- Material Symbols icon set
- 16px / 8px corner radii, soft shadows, no decorative stripes/accent bars

## Tech stack (v1)

- Next.js (App Router) + TypeScript + Tailwind — this repo
- PostgreSQL + Prisma — see `prisma/schema.prisma` (draft data model)
- Auth: TBD (Clerk or NextAuth) — not yet wired up
- Photo storage: TBD (Supabase Storage recommended — private bucket, signed URLs)
- Deploy: Vercel

## Not yet built in this repo

Everything here is scaffolding + the Home screen only. Next slices, in
suggested order:
1. SOS entry → reinforcement type picker (`/sos`, `/sos/rails`, `/sos/planned`)
2. Remember Your Why + Hard Truths screens (photo upload UI, needs storage
   provider decided first)
3. Daily journal
4. Auth + real Prisma-backed data (currently Home page uses static
   placeholder data)
5. Coach messages (static content, no backend needed)
6. Everything marked "v2" above
