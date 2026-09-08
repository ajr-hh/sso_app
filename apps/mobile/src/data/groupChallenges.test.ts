import { getSupabase } from "../lib/supabase";
import {
  createGroupChallenge,
  fetchGroupChallenges,
  inviteToGroupChallenge,
} from "./groupChallenges";

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

const challengeRow = {
  id: "ch-1",
  duration_days: 30,
  buy_in: 20,
  created_at: "2026-09-07T12:00:00.000Z",
};

describe("group challenges data", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("creates a 30-day challenge with a $20 buy-in", async () => {
    const single = jest.fn().mockResolvedValue({ data: challengeRow, error: null });
    const select = jest.fn().mockReturnValue({ single });
    const insert = jest.fn().mockReturnValue({ select });
    mockedGetSupabase.mockReturnValue({
      auth: signedInAuth,
      from: jest.fn().mockReturnValue({ insert }),
    } as never);

    await expect(createGroupChallenge()).resolves.toEqual({
      id: "ch-1",
      duration_days: 30,
      buy_in: 20,
      created_at: "2026-09-07T12:00:00.000Z",
      invited_emails: [],
    });
    expect(insert).toHaveBeenCalledWith({
      user_id: "user-1",
      duration_days: 30,
      buy_in: 20,
    });
  });

  test("loads this member's challenges and invited emails", async () => {
    const challengeOrder = jest.fn().mockResolvedValue({
      data: [challengeRow],
      error: null,
    });
    const challengeDeleted = jest.fn().mockReturnValue({ order: challengeOrder });
    const challengeUser = jest.fn().mockReturnValue({ eq: challengeDeleted });
    const challengeSelect = jest.fn().mockReturnValue({ eq: challengeUser });

    const inviteDeleted = jest.fn().mockResolvedValue({
      data: [{ challenge_id: "ch-1", email: "jamie@example.com" }],
      error: null,
    });
    const inviteUser = jest.fn().mockReturnValue({ eq: inviteDeleted });
    const inviteSelect = jest.fn().mockReturnValue({ eq: inviteUser });

    mockedGetSupabase.mockReturnValue({
      auth: signedInAuth,
      from: jest
        .fn()
        .mockReturnValueOnce({ select: challengeSelect })
        .mockReturnValueOnce({ select: inviteSelect }),
    } as never);

    await expect(fetchGroupChallenges()).resolves.toEqual([
      {
        ...challengeRow,
        invited_emails: ["jamie@example.com"],
      },
    ]);
  });

  test("stores an invite email on the challenge", async () => {
    const single = jest.fn().mockResolvedValue({
      data: { id: "inv-1", challenge_id: "ch-1", email: "jamie@example.com" },
      error: null,
    });
    const select = jest.fn().mockReturnValue({ single });
    const insert = jest.fn().mockReturnValue({ select });
    mockedGetSupabase.mockReturnValue({
      auth: signedInAuth,
      from: jest.fn().mockReturnValue({ insert }),
    } as never);

    await expect(
      inviteToGroupChallenge("ch-1", "  Jamie@Example.com  "),
    ).resolves.toEqual({
      id: "inv-1",
      challenge_id: "ch-1",
      email: "jamie@example.com",
    });
    expect(insert).toHaveBeenCalledWith({
      user_id: "user-1",
      challenge_id: "ch-1",
      email: "jamie@example.com",
    });
  });
});
