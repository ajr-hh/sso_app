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
    "../../../../supabase/migrations/20260906210000_why_reasons.sql",
  ),
  "utf8",
);
const normalizedMigration = migration.replace(/\s+/g, " ");

describe("why reasons migration", () => {
  test("creates an owner-scoped reasons table", () => {
    expect(migration).toContain("create table if not exists public.why_reasons");
    expect(normalizedMigration).toContain(
      "grant insert (user_id, label, sort_order) on table public.why_reasons to authenticated;",
    );
    expect(normalizedMigration).toContain(
      "grant update (label, sort_order, deleted, deleted_at) on table public.why_reasons to authenticated;",
    );
    expect(migration.toLowerCase()).not.toContain(
      "grant delete on table public.why_reasons",
    );
  });

  test("lets members update photo captions and soft-delete why photos", () => {
    expect(normalizedMigration).toContain(
      "grant update (caption, deleted, deleted_at) on table public.reinforcement_photos to authenticated;",
    );
  });
});
