# Better Choices Cravings and Swaps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let members set food rules and usual cravings, then pick a craving on Better Choices and star catalog or generated swaps that still fit those rules.

**Architecture:** Pure presentation modules own food-rule normalization, catalog filtering, and the swap resolver. Owner-scoped `cravings` / `craving_swaps` / `generation_jobs` tables plus profile columns persist data. A single `sos-generate` Edge Function is the only model I/O; the Expo app never holds a provider key. Profile and SOS share the craving data module.

**Tech Stack:** Expo 57, Expo Router, React Native 0.86, TypeScript 6, Supabase Postgres/Auth/RLS/Edge Functions, Jest 29.

**Spec:** `docs/superpowers/specs/2026-09-06-better-choices-swaps-design.md`

## Global Constraints

- Read Expo 57 docs at `https://docs.expo.dev/versions/v57.0.0/` before changing React Native UI.
- Preserve Ink `#141B1D`, Ember `#FF7348`, canvas `#F6F6F6`.
- Food rules are required before catalog, favorites, or generate appear on Better Choices.
- Allergens and diet flags are health-related personal data: owner RLS only; never put their values in logs, thrown messages, or ErrorBanner copy.
- Removal of cravings is a soft delete; do not grant physical delete on cravings, craving_swaps, or generation_jobs.
- v1 `kind` is only `food_swaps`. Do not generate coach or hard-truth copy.
- Web, Prisma kryptonite, calories, and auto-generate-on-select are out of scope.
- Work in an isolated git worktree. Do not mix unrelated uncommitted files into feature commits.

## File map

- `apps/mobile/src/presentation/foodRules.ts` — diet constants, allergen normalization, swap tag filtering
- `apps/mobile/src/presentation/cravings.ts` — craving/swap label validation
- `apps/mobile/src/presentation/swaps.ts` — resolver (catalog ∪ saved, favorites first, generate CTA)
- `apps/mobile/src/content/food-swaps.ts` — existing catalog plus `FOOD_SWAP_TAGS`
- `supabase/migrations/20260906120000_cravings_and_generation.sql` — schema
- `apps/mobile/src/types.ts` + `apps/mobile/src/data/profile.ts` — food rule fields
- `apps/mobile/src/data/cravings.ts` / `cravingSwaps.ts` / `generate.ts` — Supabase access
- `supabase/functions/sos-generate/index.ts` — Edge Function
- `apps/mobile/components/FoodRulesSection.tsx` / `UsualCravingsSection.tsx`
- `apps/mobile/app/(app)/(tabs)/profile.tsx` — wire the tiles
- `apps/mobile/app/(app)/sos/food.tsx` — layout A SOS screen

---

### Task 1: Food rules, tags, and swap resolver

**Files:**
- Create: `apps/mobile/src/presentation/foodRules.ts`
- Create: `apps/mobile/src/presentation/foodRules.test.ts`
- Create: `apps/mobile/src/presentation/cravings.ts`
- Create: `apps/mobile/src/presentation/cravings.test.ts`
- Create: `apps/mobile/src/presentation/swaps.ts`
- Create: `apps/mobile/src/presentation/swaps.test.ts`
- Modify: `apps/mobile/src/content/food-swaps.ts`

**Interfaces:**
- Produces: `DIET_FLAGS`, `DietFlag`, `FoodRules`, `normalizeAllergen(raw: string): string | null`, `normalizeAllergens(raw: string[]): string[]`, `getAllergenValidationError(raw: string, existing: string[]): string | null`, `toggleDietFlag(current: DietFlag[], flag: DietFlag | "none"): DietFlag[]`, `swapViolatesRules(swapLabel: string, tags: Record<string, string[]>, rules: FoodRules): boolean`, `filterSwapsByRules(labels: string[], tags: Record<string, string[]>, rules: FoodRules): string[]`.
- Produces: `getCravingLabelValidationError(raw: string, existingLower: string[]): string | null`, `normalizeCravingLabel(raw: string): string`, `getSwapLabelValidationError(raw: string): string | null`.
- Produces: `SwapRow`, `resolveSwapView(input: ResolveSwapInput): ResolveSwapView`.
- Consumes: `FOOD_SWAPS` from content (existing Ice cream list).

