import { getSupabase } from "../lib/supabase";
import { fetchGoals, saveGoals } from "./goals";

jest.mock("../lib/supabase", () => ({
  getSupabase: jest.fn(),
}));

const mockedGetSupabase = jest.mocked(getSupabase);

describe("goal data", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("fetches only active goals", async () => {
    const goals = [{ id: "goal-1", label: "Move", sort_order: 0 }];
    const order = jest.fn().mockResolvedValue({ data: goals, error: null });
    const activeFilter = jest.fn().mockReturnValue({ order });
    const ownerFilter = jest.fn().mockReturnValue({ eq: activeFilter });
    const select = jest.fn().mockReturnValue({ eq: ownerFilter });
    mockedGetSupabase.mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
      from: jest.fn().mockReturnValue({ select }),
    } as never);

    await expect(fetchGoals()).resolves.toEqual(goals);
    expect(ownerFilter).toHaveBeenCalledWith("user_id", "user-1");
    expect(activeFilter).toHaveBeenCalledWith("deleted", false);
  });

  test("upserts caller-supplied ids before soft-deleting active stale goals", async () => {
    const upsert = jest.fn().mockResolvedValue({ error: null });
    const staleFilter = jest.fn().mockResolvedValue({ error: null });
    const activeFilter = jest.fn().mockReturnValue({ not: staleFilter });
    const ownerFilter = jest.fn().mockReturnValue({ eq: activeFilter });
    const updateGoals = jest.fn().mockReturnValue({ eq: ownerFilter });
    mockedGetSupabase.mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
      from: jest.fn().mockReturnValue({
        upsert,
        update: updateGoals,
      }),
    } as never);

    await expect(
      saveGoals([
        { id: "goal-1", label: "First" },
        { id: "goal-2", label: "Second" },
      ]),
    ).resolves.toBeUndefined();

    expect(upsert).toHaveBeenCalledWith(
      [
        {
          id: "goal-1",
          user_id: "user-1",
          label: "First",
          sort_order: 0,
          deleted: false,
        },
        {
          id: "goal-2",
          user_id: "user-1",
          label: "Second",
          sort_order: 1,
          deleted: false,
        },
      ],
      { onConflict: "id" },
    );
    expect(updateGoals).toHaveBeenCalledWith({
      deleted: true,
      deleted_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T.*Z$/),
    });
    expect(ownerFilter).toHaveBeenCalledWith("user_id", "user-1");
    expect(activeFilter).toHaveBeenCalledWith("deleted", false);
    expect(staleFilter).toHaveBeenCalledWith(
      "id",
      "in",
      "(goal-1,goal-2)",
    );
    expect(upsert.mock.invocationCallOrder[0]).toBeLessThan(
      updateGoals.mock.invocationCallOrder[0],
    );
  });

  test("does not soft-delete existing goals when upsert fails", async () => {
    const upsert = jest
      .fn()
      .mockResolvedValue({ error: { message: "Upsert failed" } });
    const updateGoals = jest.fn();
    mockedGetSupabase.mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
      from: jest.fn().mockReturnValue({
        upsert,
        update: updateGoals,
      }),
    } as never);

    await expect(
      saveGoals([{ id: "goal-1", label: "Replacement" }]),
    ).rejects.toThrow(
      "Upsert failed",
    );
    expect(updateGoals).not.toHaveBeenCalled();
  });

  test("soft-deletes every active goal for an empty save", async () => {
    const activeFilter = jest.fn().mockResolvedValue({ error: null });
    const ownerFilter = jest.fn().mockReturnValue({ eq: activeFilter });
    const update = jest.fn().mockReturnValue({ eq: ownerFilter });
    mockedGetSupabase.mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
      from: jest.fn().mockReturnValue({ update }),
    } as never);

    await expect(saveGoals([])).resolves.toBeUndefined();
    expect(update).toHaveBeenCalledWith({
      deleted: true,
      deleted_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T.*Z$/),
    });
    expect(ownerFilter).toHaveBeenCalledWith("user_id", "user-1");
    expect(activeFilter).toHaveBeenCalledWith("deleted", false);
  });

  test("propagates soft-delete failures", async () => {
    const activeFilter = jest.fn().mockResolvedValue({
      error: { message: "Goal delete failed" },
    });
    mockedGetSupabase.mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
      from: jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({ eq: activeFilter }),
        }),
      }),
    } as never);

    await expect(saveGoals([])).rejects.toThrow("Goal delete failed");
  });

  test("retries with the same ids and no insert path", async () => {
    const upsert = jest.fn().mockResolvedValue({ error: null });
    const staleFilter = jest.fn().mockResolvedValue({ error: null });
    const activeFilter = jest.fn().mockReturnValue({ not: staleFilter });
    const ownerFilter = jest.fn().mockReturnValue({ eq: activeFilter });
    const update = jest.fn().mockReturnValue({ eq: ownerFilter });
    const from = jest.fn().mockReturnValue({ update, upsert });
    mockedGetSupabase.mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
      from,
    } as never);
    const goals = [
      { id: "goal-1", label: "First" },
      { id: "goal-2", label: "Second" },
    ];

    await saveGoals(goals);
    await saveGoals(goals);

    expect(upsert).toHaveBeenCalledTimes(2);
    expect(upsert.mock.calls[0]).toEqual(upsert.mock.calls[1]);
    expect(
      upsert.mock.calls[0][0].map((row: { id: string }) => row.id),
    ).toEqual(["goal-1", "goal-2"]);
    expect(from.mock.results[0]?.value.insert).toBeUndefined();
  });
});
