const { readFileSync } = jest.requireActual("fs") as {
  readFileSync: (path: string, encoding: "utf8") => string;
};

const migration = readFileSync(
  "../../supabase/migrations/20260904183000_accountability_contacts.sql",
  "utf8",
);
const normalizedMigration = migration.replace(/\s+/g, " ");

describe("accountability contacts migration", () => {
  test("is rerunnable and replaces every RLS policy", () => {
    for (const policy of [
      "Members select their active accountability contacts",
      "Members insert their active accountability contacts",
      "Members soft-delete their accountability contacts",
    ]) {
      expect(normalizedMigration).toContain(
        `drop policy if exists "${policy}" on public.accountability_contacts;`,
      );
      expect(migration).toContain(`create policy "${policy}"`);
    }
  });

  test("enforces contact and soft-delete invariants", () => {
    expect(migration).toContain("char_length(name) <= 120");
    expect(migration).toContain("char_length(phone) <= 40");
    expect(migration).toContain("char_length(email) <= 320");
    expect(migration).toContain(
      "length(regexp_replace(phone, '\\D', '', 'g')) >= 7",
    );
    expect(migration).toContain(
      "email ~* '^[^[:space:]@]+@[^[:space:]@]+\\.[^[:space:]@]+$'",
    );
    expect(migration).toContain("deleted = (deleted_at is not null)");
  });

  test("revokes broad access and grants only approved columns", () => {
    expect(normalizedMigration).toContain(
      "revoke all on table public.accountability_contacts from anon, public, authenticated;",
    );
    expect(normalizedMigration).toContain(
      "grant insert (user_id, name, phone, email, relationship)",
    );
    expect(normalizedMigration).toContain("grant update (deleted, deleted_at)");
    expect(migration.toLowerCase()).not.toContain("grant delete");
  });
});
