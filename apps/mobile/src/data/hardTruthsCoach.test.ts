import { getSupabase } from "../lib/supabase";
import {
  fetchHardTruthsCoachLine,
  generateHardTruthsCoachLine,
  saveHardTruthsCoachLine,
} from "./hardTruthsCoach";

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

const row = {
  id: "line-1",
  coach_style: "sam",
  body: "You picked these. Look at them.",
};

describe("hard truths coach line data", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("loads this member's active line for the picked coach", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: row, error: null });
    const deletedFilter = jest.fn().mockReturnValue({ maybeSingle });
    const coachFilter = jest.fn().mockReturnValue({ eq: deletedFilter });
    const userFilter = jest.fn().mockReturnValue({ eq: coachFilter });
    const select = jest.fn().mockReturnValue({ eq: userFilter });
    mockedGetSupabase.mockReturnValue({
      auth: signedInAuth,
      from: jest.fn().mockReturnValue({ select }),
    } as never);

    await expect(fetchHardTruthsCoachLine("sam")).resolves.toEqual(row);
    expect(select).toHaveBeenCalledWith("id, coach_style, body");
    expect(userFilter).toHaveBeenCalledWith("user_id", "user-1");
    expect(coachFilter).toHaveBeenCalledWith("coach_style", "sam");
    expect(deletedFilter).toHaveBeenCalledWith("deleted", false);
  });

  test("asks sos-generate with coach style only", async () => {
    const invoke = jest.fn().mockResolvedValue({
      data: { status: "succeeded", output: { body: "Look. Then put the fork down." } },
      error: null,
    });
    mockedGetSupabase.mockReturnValue({
      auth: signedInAuth,
      functions: { invoke },
    } as never);

    await expect(generateHardTruthsCoachLine("marcus")).resolves.toBe(
      "Look. Then put the fork down.",
    );
    expect(invoke).toHaveBeenCalledWith("sos-generate", {
      body: {
        kind: "hard_truths_coach",
        input: { coach_style: "marcus" },
      },
    });
  });

  test("saves a generated line for the signed-in member", async () => {
    const single = jest.fn().mockResolvedValue({ data: row, error: null });
    const select = jest.fn().mockReturnValue({ single });
    const insert = jest.fn().mockReturnValue({ select });
    mockedGetSupabase.mockReturnValue({
      auth: signedInAuth,
      from: jest.fn().mockReturnValue({ insert }),
    } as never);

    await expect(
      saveHardTruthsCoachLine({
        coachStyle: "sam",
        body: "  Look. Then put the fork down.  ",
      }),
    ).resolves.toEqual(row);
    expect(insert).toHaveBeenCalledWith({
      user_id: "user-1",
      coach_style: "sam",
      body: "Look. Then put the fork down.",
    });
  });
});