- [ ] **Step 1: Write failing food-rule tests**

```ts
import {
  filterSwapsByRules,
  getAllergenValidationError,
  normalizeAllergen,
  normalizeAllergens,
  toggleDietFlag,
} from "./foodRules";

const tags = {
  "Apple with a little peanut butter": ["peanuts", "nuts"],
  "Celery with almond butter": ["nuts"],
  "Protein shake with a few berries": [],
  "Frozen banana, blended": [],
};

describe("food rules", () => {
  test("normalizes allergen labels", () => {
    expect(normalizeAllergen("  Peanuts  ")).toBe("peanuts");
    expect(normalizeAllergen("   ")).toBe(null);
  });

  test("rejects blank, too long, too many, and duplicate allergens", () => {
    expect(getAllergenValidationError("  ", [])).toBeTruthy();
    expect(getAllergenValidationError("x".repeat(41), [])).toBeTruthy();
    expect(getAllergenValidationError("dairy", ["dairy"])).toBeTruthy();
    expect(
      getAllergenValidationError("soy", Array.from({ length: 20 }, (_, i) => `a${i}`)),
    ).toBeTruthy();
    expect(getAllergenValidationError("shellfish", [])).toBeNull();
  });

  test("None clears diet flags and a flag replaces None", () => {
    expect(toggleDietFlag(["vegetarian"], "none")).toEqual([]);
    expect(toggleDietFlag([], "vegan")).toEqual(["vegan"]);
    expect(toggleDietFlag(["vegan"], "vegan")).toEqual([]);
  });

  test("nut_free hides peanut and almond butter ice cream swaps", () => {
    const kept = filterSwapsByRules(Object.keys(tags), tags, {
      foodRulesSet: true,
      dietFlags: ["nut_free"],
      allergens: [],
    });
    expect(kept).toEqual([
      "Protein shake with a few berries",
      "Frozen banana, blended",
    ]);
  });
});
```

- [ ] **Step 2: Run food-rule tests and verify RED**

Run: `cd apps/mobile && npx jest src/presentation/foodRules.test.ts --runInBand`

Expected: FAIL because `./foodRules` does not exist.

- [ ] **Step 3: Implement food rules**

```ts
export const DIET_FLAGS = [
  "vegetarian",
  "vegan",
  "nut_free",
  "dairy_free",
  "gluten_free",
] as const;

export type DietFlag = (typeof DIET_FLAGS)[number];

export type FoodRules = {
  foodRulesSet: boolean;
  dietFlags: DietFlag[];
  allergens: string[];
};

const MAX_ALLERGEN = 40;
const MAX_ALLERGENS = 20;

export function normalizeAllergen(raw: string): string | null {
  const value = raw.trim().toLowerCase();
  return value.length === 0 ? null : value;
}

export function normalizeAllergens(raw: string[]): string[] {
  const seen = new Set<string>();
  const next: string[] = [];
  for (const item of raw) {
    const value = normalizeAllergen(item);
    if (value && value.length <= MAX_ALLERGEN && !seen.has(value)) {
      seen.add(value);
      next.push(value);
    }
  }
  return next.slice(0, MAX_ALLERGENS);
}

export function getAllergenValidationError(
  raw: string,
  existing: string[],
): string | null {
  const value = normalizeAllergen(raw);
  if (!value) return "Enter an allergy.";
  if (value.length > MAX_ALLERGEN) return "Keep each allergy under 40 characters.";
  if (existing.includes(value)) return "That allergy is already listed.";
  if (existing.length >= MAX_ALLERGENS) return "You can save up to 20 allergies.";
  return null;
}

export function toggleDietFlag(
  current: DietFlag[],
  flag: DietFlag | "none",
): DietFlag[] {
  if (flag === "none") return [];
  return current.includes(flag)
    ? current.filter((item) => item !== flag)
    : [...current, flag];
}

function tagHitsRules(tag: string, rules: FoodRules): boolean {
  if (rules.allergens.includes(tag)) return true;
  if (tag === "nuts" && rules.dietFlags.includes("nut_free")) return true;
  if (tag === "peanuts" && rules.dietFlags.includes("nut_free")) return true;
  if (tag === "dairy" && rules.dietFlags.includes("dairy_free")) return true;
  if (tag === "gluten" && rules.dietFlags.includes("gluten_free")) return true;
  if ((tag === "meat" || tag === "fish") && rules.dietFlags.includes("vegetarian")) {
    return true;
  }
  if (
    (tag === "meat" || tag === "fish" || tag === "dairy" || tag === "eggs") &&
    rules.dietFlags.includes("vegan")
  ) {
    return true;
  }
  return false;
}

export function swapViolatesRules(
  swapLabel: string,
  tags: Record<string, string[]>,
  rules: FoodRules,
): boolean {
  const swapTags = tags[swapLabel] ?? [];
  return swapTags.some((tag) => tagHitsRules(tag, rules));
}

export function filterSwapsByRules(
  labels: string[],
  tags: Record<string, string[]>,
  rules: FoodRules,
): string[] {
  return labels.filter((label) => !swapViolatesRules(label, tags, rules));
}
```

