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
    "../../../../supabase/migrations/20260907184500_coach_message_visibility.sql",
  ),
  "utf8",
);
const normalizedMigration = migration.replace(/\s+/g, " ");

describe("coach message visibility migration", () => {
  test("adds show_message and lets owners hide rows without deleting them", () => {
    expect(normalizedMigration).toContain(
      "add column if not exists show_message boolean not null default true",
    );
    expect(normalizedMigration).toContain(
      "grant update (show_message) on table public.coach_messages to authenticated",
    );
    expect(migration.toLowerCase()).not.toContain(
      "grant delete on table public.coach_messages",
    );
  });
});
