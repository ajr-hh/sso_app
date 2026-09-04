import { getSupabase } from "../lib/supabase";
import { addJournalEntry, fetchJournal } from "./journal";

jest.mock("../lib/supabase", () => ({
  getSupabase: jest.fn(),
}));

const mockedGetSupabase = jest.mocked(getSupabase);

describe("journal data", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("fetches the signed-in member's newest entries", async () => {
    const entries = [
      {
        id: "entry-2",
        mood: "Strong",
        body: "Kept my promise today.",
        created_at: "2026-09-04T15:00:00.000Z",
      },
      {
        id: "entry-1",
        mood: "Okay",
        body: "One step at a time.",
        created_at: "2026-09-03T15:00:00.000Z",
      },
    ];
    const order = jest.fn().mockResolvedValue({ data: entries, error: null });
    const userFilter = jest.fn().mockReturnValue({ order });
    const select = jest.fn().mockReturnValue({ eq: userFilter });
    const from = jest.fn().mockReturnValue({ select });
    mockedGetSupabase.mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
      from,
    } as never);

    await expect(fetchJournal()).resolves.toEqual(entries);
    expect(from).toHaveBeenCalledWith("journal_entries");
    expect(select).toHaveBeenCalledWith("id, mood, body, created_at");
    expect(userFilter).toHaveBeenCalledWith("user_id", "user-1");
    expect(order).toHaveBeenCalledWith("created_at", { ascending: false });
  });

  test("adds mood and body for the signed-in member", async () => {
    const insert = jest.fn().mockResolvedValue({ error: null });
    const from = jest.fn().mockReturnValue({ insert });
    mockedGetSupabase.mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
      from,
    } as never);

    await expect(addJournalEntry("Proud", "I followed through.")).resolves.toBe(
      undefined,
    );
    expect(insert).toHaveBeenCalledWith({
      user_id: "user-1",
      mood: "Proud",
      body: "I followed through.",
    });
  });

  test("does not turn a failed fetch into an empty journal", async () => {
    const order = jest.fn().mockResolvedValue({
      data: null,
      error: { message: "Journal unavailable" },
    });
    mockedGetSupabase.mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({ order }),
        }),
      }),
    } as never);

    await expect(fetchJournal()).rejects.toThrow("Journal unavailable");
  });
});