- [ ] **Step 4: Run food-rule tests and verify GREEN**

Run: `cd apps/mobile && npx jest src/presentation/foodRules.test.ts --runInBand`

Expected: PASS.

- [ ] **Step 5: Add Ice cream tags on the catalog**

In `food-swaps.ts` export:

```ts
export const FOOD_SWAP_TAGS: Record<string, string[]> = {
  "Apple with a little peanut butter": ["peanuts", "nuts"],
  "Celery with almond butter": ["nuts"],
  "Protein shake with a few berries": ["dairy"],
  "Frozen banana, blended": [],
};
```

Tag the other existing catalog swaps the same way (cheese → dairy, etc.). Keep Ice cream swap strings unchanged.

- [ ] **Step 6: Write failing craving-label tests, implement, GREEN**

```ts
import {
  getCravingLabelValidationError,
  normalizeCravingLabel,
} from "./cravings";

test("trims and rejects blank, long, and duplicate craving names", () => {
  expect(normalizeCravingLabel(" Ice Cream ")).toBe("Ice Cream");
  expect(getCravingLabelValidationError("  ", [])).toBeTruthy();
  expect(getCravingLabelValidationError("x".repeat(61), [])).toBeTruthy();
  expect(getCravingLabelValidationError("ice cream", ["ice cream"])).toBeTruthy();
  expect(getCravingLabelValidationError("Chips", [])).toBeNull();
});
```

`normalizeCravingLabel` trims; uniqueness compares `toLowerCase()`. Max length 60. Swap labels: trim, 1–80 chars (`getSwapLabelValidationError`).

- [ ] **Step 7: Write failing resolver tests, implement, GREEN**

```ts
import { FOOD_SWAPS, FOOD_SWAP_TAGS } from "../content/food-swaps";
import { resolveSwapView } from "./swaps";

const rules = { foodRulesSet: true, dietFlags: [], allergens: [] };

test("shows catalog ice cream swaps before generate", () => {
  const view = resolveSwapView({
    cravingLabel: "ice cream",
    catalog: FOOD_SWAPS,
    tags: FOOD_SWAP_TAGS,
    rules,
    saved: [],
  });
  expect(view.showGenerate).toBe(false);
  expect(view.rows.map((row) => row.label)).toEqual(FOOD_SWAPS["Ice cream"]);
});

test("stars first and offers generate only when nothing remains", () => {
  const starred = resolveSwapView({
    cravingLabel: "Pizza",
    catalog: FOOD_SWAPS,
    tags: FOOD_SWAP_TAGS,
    rules,
    saved: [
      { id: "1", label: "Cauliflower crust slice", source: "ai", favorited: true },
      { id: "2", label: "Veggie pizza", source: "ai", favorited: false },
    ],
  });
  expect(starred.rows[0]?.favorited).toBe(true);
  expect(starred.showGenerate).toBe(false);

  const empty = resolveSwapView({
    cravingLabel: "Pizza",
    catalog: FOOD_SWAPS,
    tags: FOOD_SWAP_TAGS,
    rules,
    saved: [],
  });
  expect(empty.showGenerate).toBe(true);
  expect(empty.rows).toEqual([]);
});

test("allFilteredOut when catalog exists but every swap violates rules", () => {
  const view = resolveSwapView({
    cravingLabel: "Ice cream",
    catalog: FOOD_SWAPS,
    tags: {
      "Apple with a little peanut butter": ["nuts"],
      "Protein shake with a few berries": ["nuts"],
      "Celery with almond butter": ["nuts"],
      "Frozen banana, blended": ["nuts"],
    },
    rules: { foodRulesSet: true, dietFlags: ["nut_free"], allergens: [] },
    saved: [],
  });
  expect(view.allFilteredOut).toBe(true);
  expect(view.showGenerate).toBe(false);
});
```

