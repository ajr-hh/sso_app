import { getSupabase } from "../lib/supabase";
import { fetchProfile, saveProfile } from "./profile";

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
      why_matters: "Health",
    };
    const single = jest.fn().mockResolvedValue({ data: row, error: null });
    const activeFilter = jest.fn().mockReturnValue({ single });
    const idFilter = jest.fn().mockReturnValue({ is: activeFilter });
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
    });
    expect(idFilter).toHaveBeenCalledWith("id", "user-1");
    expect(activeFilter).toHaveBeenCalledWith("deleted_at", null);
  });

  test("saves only an active profile", async () => {
    const activeFilter = jest.fn().mockResolvedValue({ error: null });
    const idFilter = jest.fn().mockReturnValue({ is: activeFilter });
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
    expect(activeFilter).toHaveBeenCalledWith("deleted_at", null);
  });
});
