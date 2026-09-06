import { getSupabase } from "../lib/supabase";
import {
  createCravingSwap,
  fetchCravingSwaps,
  removeCravingSwap,
  setSwapFavorited,
} from "./cravingSwaps";

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

function mockOwnedUpdate(result: {
  data: { id: string } | null;
  error: { message: string } | null;
}) {
  const maybeSingle = jest.fn().mockResolvedValue(result);
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
  return {
    activeFilter,
    from,
    idFilter,
    ownerFilter,
    select,
    update,
  };
}

describe("craving swap data", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("fetches active owned swaps for a craving in stable display order", async () => {
    const swaps = [
      {
        id: "swap-1",
        craving_id: "craving-1",
        label: "Greek yogurt",
        favorited: true,
        source: "catalog",
        rule_tags: ["dairy"],
      },
    ];
    const idOrder = jest.fn().mockResolvedValue({ data: swaps, error: null });
    const createdOrder = jest.fn().mockReturnValue({ order: idOrder });
    const favoriteOrder = jest.fn().mockReturnValue({ order: createdOrder });
    const activeFilter = jest.fn().mockReturnValue({ order: favoriteOrder });
    const ownerFilter = jest.fn().mockReturnValue({ eq: activeFilter });
    const cravingFilter = jest.fn().mockReturnValue({ eq: ownerFilter });
    const select = jest.fn().mockReturnValue({ eq: cravingFilter });
    const from = jest.fn().mockReturnValue({ select });
    mockedGetSupabase.mockReturnValue({
      auth: signedInAuth,
      from,
    } as never);

    await expect(fetchCravingSwaps("craving-1")).resolves.toEqual(swaps);
    expect(from).toHaveBeenCalledWith("craving_swaps");
    expect(select).toHaveBeenCalledWith(
      "id, craving_id, label, favorited, source, rule_tags",
    );
    expect(cravingFilter).toHaveBeenCalledWith("craving_id", "craving-1");
    expect(ownerFilter).toHaveBeenCalledWith("user_id", "user-1");
    expect(activeFilter).toHaveBeenCalledWith("deleted", false);
    expect(favoriteOrder).toHaveBeenCalledWith("favorited", {
      ascending: false,
    });
    expect(createdOrder).toHaveBeenCalledWith("created_at", {
      ascending: true,
    });
    expect(idOrder).toHaveBeenCalledWith("id", { ascending: true });
  });

  test("rejects fetching when signed out", async () => {
    mockedGetSupabase.mockReturnValue({
      auth: signedOutAuth,
      from: jest.fn(),
    } as never);

    await expect(fetchCravingSwaps("craving-1")).rejects.toThrow(
      "You must be signed in to manage craving swaps.",
    );
  });

  test("creates an owned swap and persists supplied rule tags unchanged", async () => {
    const created = {
      id: "swap-1",
      craving_id: "craving-1",
      label: "Greek yogurt",
      favorited: false,
      source: "catalog",
      rule_tags: ["dairy"],
    };
    const single = jest.fn().mockResolvedValue({ data: created, error: null });
    const select = jest.fn().mockReturnValue({ single });
    const insert = jest.fn().mockReturnValue({ select });
    mockedGetSupabase.mockReturnValue({
      auth: signedInAuth,
      from: jest.fn().mockReturnValue({ insert }),
    } as never);

    await expect(
      createCravingSwap({
        craving_id: "craving-1",
        label: "Greek yogurt",
        favorited: false,
        source: "catalog",
        rule_tags: ["dairy"],
      }),
    ).resolves.toEqual(created);
    expect(insert).toHaveBeenCalledWith({
      user_id: "user-1",
      craving_id: "craving-1",
      label: "Greek yogurt",
      favorited: false,
      source: "catalog",
      rule_tags: ["dairy"],
    });
    expect(select).toHaveBeenCalledWith(
      "id, craving_id, label, favorited, source, rule_tags",
    );
  });

  test("preserves Supabase create errors through the mutation wrapper", async () => {
    const single = jest.fn().mockResolvedValue({
      data: null,
      error: { message: "Swap insert failed" },
    });
    mockedGetSupabase.mockReturnValue({
      auth: signedInAuth,
      from: jest.fn().mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({ single }),
        }),
      }),
    } as never);

    await expect(
      createCravingSwap({
        craving_id: "craving-1",
        label: "Private swap",
        favorited: false,
        source: "ai",
        rule_tags: ["private-allergen"],
      }),
    ).rejects.toThrow("Swap insert failed");
  });

  test("updates favorite state only on an active owned swap", async () => {
    const mocks = mockOwnedUpdate({
      data: { id: "swap-1" },
      error: null,
    });

    await expect(setSwapFavorited("swap-1", true)).resolves.toBeUndefined();
    expect(mocks.from).toHaveBeenCalledWith("craving_swaps");
    expect(mocks.update).toHaveBeenCalledWith({ favorited: true });
    expect(mocks.idFilter).toHaveBeenCalledWith("id", "swap-1");
    expect(mocks.ownerFilter).toHaveBeenCalledWith("user_id", "user-1");
    expect(mocks.activeFilter).toHaveBeenCalledWith("deleted", false);
    expect(mocks.select).toHaveBeenCalledWith("id");
  });

  test("rejects favoriting a missing or inactive owned swap", async () => {
    mockOwnedUpdate({ data: null, error: null });

    await expect(setSwapFavorited("missing", true)).rejects.toThrow(
      "Craving swap was not found or is no longer active.",
    );
  });

  test("soft-deletes only an active owned swap", async () => {
    const mocks = mockOwnedUpdate({
      data: { id: "swap-1" },
      error: null,
    });

    await expect(removeCravingSwap("swap-1")).resolves.toBeUndefined();
    expect(mocks.update).toHaveBeenCalledWith({
      deleted: true,
      deleted_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T.*Z$/),
    });
    expect(mocks.idFilter).toHaveBeenCalledWith("id", "swap-1");
    expect(mocks.ownerFilter).toHaveBeenCalledWith("user_id", "user-1");
    expect(mocks.activeFilter).toHaveBeenCalledWith("deleted", false);
  });

  test("rejects removing a missing or inactive owned swap", async () => {
    mockOwnedUpdate({ data: null, error: null });

    await expect(removeCravingSwap("missing")).rejects.toThrow(
      "Craving swap was not found or is no longer active.",
    );
  });

  test("preserves Supabase update errors through mutation wrappers", async () => {
    mockOwnedUpdate({
      data: null,
      error: { message: "Swap update failed" },
    });

    await expect(setSwapFavorited("swap-1", true)).rejects.toThrow(
      "Swap update failed",
    );
  });
});
