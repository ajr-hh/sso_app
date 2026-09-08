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
    "../../../../supabase/migrations/20260906193000_swap_recipes.sql",
  ),
  "utf8",
);
const normalizedMigration = migration.replace(/\s+/g, " ");

describe("swap recipes migration", () => {
  test("creates a shared recipe table keyed by collapsed title", () => {
    expect(migration).toContain("create table if not exists public.swap_recipes");
    expect(normalizedMigration).toContain(
      "create unique index if not exists swap_recipes_title_key_idx on public.swap_recipes (title_key);",
    );
  });

  test("lets every signed-in member read recipes and nobody insert from the client", () => {
    expect(normalizedMigration).toContain(
      'create policy "Members read shared recipes" on public.swap_recipes for select to authenticated using (true);',
    );
    expect(normalizedMigration).toContain(
      "grant select on table public.swap_recipes to authenticated;",
    );
    expect(migration.toLowerCase()).not.toContain(
      "grant insert on table public.swap_recipes",
    );
  });

  test("allows recipe generation jobs without changing the hourly cap", () => {
    expect(normalizedMigration).toContain(
      "check (kind in ('food_swaps', 'swap_recipe'))",
    );
    expect(normalizedMigration).toContain(
      "if job_kind is null or job_kind not in ('food_swaps', 'swap_recipe') then",
    );
    expect(normalizedMigration).toContain(
      "max_per_hour constant integer := 10;",
    );
  });
});
