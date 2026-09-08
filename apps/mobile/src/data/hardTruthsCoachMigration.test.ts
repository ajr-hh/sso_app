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
    "../../../../supabase/migrations/20260907200000_hard_truths.sql",
  ),
  "utf8",
);
const normalizedMigration = migration.replace(/\s+/g, " ");

describe("hard truths migration", () => {
  test("lets members favorite their photos", () => {
    expect(normalizedMigration).toContain(
      "add column if not exists favorited boolean not null default false",
    );
    expect(normalizedMigration).toContain(
      "grant update (caption, favorited, deleted, deleted_at) on table public.reinforcement_photos to authenticated",
    );
  });

  test("stores an owner-scoped coach line and allows that generate kind", () => {
    expect(migration).toContain(
      "create table if not exists public.hard_truths_coach_lines",
    );
    expect(normalizedMigration).toContain(
      "grant insert (user_id, coach_style, body) on table public.hard_truths_coach_lines to authenticated",
    );
    expect(migration.toLowerCase()).not.toContain(
      "grant delete on table public.hard_truths_coach_lines",
    );
    expect(normalizedMigration).toContain(
      "check (kind in ('food_swaps', 'swap_recipe', 'coach_reply', 'research_fact', 'hard_truths_coach'))",
    );
  });
});
