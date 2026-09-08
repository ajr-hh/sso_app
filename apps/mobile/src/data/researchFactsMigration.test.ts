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
    "../../../../supabase/migrations/20260907140000_research_facts.sql",
  ),
  "utf8",
);
const normalizedMigration = migration.replace(/\s+/g, " ");

describe("research facts migration", () => {
  test("stores owner-scoped facts with a source", () => {
    expect(migration).toContain(
      "create table if not exists public.research_facts",
    );
    expect(normalizedMigration).toContain(
      "check (source in ('ai', 'member'))",
    );
    expect(normalizedMigration).toContain(
      "grant insert (user_id, num, title, body, source) on table public.research_facts to authenticated;",
    );
    expect(migration.toLowerCase()).not.toContain(
      "grant delete on table public.research_facts",
    );
  });

  test("allows research fact jobs without raising the hourly cap", () => {
    expect(normalizedMigration).toContain(
      "check (kind in ('food_swaps', 'swap_recipe', 'coach_reply', 'research_fact'))",
    );
    expect(normalizedMigration).toContain(
      "if job_kind is null or job_kind not in ('food_swaps', 'swap_recipe', 'coach_reply', 'research_fact') then",
    );
    expect(normalizedMigration).toContain(
      "max_per_hour constant integer := 10;",
    );
  });
});