`resolveSwapView` matches catalog keys case-insensitively, filters with `filterSwapsByRules`, unions saved rows by lowercase label (saved wins for id/source/favorited), sorts `favorited` first then original order. `showGenerate` is true only when there is no catalog match and no saved rows after filter. `allFilteredOut` is true when a catalog match existed and zero rows remain.

- [ ] **Step 8: Commit**

```bash
git add apps/mobile/src/presentation/foodRules.ts apps/mobile/src/presentation/foodRules.test.ts apps/mobile/src/presentation/cravings.ts apps/mobile/src/presentation/cravings.test.ts apps/mobile/src/presentation/swaps.ts apps/mobile/src/presentation/swaps.test.ts apps/mobile/src/content/food-swaps.ts
git commit -m "feat(mobile): define food rules and swap resolver"
```

---

### Task 2: Owner-scoped schema

**Files:**
- Create: `supabase/migrations/20260906120000_cravings_and_generation.sql`
- Create: `apps/mobile/src/data/cravingsMigration.test.ts`

**Interfaces:**
- Produces: idempotent SQL for profile columns, `cravings`, `craving_swaps`, `generation_jobs`, RLS, grants.
- Consumes: existing `profiles` UPDATE grant list in `20260903120000_init.sql`.

- [ ] **Step 1: Write failing migration tests** (same `__dirname` / `readFileSync` pattern as `accountabilityContactsMigration.test.ts`)

Assert the migration contains:

- `food_rules_set boolean not null default false`
- `diet_flags text[]` and `allergens text[]`
- `create table if not exists public.cravings`
- `create table if not exists public.craving_swaps`
- `create table if not exists public.generation_jobs`
- `check (kind in ('food_swaps'))`
- `source in ('catalog', 'ai', 'custom')`
- `drop policy if exists` + `create policy` for each of:
  - Members select their cravings
  - Members insert their active cravings
  - Members update their cravings
  - Members select their craving swaps
  - Members insert their active craving swaps
  - Members update their craving swaps
  - Members select their generation jobs
  - Members insert their pending generation jobs
- SELECT on cravings uses `(select auth.uid()) = user_id` without `deleted = false` (so soft-delete RETURNING works)
- `revoke delete` on the three new tables
- `revoke update on table public.generation_jobs from authenticated`
- profiles grant list includes `food_rules_set, diet_flags, allergens`

- [ ] **Step 2: Run migration test RED**

Run: `cd apps/mobile && npx jest src/data/cravingsMigration.test.ts --runInBand`

Expected: FAIL because the SQL file is missing.

- [ ] **Step 3: Write the migration**

Follow `20260904183000_accountability_contacts.sql`: `create table if not exists`, `deleted = (deleted_at is not null)`, partial unique indexes `cravings_active_user_label_idx` on `(user_id, lower(label)) where deleted = false` and `craving_swaps_active_craving_label_idx` on `(craving_id, lower(label)) where deleted = false`.

`craving_swaps.craving_id` references `cravings(id)` **without** `on delete cascade`.

`generation_jobs`: `status` in (`pending`, `succeeded`, `failed`), `kind` in (`food_swaps`), owner SELECT + INSERT with check `status = 'pending'` and `auth.uid() = user_id`. No authenticated UPDATE/DELETE.

Re-issue the profiles column grant as a full list including the three new columns (drop/recreate the grant the same way init.sql does).

- [ ] **Step 4: Run migration test GREEN**

