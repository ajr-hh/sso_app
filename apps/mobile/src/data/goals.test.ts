import { getSupabase } from "../lib/supabase";
import { addGoal, deleteGoal, fetchGoals, updateGoal } from "./goals";

jest.mock("../lib/supabase", () => ({
  getSupabase: jest.fn(),
}));

const mockedGetSupabase = jest.mocked(getSupabase);

function mockAuth() {
  return {
    getUser: jest.fn().mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    }),
  };
}

describe("goal data", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("fetches only active goals in sort order", async () => {
    const goals = [{ id: "goal-1", label: "Move", sort_order: 0 }];
    const order = jest.fn().mockResolvedValue({ data: goals, error: null });
    const activeFilter = jest.fn().mockReturnValue({ order });
    const ownerFilter = jest.fn().mockReturnValue({ eq: activeFilter });
    const select = jest.fn().mockReturnValue({ eq: ownerFilter });
    mockedGetSupabase.mockReturnValue({
      auth: mockAuth(),
      from: jest.fn().mockReturnValue({ select }),
    } as never);

    await expect(fetchGoals()).resolves.toEqual(goals);
    expect(ownerFilter).toHaveBeenCalledWith("user_id", "user-1");
    expect(activeFilter).toHaveBeenCalledWith("deleted", false);
    expect(order).toHaveBeenCalledWith("sort_order", { ascending: true });
  });

  test("adds an active owner goal after the greatest existing sort order", async () => {
    const created = { id: "goal-2", label: "Read", sort_order: 8 };
    const existingLimit = jest
      .fn()
      .mockResolvedValue({ data: [{ sort_order: 7 }], error: null });
    const existingOrder = jest.fn().mockReturnValue({ limit: existingLimit });
    const existingActive = jest.fn().mockReturnValue({ order: existingOrder });
    const existingOwner = jest.fn().mockReturnValue({ eq: existingActive });
    const existingSelect = jest.fn().mockReturnValue({ eq: existingOwner });
    const single = jest.fn().mockResolvedValue({ data: created, error: null });
    const insertedSelect = jest.fn().mockReturnValue({ single });
    const insert = jest.fn().mockReturnValue({ select: insertedSelect });
    const from = jest
      .fn()
      .mockReturnValueOnce({ select: existingSelect })
      .mockReturnValueOnce({ insert });
    mockedGetSupabase.mockReturnValue({ auth: mockAuth(), from } as never);

    await expect(addGoal("Read")).resolves.toEqual(created);
    expect(existingSelect).toHaveBeenCalledWith("sort_order");
    expect(existingOwner).toHaveBeenCalledWith("user_id", "user-1");
    expect(existingActive).toHaveBeenCalledWith("deleted", false);
    expect(existingOrder).toHaveBeenCalledWith("sort_order", {
      ascending: false,
    });
    expect(existingLimit).toHaveBeenCalledWith(1);
    expect(insert).toHaveBeenCalledWith({
      user_id: "user-1",
      label: "Read",
      sort_order: 8,
      deleted: false,
    });
    expect(insertedSelect).toHaveBeenCalledWith("id, label, sort_order");
  });

  test("starts goal sort order at zero when no active goals exist", async () => {
    const created = { id: "goal-1", label: "Walk", sort_order: 0 };
    const limit = jest.fn().mockResolvedValue({ data: [], error: null });
    const order = jest.fn().mockReturnValue({ limit });
    const active = jest.fn().mockReturnValue({ order });
    const owner = jest.fn().mockReturnValue({ eq: active });
    const select = jest.fn().mockReturnValue({ eq: owner });
    const single = jest.fn().mockResolvedValue({ data: created, error: null });
    const insert = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({ single }),
    });
    mockedGetSupabase.mockReturnValue({
      auth: mockAuth(),
      from: jest
        .fn()
        .mockReturnValueOnce({ select })
        .mockReturnValueOnce({ insert }),
    } as never);

    await addGoal("Walk");

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ sort_order: 0 }),
    );
  });

  test("does not insert when finding the next sort order fails", async () => {
    const limit = jest
      .fn()
      .mockResolvedValue({ data: null, error: { message: "Sort failed" } });
    const order = jest.fn().mockReturnValue({ limit });
    const active = jest.fn().mockReturnValue({ order });
    const owner = jest.fn().mockReturnValue({ eq: active });
    const select = jest.fn().mockReturnValue({ eq: owner });
    const insert = jest.fn();
    mockedGetSupabase.mockReturnValue({
      auth: mockAuth(),
      from: jest
        .fn()
        .mockReturnValueOnce({ select })
        .mockReturnValueOnce({ insert }),
    } as never);

    await expect(addGoal("Walk")).rejects.toThrow("Sort failed");
    expect(insert).not.toHaveBeenCalled();
  });

  test("propagates goal insert failures", async () => {
    const limit = jest.fn().mockResolvedValue({ data: [], error: null });
    const order = jest.fn().mockReturnValue({ limit });
    const active = jest.fn().mockReturnValue({ order });
    const owner = jest.fn().mockReturnValue({ eq: active });
    const select = jest.fn().mockReturnValue({ eq: owner });
    const single = jest.fn().mockResolvedValue({
      data: null,
      error: { message: "Insert failed" },
    });
    const insert = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({ single }),
    });
    mockedGetSupabase.mockReturnValue({
      auth: mockAuth(),
      from: jest
        .fn()
        .mockReturnValueOnce({ select })
        .mockReturnValueOnce({ insert }),
    } as never);

    await expect(addGoal("Walk")).rejects.toThrow("Insert failed");
  });

  test("updates only the active goal owned by the user", async () => {
    const activeFilter = jest.fn().mockResolvedValue({ error: null });
    const ownerFilter = jest.fn().mockReturnValue({ eq: activeFilter });
    const idFilter = jest.fn().mockReturnValue({ eq: ownerFilter });
    const update = jest.fn().mockReturnValue({ eq: idFilter });
    mockedGetSupabase.mockReturnValue({
      auth: mockAuth(),
      from: jest.fn().mockReturnValue({ update }),
    } as never);

    await expect(updateGoal("goal-1", "Run")).resolves.toBeUndefined();
    expect(update).toHaveBeenCalledWith({ label: "Run" });
    expect(idFilter).toHaveBeenCalledWith("id", "goal-1");
    expect(ownerFilter).toHaveBeenCalledWith("user_id", "user-1");
    expect(activeFilter).toHaveBeenCalledWith("deleted", false);
  });

  test("soft-deletes only the active goal owned by the user", async () => {
    const activeFilter = jest.fn().mockResolvedValue({ error: null });
    const ownerFilter = jest.fn().mockReturnValue({ eq: activeFilter });
    const idFilter = jest.fn().mockReturnValue({ eq: ownerFilter });
    const update = jest.fn().mockReturnValue({ eq: idFilter });
    const from = jest.fn().mockReturnValue({ update });
    mockedGetSupabase.mockReturnValue({
      auth: mockAuth(),
      from,
    } as never);

    await expect(deleteGoal("goal-1")).resolves.toBeUndefined();

    expect(update).toHaveBeenCalledWith({
      deleted: true,
      deleted_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T.*Z$/),
    });
    expect(idFilter).toHaveBeenCalledWith("id", "goal-1");
    expect(ownerFilter).toHaveBeenCalledWith("user_id", "user-1");
    expect(activeFilter).toHaveBeenCalledWith("deleted", false);
    expect(from.mock.results[0]?.value.delete).toBeUndefined();
  });

  test.each([
    ["update", updateGoal, ["goal-1", "Run"]],
    ["delete", deleteGoal, ["goal-1"]],
  ] as const)("propagates %s failures", async (_, action, args) => {
    const activeFilter = jest.fn().mockResolvedValue({
      error: { message: "Goal write failed" },
    });
    const ownerFilter = jest.fn().mockReturnValue({ eq: activeFilter });
    const idFilter = jest.fn().mockReturnValue({ eq: ownerFilter });
    const update = jest.fn().mockReturnValue({ eq: idFilter });
    mockedGetSupabase.mockReturnValue({
      auth: mockAuth(),
      from: jest.fn().mockReturnValue({ update }),
    } as never);

    await expect(
      (action as (...values: string[]) => Promise<void>)(...args),
    ).rejects.toThrow("Goal write failed");
  });
});
