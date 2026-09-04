import { getSupabase } from "../lib/supabase";
import { replaceGoals } from "./goals";

jest.mock("../lib/supabase", () => ({
  getSupabase: jest.fn(),
}));

const mockedGetSupabase = jest.mocked(getSupabase);

describe("goal data", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("inserts replacements before deleting goals outside the new set", async () => {
    const select = jest.fn().mockResolvedValue({
      data: [{ id: "goal-new-1" }, { id: "goal-new-2" }],
      error: null,
    });
    const insert = jest.fn().mockReturnValue({ select });
    const staleFilter = jest.fn().mockResolvedValue({ error: null });
    const ownerFilter = jest.fn().mockReturnValue({ not: staleFilter });
    const deleteGoals = jest.fn().mockReturnValue({ eq: ownerFilter });
    mockedGetSupabase.mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
      from: jest.fn().mockReturnValue({
        insert,
        delete: deleteGoals,
      }),
    } as never);

    await expect(replaceGoals(["First", "Second"])).resolves.toBeUndefined();

    expect(insert).toHaveBeenCalledWith([
      { user_id: "user-1", label: "First", sort_order: 0 },
      { user_id: "user-1", label: "Second", sort_order: 1 },
    ]);
    expect(select).toHaveBeenCalledWith("id");
    expect(ownerFilter).toHaveBeenCalledWith("user_id", "user-1");
    expect(staleFilter).toHaveBeenCalledWith(
      "id",
      "in",
      "(goal-new-1,goal-new-2)",
    );
    expect(insert.mock.invocationCallOrder[0]).toBeLessThan(
      deleteGoals.mock.invocationCallOrder[0],
    );
  });

  test("does not delete existing goals when replacement insertion fails", async () => {
    const select = jest.fn().mockResolvedValue({
      data: null,
      error: { message: "Insert failed" },
    });
    const insert = jest.fn().mockReturnValue({ select });
    const deleteGoals = jest.fn();
    mockedGetSupabase.mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
      from: jest.fn().mockReturnValue({
        insert,
        delete: deleteGoals,
      }),
    } as never);

    await expect(replaceGoals(["Replacement"])).rejects.toThrow(
      "Insert failed",
    );
    expect(deleteGoals).not.toHaveBeenCalled();
  });
});
