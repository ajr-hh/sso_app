// This project types only Jest globals, so the CommonJS test scope needs a
// local declaration for the directory Jest resolves the migration against.
declare const __dirname: string;

const { readFileSync } = jest.requireActual("fs") as {
  readFileSync: (path: string, encoding: "utf8") => string;
};
const { join } = jest.requireActual("path") as {
  join: (...segments: string[]) => string;
};

const migration = readFileSync(
  join(
    __dirname,
    "../../../../supabase/migrations/20260906120000_cravings_and_generation.sql",
  ),
  "utf8",
);
const normalizedMigration = migration.replace(/\s+/g, " ");

describe("cravings and generation migration", () => {
  test("adds profile food-rule columns", () => {
    expect(normalizedMigration).toContain(
      "food_rules_set boolean not null default false",
    );
    expect(normalizedMigration).toContain("diet_flags text[]");
    expect(normalizedMigration).toContain("allergens text[]");
  });

  test("creates owner-scoped tables", () => {
    expect(migration).toContain("create table if not exists public.cravings");
    expect(migration).toContain(
      "create table if not exists public.craving_swaps",
    );
    expect(migration).toContain(
      "create table if not exists public.generation_jobs",
    );
  });

  test("stores rule tags on craving swaps for deterministic re-filtering", () => {
    expect(normalizedMigration).toContain(
      "rule_tags text[] not null default '{}'",
    );
  });

  test("constrains generation jobs and swap sources", () => {
    expect(migration).toContain("check (kind in ('food_swaps'))");
    expect(migration).toContain(
      "source in ('catalog', 'ai', 'custom')",
    );
  });

  test("is rerunnable and replaces every RLS policy", () => {
    for (const [table, policies] of [
      [
        "cravings",
        [
          "Members select their cravings",
          "Members insert their active cravings",
          "Members update their cravings",
        ],
      ],
      [
        "craving_swaps",
        [
          "Members select their craving swaps",
          "Members insert their active craving swaps",
          "Members update their craving swaps",
        ],
      ],
      [
        "generation_jobs",
        [
          "Members select their generation jobs",
          "Members insert their pending generation jobs",
        ],
      ],
    ] as const) {
      for (const policy of policies) {
        expect(normalizedMigration).toContain(
          `drop policy if exists "${policy}" on public.${table};`,
        );
        expect(migration).toContain(`create policy "${policy}"`);
      }
    }
  });

  test("lets owners select soft-deleted cravings so removal can return ids", () => {
    expect(normalizedMigration).toContain(
      'create policy "Members select their cravings" ' +
        "on public.cravings for select to authenticated " +
        "using ((select auth.uid()) = user_id);",
    );
    expect(normalizedMigration).not.toContain(
      'create policy "Members select their cravings" ' +
        "on public.cravings for select to authenticated " +
        "using ((select auth.uid()) = user_id and deleted = false);",
    );
  });

  test("revokes physical delete and generation job updates", () => {
    expect(normalizedMigration).toContain(
      "revoke delete on table public.cravings, public.craving_swaps, public.generation_jobs",
    );
    expect(normalizedMigration).toContain(
      "revoke update on table public.generation_jobs from authenticated;",
    );
    expect(migration.toLowerCase()).not.toContain("grant delete");
  });

  test("extends the profiles update grant with food-rule columns", () => {
    expect(normalizedMigration).toContain(
      "revoke update on table public.profiles from authenticated;",
    );
    expect(normalizedMigration).toContain(
      "grant update ( display_name, age, phone, why_matters, motivators, coach_style, rail_order, food_rules_set, diet_flags, allergens )",
    );
  });

  test("enforces soft-delete and label invariants", () => {
    expect(migration).toContain("deleted = (deleted_at is not null)");
    expect(migration).toContain("cravings_active_user_label_idx");
    expect(migration).toContain("craving_swaps_active_craving_label_idx");
    expect(migration).toContain(
      "references public.cravings (id)",
    );
    expect(normalizedMigration).not.toContain(
      "references public.cravings (id) on delete cascade",
    );
  });
});