Run: `cd apps/mobile && npx jest src/data/cravingsMigration.test.ts --runInBand`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260906120000_cravings_and_generation.sql apps/mobile/src/data/cravingsMigration.test.ts
git commit -m "feat(db): add cravings, swaps, and generation jobs"
```

---

### Task 3: Craving and swap data access plus profile fields

**Files:**
- Modify: `apps/mobile/src/types.ts`
- Modify: `apps/mobile/src/data/profile.ts`
- Modify: `apps/mobile/src/data/profile.test.ts`
- Create: `apps/mobile/src/data/cravings.ts`
- Create: `apps/mobile/src/data/cravings.test.ts`
- Create: `apps/mobile/src/data/cravingSwaps.ts`
- Create: `apps/mobile/src/data/cravingSwaps.test.ts`

**Interfaces:**
- Consumes: `normalizeCravingLabel`, `DietFlag`, `FoodRules` field names.
- Produces: `Profile` gains `food_rules_set: boolean`, `diet_flags: DietFlag[]`, `allergens: string[]`.
- Produces: `Craving { id, label, sort_order }`, `fetchCravings`, `createCraving(label: string): Promise<Craving>`, `removeCraving(id: string): Promise<void>`.
- Produces: `CravingSwap { id, craving_id, label, favorited, source }`, `fetchCravingSwaps(cravingId: string)`, `createCravingSwap(input)`, `setSwapFavorited(id: string, favorited: boolean)`, `removeCravingSwap(id: string)`.

- [ ] **Step 1: Extend profile fetch tests** so `select(...)` includes the three new columns and unknown diet flags are dropped. Fail, then update `Profile` and `fetchProfile` / `saveProfile` (save already patches `Partial<Omit<Profile, "id" | "email">>`). Default `food_rules_set` to false when null.

- [ ] **Step 2: Write craving data tests** mirroring `accountabilityContacts.test.ts`: signed-out throws, fetch filters `user_id` + `deleted = false` ordered by `sort_order, id`, insert sets `user_id` from auth not from the caller, remove sets `deleted`/`deleted_at` scoped by id + user_id and throws if `maybeSingle` is null. Use `explainError` on catch like contacts after the profile-people fix.

- [ ] **Step 3: Implement `cravings.ts` and GREEN**

- [ ] **Step 4: Write swap data tests** for fetch by `craving_id` + owner + active, insert with `source` and `favorited`, star via `update({ favorited })`, soft-delete. Implement `cravingSwaps.ts` and GREEN.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/types.ts apps/mobile/src/data/profile.ts apps/mobile/src/data/profile.test.ts apps/mobile/src/data/cravings.ts apps/mobile/src/data/cravings.test.ts apps/mobile/src/data/cravingSwaps.ts apps/mobile/src/data/cravingSwaps.test.ts
git commit -m "feat(mobile): add craving and swap data access"
```

---

### Task 4: Shared `sos-generate` client and Edge Function

**Files:**
- Create: `apps/mobile/src/data/generate.ts`
- Create: `apps/mobile/src/data/generate.test.ts`
- Create: `supabase/functions/sos-generate/index.ts`
- Create: `apps/mobile/src/data/sosGenerateFunction.test.ts`

**Interfaces:**
- Produces: `SosGenerateKind = "food_swaps"`, `buildFoodSwapsGenerateRequest(rules: FoodRules, cravingLabel: string): { kind: "food_swaps"; input: { diet_flags: DietFlag[]; allergen_count: number } } | null` — returns `null` when `foodRulesSet` is false. **Do not put allergen strings or the craving label on the client request object that gets logged**; the invoke body may include them for the function to filter, but tests must assert the thrown client errors never contain those strings.
- Produces: `generateFoodSwaps(args: { cravingLabel: string; rules: FoodRules }): Promise<string[]>` calling `getSupabase().functions.invoke("sos-generate", { body })`.
- Produces: `parseFoodSwapsOutput(payload: unknown): string[]` requiring exactly 4 non-empty strings.

- [ ] **Step 1: Client tests RED then GREEN**

