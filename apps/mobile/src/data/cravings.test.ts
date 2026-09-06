import { getSupabase } from "../lib/supabase";
import {
  createCraving,
  fetchCravings,
  removeCraving,
} from "./cravings";

jest.mock("../lib/supabase", () => ({
  getSupabase: jest.fn(),
}));

const mockedGetSupabase = jest.mocked(getSupabase);
const signedInAuth = {
  getUser: jest.fn().mockResolvedValue({
    data: { user: { id: "user-1" } },
    error: null,
  }),
};
const signedOutAuth = {
  getUser: jest.fn().mockResolvedValue({
    data: { user: null },
    error: null,
  }),
};

describe("craving data", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("fetches active owned cravings ordered by sort order then id", async () => {
    const cravings = [{ id: "craving-1", label: "Ice cream", sort_order: 0 }];
    const idOrder = jest.fn().mockResolvedValue({ data: cravings, error: null });
    const sortOrder = jest.fn().mockReturnValue({ order: idOrder });
    const activeFilter = jest.fn().mockReturnValue({ order: sortOrder });
    const ownerFilter = jest.fn().mockReturnValue({ eq: activeFilter });
    const select = jest.fn().mockReturnValue({ eq: ownerFilter });
    const from = jest.fn().mockReturnValue({ select });
    mockedGetSupabase.mockReturnValue({
      auth: signedInAuth,
      from,
    } as never);

    await expect(fetchCravings()).resolves.toEqual(cravings);
    expect(from).toHaveBeenCalledWith("cravings");
    expect(select).toHaveBeenCalledWith("id, label, sort_order");
    expect(ownerFilter).toHaveBeenCalledWith("user_id", "user-1");
    expect(activeFilter).toHaveBeenCalledWith("deleted", false);
    expect(sortOrder).toHaveBeenCalledWith("sort_order", { ascending: true });
    expect(idOrder).toHaveBeenCalledWith("id", { ascending: true });
  });

  test("rejects fetching when signed out", async () => {
    mockedGetSupabase.mockReturnValue({
      auth: signedOutAuth,
      from: jest.fn(),
    } as never);

    await expect(fetchCravings()).rejects.toThrow(
      "You must be signed in to manage cravings.",
    );
  });

  test("creates a normalized craving owned by the authenticated user", async () => {
    const created = { id: "craving-1", label: "Ice cream", sort_order: 0 };
    const single = jest.fn().mockResolvedValue({ data: created, error: null });
    const select = jest.fn().mockReturnValue({ single });
    const insert = jest.fn().mockReturnValue({ select });
    const from = jest.fn().mockReturnValue({ insert });
    mockedGetSupabase.mockReturnValue({
      auth: signedInAuth,
      from,
    } as never);

    await expect(createCraving("  Ice cream  ")).resolves.toEqual(created);
    expect(from).toHaveBeenCalledWith("cravings");
    expect(insert).toHaveBeenCalledWith({
      user_id: "user-1",
      label: "Ice cream",
    });
    expect(select).toHaveBeenCalledWith("id, label, sort_order");
  });

  test("maps a Supabase fetch error to a fixed member-safe message", async () => {
    const idOrder = jest.fn().mockResolvedValue({
      data: null,
      error: { message: "permission denied for table cravings" },
    });
    const sortOrder = jest.fn().mockReturnValue({ order: idOrder });
    const activeFilter = jest.fn().mockReturnValue({ order: sortOrder });
    const ownerFilter = jest.fn().mockReturnValue({ eq: activeFilter });
    mockedGetSupabase.mockReturnValue({
      auth: signedInAuth,
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({ eq: ownerFilter }),
      }),
    } as never);

    const error = await fetchCravings().catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe("Something went wrong.");
    expect((error as Error).message).not.toContain("permission denied");
    expect((error as Error).message).not.toContain("cravings");
  });

  test("maps a Supabase create error to a fixed member-safe message", async () => {
    const single = jest.fn().mockResolvedValue({
      data: null,
      error: { message: "Craving insert failed" },
    });
    mockedGetSupabase.mockReturnValue({
      auth: signedInAuth,
      from: jest.fn().mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({ single }),
        }),
      }),
    } as never);

    const error = await createCraving("Private label").catch(
      (caught: unknown) => caught,
    );
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe("Something went wrong.");
    expect((error as Error).message).not.toContain("Craving insert failed");
    expect((error as Error).message).not.toContain("Private label");
  });

  test("sanitizes thrown create errors containing a private craving", async () => {
    const single = jest
      .fn()
      .mockRejectedValue(new Error("failed for Private craving"));
    mockedGetSupabase.mockReturnValue({
      auth: signedInAuth,
      from: jest.fn().mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({ single }),
        }),
      }),
    } as never);

    const error = await createCraving("Private craving").catch(
      (caught: unknown) => caught,
    );
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe("Something went wrong.");
    expect((error as Error).message).not.toContain("Private craving");
  });

  test("soft-deletes only an active craving owned by the user", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({
      data: { id: "craving-1" },
      error: null,
    });
    const select = jest.fn().mockReturnValue({ maybeSingle });
    const activeFilter = jest.fn().mockReturnValue({ select });
    const ownerFilter = jest.fn().mockReturnValue({ eq: activeFilter });
    const idFilter = jest.fn().mockReturnValue({ eq: ownerFilter });
    const update = jest.fn().mockReturnValue({ eq: idFilter });
    const from = jest.fn().mockReturnValue({ update });
    mockedGetSupabase.mockReturnValue({
      auth: signedInAuth,
      from,
    } as never);

    await expect(removeCraving("craving-1")).resolves.toBeUndefined();
    expect(from).toHaveBeenCalledWith("cravings");
    expect(update).toHaveBeenCalledWith({
      deleted: true,
      deleted_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T.*Z$/),
    });
    expect(idFilter).toHaveBeenCalledWith("id", "craving-1");
    expect(ownerFilter).toHaveBeenCalledWith("user_id", "user-1");
    expect(activeFilter).toHaveBeenCalledWith("deleted", false);
    expect(select).toHaveBeenCalledWith("id");
  });

  test("rejects removing a missing or inactive owned craving", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({
      data: null,
      error: null,
    });
    const select = jest.fn().mockReturnValue({ maybeSingle });
    const activeFilter = jest.fn().mockReturnValue({ select });
    const ownerFilter = jest.fn().mockReturnValue({ eq: activeFilter });
    const idFilter = jest.fn().mockReturnValue({ eq: ownerFilter });
    mockedGetSupabase.mockReturnValue({
      auth: signedInAuth,
      from: jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({ eq: idFilter }),
      }),
    } as never);

    await expect(removeCraving("missing")).rejects.toThrow(
      "Craving was not found or is no longer active.",
    );
  });

  test("maps a Supabase remove error to a fixed member-safe message", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({
      data: null,
      error: { message: "Craving delete failed" },
    });
    const select = jest.fn().mockReturnValue({ maybeSingle });
    const activeFilter = jest.fn().mockReturnValue({ select });
    const ownerFilter = jest.fn().mockReturnValue({ eq: activeFilter });
    const idFilter = jest.fn().mockReturnValue({ eq: ownerFilter });
    mockedGetSupabase.mockReturnValue({
      auth: signedInAuth,
      from: jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({ eq: idFilter }),
      }),
    } as never);

    const error = await removeCraving("craving-1").catch(
      (caught: unknown) => caught,
    );
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe("Something went wrong.");
    expect((error as Error).message).not.toContain("Craving delete failed");
  });

  test("sanitizes thrown remove errors containing diet and allergen values", async () => {
    const maybeSingle = jest
      .fn()
      .mockRejectedValue(new Error("vegan shellfish craving failed"));
    const select = jest.fn().mockReturnValue({ maybeSingle });
    const activeFilter = jest.fn().mockReturnValue({ select });
    const ownerFilter = jest.fn().mockReturnValue({ eq: activeFilter });
    const idFilter = jest.fn().mockReturnValue({ eq: ownerFilter });
    mockedGetSupabase.mockReturnValue({
      auth: signedInAuth,
      from: jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({ eq: idFilter }),
      }),
    } as never);

    const error = await removeCraving("private-craving").catch(
      (caught: unknown) => caught,
    );
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe("Something went wrong.");
    expect((error as Error).message).not.toContain("vegan");
    expect((error as Error).message).not.toContain("shellfish");
    expect((error as Error).message).not.toContain("private-craving");
  });
});
