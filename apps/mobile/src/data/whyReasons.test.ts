import { getSupabase } from "../lib/supabase";
import { createWhyReason, fetchWhyReasons, removeWhyReason } from "./whyReasons";

jest.mock("../lib/supabase", () => ({
  getSupabase: jest.fn(),
}));

const mockedGetSupabase = jest.mocked(getSupabase);

describe("why reasons data", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("loads only this member's active reasons in order", async () => {
    const order = jest.fn().mockResolvedValue({
      data: [{ id: "r1", label: "My kids", sort_order: 0 }],
      error: null,
    });
    const deletedFilter = jest.fn().mockReturnValue({
      order: jest.fn().mockReturnValue({ order }),
    });
    const userFilter = jest.fn().mockReturnValue({ eq: deletedFilter });
    const select = jest.fn().mockReturnValue({ eq: userFilter });
    mockedGetSupabase.mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
      from: jest.fn().mockReturnValue({ select }),
    } as never);

    await expect(fetchWhyReasons()).resolves.toEqual([
      { id: "r1", label: "My kids", sort_order: 0 },
    ]);
    expect(select).toHaveBeenCalledWith("id, label, sort_order");
    expect(userFilter).toHaveBeenCalledWith("user_id", "user-1");
    expect(deletedFilter).toHaveBeenCalledWith("deleted", false);
  });

  test("saves a trimmed reason for the signed-in member", async () => {
    const single = jest.fn().mockResolvedValue({
      data: { id: "r2", label: "My health", sort_order: 1 },
      error: null,
    });
    const select = jest.fn().mockReturnValue({ single });
    const insert = jest.fn().mockReturnValue({ select });
    mockedGetSupabase.mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
      from: jest.fn().mockReturnValue({ insert }),
    } as never);

    await expect(createWhyReason("  My health  ")).resolves.toEqual({
      id: "r2",
      label: "My health",
      sort_order: 1,
    });
    expect(insert).toHaveBeenCalledWith({
      user_id: "user-1",
      label: "My health",
    });
  });

  test("soft-deletes only an active reason owned by this member", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({
      data: { id: "r1" },
      error: null,
    });
    const deletedFilter = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({ maybeSingle }),
    });
    const userFilter = jest.fn().mockReturnValue({ eq: deletedFilter });
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

    await expect(removeWhyReason("r1")).resolves.toBeUndefined();
    expect(update).toHaveBeenCalledWith({
      deleted: true,
      deleted_at: expect.any(String),
    });
    expect(idFilter).toHaveBeenCalledWith("id", "r1");
    expect(userFilter).toHaveBeenCalledWith("user_id", "user-1");
    expect(deletedFilter).toHaveBeenCalledWith("deleted", false);
  });
});
