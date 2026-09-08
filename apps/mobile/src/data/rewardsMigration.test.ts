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
    "../../../../supabase/migrations/20260907190000_milestone_rewards.sql",
  ),
  "utf8",
);
const normalizedMigration = migration.replace(/\s+/g, " ");

describe("milestone rewards migration", () => {
  test("creates an owner-scoped milestones table with soft delete", () => {
    expect(migration).toContain(
      "create table if not exists public.milestone_rewards",
    );
    expect(normalizedMigration).toContain(
      "grant insert (user_id, milestone, reward, progress_note, completed, completed_at) on table public.milestone_rewards to authenticated",
    );
    expect(normalizedMigration).toContain(
      "grant update (milestone, reward, progress_note, completed, completed_at, deleted, deleted_at) on table public.milestone_rewards to authenticated",
    );
    expect(migration.toLowerCase()).not.toContain(
      "grant delete on table public.milestone_rewards",
    );
    expect(normalizedMigration).toContain(
      "create index if not exists milestone_rewards_user_id_idx on public.milestone_rewards (user_id)",
    );
  });
});
