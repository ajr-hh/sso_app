# Better Choices Cravings and Swaps

Date: 2026-09-06  
Status: approved for implementation  
Product: Humanaut SOS Expo app

## Goal

Turn Better Choices from a static catalog page into a personal swap tool: members record food rules and usual cravings, then in an SOS moment they pick one craving and get swaps that still feel satisfying while being a better nutritional choice overall. Unknown cravings can request generated ideas; the member stars the ones to keep. Web is unchanged.

## Decisions already locked

- “Better” means similar satisfaction with better nutrition overall, not calorie-only or protein-only.
- Food rules (allergies and diet flags) are required before personalized swaps.
- Usual cravings can be added from Profile and from Better Choices.
- New, unrecognized cravings use AI to propose candidates; members star favorites. Future visits show starred swaps first.
- SOS layout A: craving chips on one screen, “Try instead” list for the selected chip.
- Recommendation approach: shipped catalog first, then saved favorites, then AI for gaps.
- Other reinforcement types will need model input/output later, so the first AI path is a shared generation gateway, not a food-only one-off.

## Shared generation gateway

Add one authenticated Supabase Edge Function, `sos-generate`, and one owner-scoped table, `public.generation_jobs`. Better Choices is the first `kind`. Later rails (coach messages, hard truths, and others) add a kind and a payload schema without a second HTTP stack or a second key path.

The Expo app never holds a provider key. It calls `sos-generate` with the user JWT.

Request shape:

- `kind` — closed set; v1 is only `food_swaps`
- `input` — kind-specific JSON (for `food_swaps`: craving label, diet flags, allergens)
- The client does not send a free-form prompt

Response shape:

- `job_id`
- `status`: `succeeded` | `failed`
- `output` — kind-specific JSON (for `food_swaps`: `{ "swaps": string[4] }`)
- `error` — generic user-facing string; never echo allergens, craving text, or model traces to logs or client errors

`generation_jobs` stores `id`, `user_id`, `kind`, `status`, `created_at`, `finished_at`, and opaque input/output JSON. Row-level security: the owner may select and insert their own jobs; they may not update or delete. The function uses the service role only to write status and output on the same row. Do not log PHI-like fields (allergen lists, diet flags, craving labels) in function `console` output; log `job_id`, `kind`, and `status` only.

The function rejects unknown kinds, unauthenticated callers, and `food_swaps` calls when `food_rules_set` is not true for that user. It applies the same dietary filter the client uses for catalog rows before returning swaps.

v1 does not generate coach copy or hard truths. Those kinds are out of scope; the gateway and table exist so they can be added without rewriting auth, billing, or job storage.

## Profile

### Food rules

Add a Profile tile **Food rules** with supporting copy: “We’ll never suggest a swap that breaks these.”

The member must save this tile once before Better Choices personalizes:

- Allergies: add/remove short labels (trim, 1–40 characters, max 20, case-insensitive unique).
- Diet chips: None, Vegetarian, Vegan, Nut-free, Dairy-free, Gluten-free. None clears the other diet chips.

Saving with None and no allergies is valid and sets `food_rules_set` to true. Until `food_rules_set` is true, Better Choices does not show catalog, favorites, or generate.

### Usual cravings

Add a Profile tile **Usual cravings**: saved labels as chips or rows, Remove (confirm, then soft-delete), and **Add a craving**. Add opens a flyout with a single required name field. Duplicate active labels (case-insensitive) stay in the flyout with a validation error.

## Better Choices screen

Keep the existing SOS stack screen: back control, no tab bar, existing eyebrow **BETTER CHOICES**. Title: **What are you craving?** Subtitle: **Tap one, then pick a swap that still feels satisfying.**

States:

1. Food rules not set — one card pointing to Profile Food rules. No chips, no generate.
2. No cravings — empty copy plus **Add a craving** (same flyout as Profile).
3. Ready — chips for active cravings; the first chip is selected on open. **Try instead** lists starred swaps first, then other non-starred catalog or previously generated candidates that still pass food rules. Each row has a star control. **Add a craving** sits under the list. A new craving becomes the selected chip.

Resolver for the selected craving, in order:

1. If the label matches the shipped catalog (case-insensitive), start from those swaps, minus rule violations.
2. Union in saved `craving_swaps` for that craving; starred rows always sort first.
3. If after filtering there is no catalog match and no saved rows, show **Get swap ideas** (not an automatic call on chip select). Success inserts four `source = ai` rows, unstarred. The member stars keepers.
4. If every catalog/AI candidate is filtered out, show “Nothing here fits your food rules” and allow a custom typed swap (`source = custom`, saved as favorited).

Ice cream in the shipped catalog keeps the four swaps already in `food-swaps.ts`, including apple with peanut butter. Peanut butter is tagged so a peanut or nut rule hides it.

## Data model

Migration after `20260904183000_accountability_contacts.sql`.

### `profiles`

- `food_rules_set boolean not null default false`
- `diet_flags text[] not null default '{}'` with a check that every value is in `vegetarian`, `vegan`, `nut_free`, `dairy_free`, `gluten_free`
- `allergens text[] not null default '{}'`

