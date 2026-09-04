import { getSupabase } from "../lib/supabase";
import { fetchGoals, replaceGoals } from "./goals";

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
    const ownerFilter = jest.fn().mockReturnValue({ is: activeFilter });
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
    expect(activeFilter).toHaveBeenCalledWith("deleted_at", null);
  });

  test("inserts replacements before soft-deleting active stale goals", async () => {
    const select = jest.fn().mockResolvedValue({
      data: [{ id: "goal-new-1" }, { id: "goal-new-2" }],
      error: null,
    });
    const insert = jest.fn().mockReturnValue({ select });
    const staleFilter = jest.fn().mockResolvedValue({ error: null });
    const activeFilter = jest.fn().mockReturnValue({ not: staleFilter });
    const ownerFilter = jest.fn().mockReturnValue({ is: activeFilter });
    const updateGoals = jest.fn().mockReturnValue({ eq: ownerFilter });
    mockedGetSupabase.mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
      from: jest.fn().mockReturnValue({
        insert,
        update: updateGoals,
      }),
    } as never);

    await expect(replaceGoals(["First", "Second"])).resolves.toBeUndefined();

    expect(insert).toHaveBeenCalledWith([
      { user_id: "user-1", label: "First", sort_order: 0 },
      { user_id: "user-1", label: "Second", sort_order: 1 },
    ]);
    expect(select).toHaveBeenCalledWith("id");
    expect(updateGoals).toHaveBeenCalledWith({
      deleted_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T.*Z$/),
    });
    expect(ownerFilter).toHaveBeenCalledWith("user_id", "user-1");
    expect(activeFilter).toHaveBeenCalledWith("deleted_at", null);
    expect(staleFilter).toHaveBeenCalledWith(
      "id",
      "in",
      "(goal-new-1,goal-new-2)",
    );
    expect(insert.mock.invocationCallOrder[0]).toBeLessThan(
      updateGoals.mock.invocationCallOrder[0],
    );
  });

  test("does not soft-delete existing goals when replacement insertion fails", async () => {
    const select = jest.fn().mockResolvedValue({
      data: null,
      error: { message: "Insert failed" },
    });
    const insert = jest.fn().mockReturnValue({ select });
    const updateGoals = jest.fn();
    mockedGetSupabase.mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
      from: jest.fn().mockReturnValue({
        insert,
        update: updateGoals,
      }),
    } as never);

    await expect(replaceGoals(["Replacement"])).rejects.toThrow(
      "Insert failed",
    );
    expect(updateGoals).not.toHaveBeenCalled();
  });

  test("soft-deletes every active goal for an empty replacement", async () => {
    const activeFilter = jest.fn().mockResolvedValue({ error: null });
    const ownerFilter = jest.fn().mockReturnValue({ is: activeFilter });
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

    await expect(replaceGoals([])).resolves.toBeUndefined();
    expect(update).toHaveBeenCalledWith({
      deleted_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T.*Z$/),
    });
    expect(ownerFilter).toHaveBeenCalledWith("user_id", "user-1");
    expect(activeFilter).toHaveBeenCalledWith("deleted_at", null);
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
          eq: jest.fn().mockReturnValue({ is: activeFilter }),
        }),
      }),
    } as never);

    await expect(replaceGoals([])).rejects.toThrow("Goal delete failed");
  });
});
