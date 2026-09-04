import { getSupabase } from "../lib/supabase";
import { taskDayKey, updateTask } from "./tasks";

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
    const dayFilter = jest.fn().mockResolvedValue({ error: null });
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
  });

  test("propagates Supabase update errors", async () => {
    const dayFilter = jest.fn().mockResolvedValue({
      error: { message: "Task update failed" },
    });
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