```ts
test("refuses generate when food rules are unset", async () => {
  await expect(
    generateFoodSwaps({
      cravingLabel: "Pizza",
      rules: { foodRulesSet: false, dietFlags: [], allergens: [] },
    }),
  ).rejects.toThrow("Set your food rules before asking for swap ideas.");
});

test("maps four swap labels from a succeeded job", async () => {
  // mock functions.invoke → { data: { status: "succeeded", output: { swaps: ["a","b","c","d"] } }, error: null }
});
```

On invoke error, `throw new Error(explainError(error))` — do not interpolate the craving.

- [ ] **Step 2: Function source tests**

Read `supabase/functions/sos-generate/index.ts` as text (same `__dirname` pattern). Assert:

- JWT / `Authorization` is required
- unknown `kind` returns 400
- `food_swaps` reads `food_rules_set` from `profiles` and rejects when false
- `console` logging uses `job_id` / `kind` / `status` only (file must not contain `allergens` in a `console.` call)
- inserts `generation_jobs` as `pending` then service-role updates to succeeded/failed
- returns `{ job_id, status, output: { swaps } }` with 4 strings after applying the same nut/dairy/gluten/veg tags as the client for any model output

Implement the function in Deno: verify user with the user JWT against Supabase, insert job as that user (or service role insert with `user_id` from JWT), call the provider with `Deno.env.get("OPENAI_API_KEY")` (or the project’s existing secret name if one is already documented — do not invent a second key path). System prompt: four short food swaps, similar satisfaction, better nutrition, no medical claims, obey diet flags and allergen list. Parse JSON. Filter. If fewer than 4 remain, fill from generic safe swaps that pass the filter (apple slices, sparkling water, herbal tea, carrot sticks) that have empty tags. Never return a swap that fails the filter.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/data/generate.ts apps/mobile/src/data/generate.test.ts apps/mobile/src/data/sosGenerateFunction.test.ts supabase/functions/sos-generate/index.ts
git commit -m "feat: add shared sos-generate gateway for food swaps"
```

---

### Task 5: Profile Food rules and Usual cravings tiles

**Files:**
- Create: `apps/mobile/components/FoodRulesSection.tsx`
- Create: `apps/mobile/components/UsualCravingsSection.tsx`
- Create: `apps/mobile/components/FoodRulesSection.test.ts`
- Create: `apps/mobile/components/UsualCravingsSection.test.ts`
- Modify: `apps/mobile/app/(app)/(tabs)/profile.tsx`
- Create or modify: `apps/mobile/components/ProfileScreen.test.ts` for the new copy and save payload

**Interfaces:**
- Consumes: `saveProfile`, `fetchCravings`, `createCraving`, `removeCraving`, presentation helpers from Task 1.
- Produces: Food rules tile copy “We’ll never suggest a swap that breaks these.” Usual cravings add flyout. Saving food rules sets `food_rules_set: true`.

- [ ] **Step 1: Contract tests for copy, diet chip labels (None, Vegetarian, Vegan, Nut-free, Dairy-free, Gluten-free), allergy add validation, craving flyout duplicate error.** Follow `YourPeopleSection.test.ts` style (exported labels/constants if that is how existing tiles are tested).

- [ ] **Step 2: Implement the two section components.** Food rules: allergy list + add field, diet chips, Save. Usual cravings: rows/chips, Remove with confirmation naming the craving, Add a craving flyout (one labeled field, Cancel, focus in, keyboard avoidance). Reuse Your people modal patterns from `YourPeopleSection.tsx`.

- [ ] **Step 3: Wire into `profile.tsx` below Your people.** Load cravings with the same request-id + mutation-revision guard as contacts. Independent error banner for cravings vs profile vs contacts.

- [ ] **Step 4: Run section and profile tests GREEN, `npx tsc --noEmit`.**

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/components/FoodRulesSection.tsx apps/mobile/components/UsualCravingsSection.tsx apps/mobile/components/FoodRulesSection.test.ts apps/mobile/components/UsualCravingsSection.test.ts apps/mobile/app/(app)/(tabs)/profile.tsx apps/mobile/components/ProfileScreen.test.ts
git commit -m "feat(mobile): add food rules and usual cravings to profile"
```

