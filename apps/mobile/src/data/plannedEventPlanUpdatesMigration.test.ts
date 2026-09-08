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
    "../../../../supabase/migrations/20260908013000_planned_event_plan_updates.sql",
  ),
  "utf8",
);
const normalized = migration.replace(/\s+/g, " ");

describe("planned event plan updates migration", () => {
  test("lets members replace suggestions and soft-delete their plans", () => {
    expect(normalized).toContain(
      "grant update (suggestions, deleted, deleted_at) on table public.planned_event_plans to authenticated",
    );
    expect(normalized).toContain(
      'create policy "Members update their planned event plans"',
    );
    expect(migration.toLowerCase()).not.toContain(
      "grant delete on table public.planned_event_plans",
    );
  });
});
