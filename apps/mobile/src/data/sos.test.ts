import { getSupabase } from "../lib/supabase";
import { logSosEvent } from "./sos";

jest.mock("../lib/supabase", () => ({
  getSupabase: jest.fn(),
}));

const mockedGetSupabase = jest.mocked(getSupabase);

describe("SOS event data", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("logs the path and reinforcement for the signed-in member", async () => {
    const insert = jest.fn().mockResolvedValue({ error: null });
    mockedGetSupabase.mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
      from: jest.fn().mockReturnValue({ insert }),
    } as never);

    await expect(
      logSosEvent("off_the_rails", "stats_view"),
    ).resolves.toBeUndefined();
    expect(insert).toHaveBeenCalledWith({
      path: "off_the_rails",
      reinforcement: "stats_view",
      user_id: "user-1",
    });
  });

  test("requires an authenticated member", async () => {
    mockedGetSupabase.mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      },
    } as never);

    await expect(
      logSosEvent("planned_event", "stats_cta"),
    ).rejects.toThrow("You must be signed in to use SOS.");
  });

  test("surfaces insert failures", async () => {
    mockedGetSupabase.mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
      from: jest.fn().mockReturnValue({
        insert: jest.fn().mockResolvedValue({
          error: { message: "SOS unavailable" },
        }),
      }),
    } as never);

    await expect(
      logSosEvent("planned_event", "hard_truths_skip"),
    ).rejects.toThrow("SOS unavailable");
  });
});