---

### Task 6: Better Choices SOS screen

**Files:**
- Modify: `apps/mobile/app/(app)/sos/food.tsx`
- Create: `apps/mobile/src/presentation/foodScreen.ts` (view-model: which state to show)
- Create: `apps/mobile/src/presentation/foodScreen.test.ts`

**Interfaces:**
- Consumes: `fetchProfile`, `fetchCravings`, `fetchCravingSwaps`, `createCraving`, `createCravingSwap`, `setSwapFavorited`, `generateFoodSwaps`, `resolveSwapView`, `FOOD_SWAPS`, `FOOD_SWAP_TAGS`.
- Produces: screen states `needs_rules` | `empty_cravings` | `ready`.

- [ ] **Step 1: View-model tests**

```ts
test("blocks personalization until food rules are set", () => {
  expect(getFoodScreenMode({ foodRulesSet: false, cravingCount: 2 })).toBe("needs_rules");
});
test("empty cravings after rules", () => {
  expect(getFoodScreenMode({ foodRulesSet: true, cravingCount: 0 })).toBe("empty_cravings");
});
```

Copy: title `What are you craving?`, subtitle `Tap one, then pick a swap that still feels satisfying.`, generate button `Get swap ideas`, filtered-out `Nothing here fits your food rules`.

- [ ] **Step 2: Implement `food.tsx`**

Keep `SosScreen` with `showBack`, eyebrow `BETTER CHOICES`, existing `logSosEvent(path, "food")`.

- `needs_rules`: card + button `router.push("/(app)/(tabs)/profile")`.
- `empty_cravings` / ready: Add a craving flyout (same component as Profile if extracted; otherwise duplicate the flyout JSX once into `UsualCravingsSection` and export `AddCravingFlyout`).
- Chips: `accessibilityRole="tab"`, `accessibilityState={{ selected }}`, first craving selected on load; newly created craving becomes selected.
- On select: load swaps; if catalog match and no saved rows, insert missing catalog labels with `source: "catalog"` (ignore unique-violation by refetching).
- List with star; `accessibilityLabel={`Save ${label}`}` / `Remove save on ${label}`.
- `Get swap ideas` only when `view.showGenerate`; disable while in flight; on success `createCravingSwap` each label `source: "ai"`; on failure banner + retry, no local fake rows.
- `allFilteredOut`: message + custom swap field (`source: "custom"`, `favorited: true`).
- Revision guard on loads vs mutations like Profile contacts.

- [ ] **Step 3: Tests GREEN, `tsc --noEmit`.**

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/app/(app)/sos/food.tsx apps/mobile/src/presentation/foodScreen.ts apps/mobile/src/presentation/foodScreen.test.ts apps/mobile/components/UsualCravingsSection.tsx
git commit -m "feat(mobile): personalize Better Choices with cravings and swaps"
```

---

### Task 7: Full verification

**Files:** none required except fixes.

- [ ] **Step 1:** `cd apps/mobile && npx jest --runInBand && npx tsc --noEmit`

Expected: PASS / clean.

- [ ] **Step 2:** Request iOS and Android bundles from the running Expo server (`curl` the `entry.bundle` URLs used in prior SOS work). Expected: HTTP 200.

- [ ] **Step 3:** Dispatch `code-reviewer` and `security-reviewer` on the branch diff. Fix Critical/Important: RLS SELECT must allow tombstones for swap/craving remove RETURNING; generate errors must not leak allergens; no provider key in the app.

- [ ] **Step 4:** Commit any fixes; do not push.

---

## Spec coverage check

| Spec section | Task |
|---|---|
| Shared `sos-generate` + `generation_jobs` | 2, 4 |
| Food rules tile + `food_rules_set` | 1, 3, 5 |
| Usual cravings Profile + SOS add | 5, 6 |
| Layout A chips + Try instead | 6 |
| Catalog then favorites then generate CTA | 1, 6 |
| Ice cream list + nut filter | 1 |
| Custom swap when all filtered out | 6 |
| Accessibility chips/stars/flyout | 5, 6 |
| Load/mutation races | 5, 6 |
| Out of scope web/other kinds | not implemented |
