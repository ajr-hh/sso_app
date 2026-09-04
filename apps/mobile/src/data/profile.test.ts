import { getSupabase } from "../lib/supabase";
import { fetchProfile, saveProfile, saveRailOrder } from "./profile";

jest.mock("../lib/supabase", () => ({
  getSupabase: jest.fn(),
}));

const mockedGetSupabase = jest.mocked(getSupabase);

describe("profile data", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("fetches only the signed-in member's active profile", async () => {
    const row = {
      age: 40,
      coach_style: "marcus",
      display_name: "Alex",
      id: "user-1",
      motivators: "Family",
      phone: null,
      rail_order: ["stats", "why"],
      why_matters: "Health",
    };
    const single = jest.fn().mockResolvedValue({ data: row, error: null });
    const activeFilter = jest.fn().mockReturnValue({ single });
    const idFilter = jest.fn().mockReturnValue({ eq: activeFilter });
    const select = jest.fn().mockReturnValue({ eq: idFilter });
    mockedGetSupabase.mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { email: "alex@example.test", id: "user-1" } },
          error: null,
        }),
      },
      from: jest.fn().mockReturnValue({ select }),
    } as never);

    await expect(fetchProfile()).resolves.toMatchObject({
      email: "alex@example.test",
      id: "user-1",
      rail_order: ["stats", "why"],
    });
    expect(select).toHaveBeenCalledWith(
      "id, display_name, age, phone, why_matters, motivators, coach_style, rail_order",
    );
    expect(idFilter).toHaveBeenCalledWith("id", "user-1");
    expect(activeFilter).toHaveBeenCalledWith("deleted", false);
  });

  test("defaults a missing rail order to an empty array", async () => {
    const single = jest.fn().mockResolvedValue({
      data: {
        age: null,
        coach_style: "elena",
        display_name: null,
        id: "user-1",
        motivators: "Family",
        phone: null,
        rail_order: null,
        why_matters: null,
      },
      error: null,
    });
    const activeFilter = jest.fn().mockReturnValue({ single });
    const idFilter = jest.fn().mockReturnValue({ eq: activeFilter });
    mockedGetSupabase.mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({ eq: idFilter }),
      }),
    } as never);

    await expect(fetchProfile()).resolves.toMatchObject({ rail_order: [] });
  });

  test("filters unknown and duplicate rail IDs returned by the database", async () => {
    const single = jest.fn().mockResolvedValue({
      data: {
        age: null,
        coach_style: "marcus",
        display_name: "Alex",
        id: "user-1",
        motivators: "Family",
        phone: null,
        rail_order: ["stats", "unknown", 7, "stats", "why"],
        why_matters: "Health",
      },
      error: null,
    });
    const activeFilter = jest.fn().mockReturnValue({ single });
    const idFilter = jest.fn().mockReturnValue({ eq: activeFilter });
    mockedGetSupabase.mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({ eq: idFilter }),
      }),
    } as never);

    await expect(fetchProfile()).resolves.toMatchObject({
      rail_order: ["stats", "why"],
    });
  });

  test("saves only an active profile", async () => {
    const activeFilter = jest.fn().mockResolvedValue({ error: null });
    const idFilter = jest.fn().mockReturnValue({ eq: activeFilter });
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

    await expect(saveProfile({ display_name: "Alex" })).resolves.toBeUndefined();
    expect(update).toHaveBeenCalledWith({ display_name: "Alex" });
    expect(activeFilter).toHaveBeenCalledWith("deleted", false);
  });

  test("saves only rail order for the signed-in active profile", async () => {
    const activeFilter = jest.fn().mockResolvedValue({ error: null });
    const idFilter = jest.fn().mockReturnValue({ eq: activeFilter });
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
      saveRailOrder(["stats", "why", "call"]),
    ).resolves.toBeUndefined();
    expect(update).toHaveBeenCalledWith({
      rail_order: ["stats", "why", "call"],
    });
    expect(idFilter).toHaveBeenCalledWith("id", "user-1");
    expect(activeFilter).toHaveBeenCalledWith("deleted", false);
  });
});
