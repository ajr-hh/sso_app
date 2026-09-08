import { getSupabase } from "../lib/supabase";
import {
  addJournalEntry,
  deleteJournalEntry,
  fetchJournal,
  updateJournalEntry,
} from "./journal";

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
    const activeFilter = jest.fn().mockReturnValue({ order });
    const userFilter = jest.fn().mockReturnValue({ eq: activeFilter });
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
    expect(activeFilter).toHaveBeenCalledWith("deleted", false);
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

    await expect(
      addJournalEntry("Good day", "I followed through."),
    ).resolves.toBe(undefined);
    expect(insert).toHaveBeenCalledWith({
      user_id: "user-1",
      mood: "Good day",
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
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({ order }),
          }),
        }),
      }),
    } as never);

    await expect(fetchJournal()).rejects.toThrow("Journal unavailable");
  });
});

describe("updateJournalEntry", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("updates mood and body for the signed-in member's entry", async () => {
    const activeFilter = jest.fn().mockResolvedValue({ error: null });
    const userFilter = jest.fn().mockReturnValue({ eq: activeFilter });
    const idFilter = jest.fn().mockReturnValue({ eq: userFilter });
    const update = jest.fn().mockReturnValue({ eq: idFilter });
    mockedGetSupabase.mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
      from: jest.fn().mockReturnValue({ update }),
    } as never);

    await expect(
      updateJournalEntry("entry-1", "Mixed", "Updated reflection."),
    ).resolves.toBeUndefined();

    expect(update).toHaveBeenCalledWith({
      mood: "Mixed",
      body: "Updated reflection.",
    });
    expect(idFilter).toHaveBeenCalledWith("id", "entry-1");
    expect(userFilter).toHaveBeenCalledWith("user_id", "user-1");
    expect(activeFilter).toHaveBeenCalledWith("deleted", false);
  });

  test("propagates Supabase errors from update", async () => {
    const activeFilter = jest.fn().mockResolvedValue({
      error: { message: "Update failed" },
    });
    const userFilter = jest.fn().mockReturnValue({ eq: activeFilter });
    mockedGetSupabase.mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
      from: jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({ eq: userFilter }),
        }),
      }),
    } as never);

    await expect(
      updateJournalEntry("entry-1", "Tough day", "Hard day."),
    ).rejects.toThrow("Update failed");
  });
});

describe("deleteJournalEntry", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("soft-deletes the signed-in member's active entry", async () => {
    const activeFilter = jest.fn().mockResolvedValue({ error: null });
    const userFilter = jest.fn().mockReturnValue({ eq: activeFilter });
    const idFilter = jest.fn().mockReturnValue({ eq: userFilter });
    const update = jest.fn().mockReturnValue({ eq: idFilter });
    mockedGetSupabase.mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
      from: jest.fn().mockReturnValue({ update }),
    } as never);

    await expect(deleteJournalEntry("entry-1")).resolves.toBeUndefined();

    expect(update).toHaveBeenCalledWith({
      deleted: true,
      deleted_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T.*Z$/),
    });
    expect(idFilter).toHaveBeenCalledWith("id", "entry-1");
    expect(userFilter).toHaveBeenCalledWith("user_id", "user-1");
    expect(activeFilter).toHaveBeenCalledWith("deleted", false);
  });

  test("propagates Supabase errors from soft delete", async () => {
    const activeFilter = jest.fn().mockResolvedValue({
      error: { message: "Delete failed" },
    });
    const userFilter = jest.fn().mockReturnValue({ eq: activeFilter });
    mockedGetSupabase.mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
      from: jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({ eq: userFilter }),
        }),
      }),
    } as never);

    await expect(deleteJournalEntry("entry-1")).rejects.toThrow(
      "Delete failed",
    );
  });
});