Extend the existing profiles UPDATE grant so these three columns are writable. Do not grant `food_rules_set` independently of a normal profile save; the client sets it true when Food rules is saved.

Allergens and diet flags are health-related personal data: owner RLS only, no community views, no error strings that repeat their values.

### `public.cravings`

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `label text not null` with trim/length checks (1–60)
- `sort_order integer not null default 0`
- `created_at timestamptz not null default now()`
- `deleted boolean not null default false`
- `deleted_at timestamptz`
- `check (deleted = (deleted_at is not null))`

Partial unique index on `(user_id, lower(label))` where `deleted = false`. Index `(user_id, sort_order, id)` for active rows.

RLS: owner select/insert/update. No physical delete. Update grant may include label, sort_order, deleted, deleted_at.

### `public.craving_swaps`

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `craving_id uuid not null references public.cravings(id)` (do not cascade delete; soft-delete the craving instead)
- `label text not null` (1–80 after trim)
- `favorited boolean not null default false`
- `source text not null check (source in ('catalog', 'ai', 'custom'))`
- `created_at timestamptz not null default now()`
- `deleted boolean not null default false`
- `deleted_at timestamptz`
- `check (deleted = (deleted_at is not null))`

Partial unique index on `(craving_id, lower(label))` where `deleted = false`. Index `(craving_id, favorited desc, created_at, id)` for active rows.

RLS: owner select/insert/update. No physical delete. Starring updates `favorited`.

### `public.generation_jobs`

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `kind text not null check (kind in ('food_swaps'))` — later migrations widen this check
- `status text not null check (status in ('pending', 'succeeded', 'failed'))`
- `input jsonb not null default '{}'`
- `output jsonb`
- `error text`
- `created_at timestamptz not null default now()`
- `finished_at timestamptz`

RLS: owner select and insert. No update or delete for `authenticated`. The Edge Function writes completion using the service role, constrained to the job id it created for that user.

## Catalog

Keep `apps/mobile/src/content/food-swaps.ts` as the human-edited library. Add a parallel tag map (same module or an adjacent `food-swap-tags.ts`) so filtering can hide a swap when tags intersect allergens or diet flags (for example peanut butter → `peanuts`, `nuts`). Matching a catalog craving is case-insensitive on the craving label.

The client may insert catalog rows into `craving_swaps` with `source = catalog` when the member first opens that craving so starring has a stable id. It must not insert duplicates of an active label.

## Component boundaries

- `food.tsx` owns SOS screen state: selected craving, load/mutation revision, generate-in-flight, banners.
- Profile owns Food rules save and Usual cravings list; it reuses craving data functions, not a second write path.
- `src/presentation/foodRules.ts` owns diet constants, allergen normalization, `food_rules_set` rules, and swap filtering.
- `src/presentation/cravings.ts` owns label validation and chip/list view helpers.
- `src/data/cravings.ts` and `src/data/cravingSwaps.ts` own Supabase access; never accept a caller-supplied user id.
- `src/data/generate.ts` owns the `sos-generate` invoke, job id handling, and mapping of `food_swaps` output. Later kinds add functions in this module rather than new HTTP clients.
- `src/content/food-swaps.ts` remains static content.

## Accessibility

- Craving chips are a tab-like single-select group with selected state.
- Star controls have labels that include the swap text (“Save apple with a little peanut butter”).
- Add-craving flyout matches Your people: title, labeled field, cancel, focus in, keyboard avoidance.
- Food-rules-missing, empty, filtered-out, and generate-failure states use alert or status semantics as appropriate.
- Generate busy state disables a second submit.

## Errors and races

- Invalid add-craving input stays in the flyout.
- Load failures use ErrorBanner and retry; a retry must not apply if a newer load or mutation has started (same revision pattern as Your people).
- Generate failure: banner and retry; do not invent local swaps.
- Do not include allergen, diet, or craving strings in thrown client messages; use `explainError` on transport failures.

## Testing

TDD for:

- Diet/allergen normalization and catalog filtering (ice cream + nut_free hides peanut/almond butter swaps).
- Resolver order: catalog, then favorites first, then generate CTA when empty.
- Craving and swap validation, duplicate labels, soft-delete uniqueness.
- Data layer owner scoping for fetch/insert/star/remove.
- `sos-generate` request validation for unknown kind and missing food rules (function tests or a pure request-builder test plus a mocked invoke).
- Profile `food_rules_set` false blocks generate and catalog display.

Run the mobile Jest suite and `tsc --noEmit`. Request iOS and Android bundles from the running Expo server after UI work.

## Out of scope

- Web Better Choices, alias tool, and Prisma kryptonite tables.
- Generating coach messages, hard truths, or other kinds in v1.
- Nutrition database / calorie counts.
- Sharing cravings with coaches or loved ones.
- Editing a craving label in place (remove and add instead).
- Automatic generate on chip select.
- Streaming model output.
- Device address book or photo of a menu.
