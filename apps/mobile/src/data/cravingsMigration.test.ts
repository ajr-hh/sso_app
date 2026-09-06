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
  test("adds profile food-rule columns with non-null empty defaults", () => {
    expect(normalizedMigration).toContain(
      "food_rules_set boolean not null default false",
    );
    expect(normalizedMigration).toContain(
      "diet_flags text[] not null default '{}'",
    );
    expect(normalizedMigration).toContain(
      "allergens text[] not null default '{}'",
    );
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

  test("lets owners select soft-deleted craving swaps so removal can return ids", () => {
    expect(normalizedMigration).toContain(
      'create policy "Members select their craving swaps" ' +
        "on public.craving_swaps for select to authenticated " +
        "using ((select auth.uid()) = user_id);",
    );
    expect(normalizedMigration).not.toContain(
      'create policy "Members select their craving swaps" ' +
        "on public.craving_swaps for select to authenticated " +
        "using ((select auth.uid()) = user_id and deleted = false);",
    );
  });

  test("requires craving ownership before inserting craving swaps", () => {
    expect(normalizedMigration).toContain(
      'create policy "Members insert their active craving swaps" ' +
        "on public.craving_swaps for insert to authenticated with check ( " +
        "(select auth.uid()) = user_id and deleted = false and exists ( " +
        "select 1 from public.cravings where id = craving_id " +
        "and user_id = (select auth.uid()) ) );",
    );
  });

  test("requires pending status when inserting generation jobs", () => {
    expect(normalizedMigration).toContain(
      'create policy "Members insert their pending generation jobs" ' +
        "on public.generation_jobs for insert to authenticated with check ( " +
        "(select auth.uid()) = user_id and status = 'pending' );",
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

  test("revokes broad access and grants only approved columns on cravings", () => {
    expect(normalizedMigration).toContain(
      "revoke all on table public.cravings from anon, public, authenticated;",
    );
    expect(normalizedMigration).toContain(
      "grant select on table public.cravings to authenticated;",
    );
    expect(normalizedMigration).toContain(
      "grant insert (user_id, label, sort_order) on table public.cravings to authenticated;",
    );
    expect(normalizedMigration).toContain(
      "grant update (label, sort_order, deleted, deleted_at) on table public.cravings to authenticated;",
    );
  });

  test("revokes broad access and grants only approved columns on craving swaps", () => {
    expect(normalizedMigration).toContain(
      "revoke all on table public.craving_swaps from anon, public, authenticated;",
    );
    expect(normalizedMigration).toContain(
      "grant select on table public.craving_swaps to authenticated;",
    );
    expect(normalizedMigration).toContain(
      "grant insert (user_id, craving_id, label, favorited, source, rule_tags) on table public.craving_swaps to authenticated;",
    );
    expect(normalizedMigration).toContain(
      "grant update (favorited, deleted, deleted_at) on table public.craving_swaps to authenticated;",
    );
  });

  test("revokes broad access and grants only select and pending insert on generation jobs", () => {
    expect(normalizedMigration).toContain(
      "revoke all on table public.generation_jobs from anon, public, authenticated;",
    );
    expect(normalizedMigration).toContain(
      "grant select on table public.generation_jobs to authenticated;",
    );
    expect(normalizedMigration).toContain(
      "grant insert (user_id, kind, status, input) on table public.generation_jobs to authenticated;",
    );
    expect(normalizedMigration).not.toContain(
      "grant update on table public.generation_jobs",
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
