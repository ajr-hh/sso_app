import { getSupabase } from "../lib/supabase";
import {
  deleteTask,
  fetchTasks,
  taskDayKey,
  toggleTask,
  updateTask,
} from "./tasks";

jest.mock("../lib/supabase", () => ({
  getSupabase: jest.fn(),
}));

const mockedGetSupabase = jest.mocked(getSupabase);

describe("task day keys", () => {
  test("uses the local calendar day late in the evening", () => {
    expect(taskDayKey(new Date(2026, 8, 3, 23, 30))).toBe("2026-09-03");
  });
});

describe("updateTask", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("updates the label for the signed-in user's task today", async () => {
    const activeFilter = jest.fn().mockResolvedValue({ error: null });
    const dayFilter = jest.fn().mockReturnValue({ is: activeFilter });
    const userFilter = jest.fn().mockReturnValue({ eq: dayFilter });
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

    await expect(updateTask("task-1", "Drink water")).resolves.toBeUndefined();

    expect(update).toHaveBeenCalledWith({ label: "Drink water" });
    expect(idFilter).toHaveBeenCalledWith("id", "task-1");
    expect(userFilter).toHaveBeenCalledWith("user_id", "user-1");
    expect(dayFilter).toHaveBeenCalledWith("day", taskDayKey());
    expect(activeFilter).toHaveBeenCalledWith("deleted_at", null);
  });

  test("propagates Supabase update errors", async () => {
    const activeFilter = jest.fn().mockResolvedValue({
      error: { message: "Task update failed" },
    });
    const dayFilter = jest.fn().mockReturnValue({ is: activeFilter });
    const userFilter = jest.fn().mockReturnValue({ eq: dayFilter });
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

    await expect(updateTask("task-1", "Drink water")).rejects.toThrow(
      "Task update failed",
    );
  });
});

describe("task active rows", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("fetches only active tasks for today", async () => {
    const order = jest.fn().mockResolvedValue({ data: [], error: null });
    const activeFilter = jest.fn().mockReturnValue({ order });
    const dayFilter = jest.fn().mockReturnValue({ is: activeFilter });
    const ownerFilter = jest.fn().mockReturnValue({ eq: dayFilter });
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

    await expect(fetchTasks()).resolves.toEqual([]);
    expect(activeFilter).toHaveBeenCalledWith("deleted_at", null);
  });

  test("toggles only an active task", async () => {
    const activeFilter = jest.fn().mockResolvedValue({ error: null });
    const dayFilter = jest.fn().mockReturnValue({ is: activeFilter });
    const ownerFilter = jest.fn().mockReturnValue({ eq: dayFilter });
    const idFilter = jest.fn().mockReturnValue({ eq: ownerFilter });
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

    await expect(toggleTask("task-1", true)).resolves.toBeUndefined();
    expect(update).toHaveBeenCalledWith({ done: true });
    expect(activeFilter).toHaveBeenCalledWith("deleted_at", null);
  });

  test("soft-deletes only the signed-in user's active task today", async () => {
    const activeFilter = jest.fn().mockResolvedValue({ error: null });
    const dayFilter = jest.fn().mockReturnValue({ is: activeFilter });
    const ownerFilter = jest.fn().mockReturnValue({ eq: dayFilter });
    const idFilter = jest.fn().mockReturnValue({ eq: ownerFilter });
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

    await expect(deleteTask("task-1")).resolves.toBeUndefined();
    expect(update).toHaveBeenCalledWith({
      deleted_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T.*Z$/),
    });
    expect(activeFilter).toHaveBeenCalledWith("deleted_at", null);
  });

  test("propagates task soft-delete failures", async () => {
    const activeFilter = jest.fn().mockResolvedValue({
      error: { message: "Task delete failed" },
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
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({ is: activeFilter }),
            }),
          }),
        }),
      }),
    } as never);

    await expect(deleteTask("task-1")).rejects.toThrow("Task delete failed");
  });
});
