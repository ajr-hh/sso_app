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
    "../../../../supabase/migrations/20260906200000_coach_messages.sql",
  ),
  "utf8",
);
const normalizedMigration = migration.replace(/\s+/g, " ");

describe("coach messages migration", () => {
  test("waits to lock a coach until the member first uses messages", () => {
    expect(normalizedMigration).toContain(
      "add column if not exists coach_style_set boolean not null default false",
    );
    expect(normalizedMigration).toContain(
      "grant update ( display_name, age, phone, why_matters, motivators, coach_style, coach_style_set, rail_order, food_rules_set, diet_flags, allergens )",
    );
  });

  test("stores four coach voices and a private thread per member", () => {
    expect(normalizedMigration).toContain(
      "check (coach_style in ('marcus', 'elena', 'sam', 'jordan'))",
    );
    expect(migration).toContain(
      "create table if not exists public.coach_messages",
    );
    expect(normalizedMigration).toContain(
      "check (role in ('member', 'coach'))",
    );
    expect(normalizedMigration).toContain(
      "grant insert (user_id, coach_style, role, body) on table public.coach_messages to authenticated;",
    );
    expect(migration.toLowerCase()).not.toContain(
      "grant delete on table public.coach_messages",
    );
  });

  test("allows coach reply jobs without raising the hourly cap", () => {
    expect(normalizedMigration).toContain(
      "check (kind in ('food_swaps', 'swap_recipe', 'coach_reply'))",
    );
    expect(normalizedMigration).toContain(
      "if job_kind is null or job_kind not in ('food_swaps', 'swap_recipe', 'coach_reply') then",
    );
    expect(normalizedMigration).toContain(
      "max_per_hour constant integer := 10;",
    );
  });
});
