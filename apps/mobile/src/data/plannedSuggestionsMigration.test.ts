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
    "../../../../supabase/migrations/20260907210000_planned_suggestions.sql",
  ),
  "utf8",
);
const normalizedMigration = migration.replace(/\s+/g, " ");

describe("planned suggestions migration", () => {
  test("stores an owner-scoped plan and allows that generate kind", () => {
    expect(migration).toContain(
      "create table if not exists public.planned_event_plans",
    );
    expect(normalizedMigration).toContain(
      "grant insert (user_id, event_kind, custom_label, suggestions) on table public.planned_event_plans to authenticated",
    );
    expect(migration.toLowerCase()).not.toContain(
      "grant delete on table public.planned_event_plans",
    );
    expect(normalizedMigration).toContain(
      "check (kind in ('food_swaps', 'swap_recipe', 'coach_reply', 'research_fact', 'hard_truths_coach', 'planned_suggestions'))",
    );
    expect(normalizedMigration).toContain(
      "if job_kind is null or job_kind not in ('food_swaps', 'swap_recipe', 'coach_reply', 'research_fact', 'hard_truths_coach', 'planned_suggestions') then",
    );
    expect(normalizedMigration).toContain(
      "jsonb_build_object( 'diet_flag_count'",
    );
    expect(normalizedMigration).not.toContain("event_label");
  });
});
