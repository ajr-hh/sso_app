import { getSupabase } from "../lib/supabase";
import {
  createCoachMessage,
  fetchCoachMessages,
  generateCoachReply,
  hideCoachMessage,
  hideVisibleCoachMessages,
} from "./coachMessages";

jest.mock("../lib/supabase", () => ({
  getSupabase: jest.fn(),
}));

const mockedGetSupabase = jest.mocked(getSupabase);

describe("coach messages data", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("loads only this member's active thread for the chosen coach", async () => {
    const order = jest.fn().mockResolvedValue({
      data: [
        {
          id: "msg-1",
          coach_style: "sam",
          role: "coach",
          body: "What's the next ten minutes look like?",
          created_at: "2026-09-06T12:00:00.000Z",
        },
      ],
      error: null,
    });
    const visibleFilter = jest.fn().mockReturnValue({
      order: jest.fn().mockReturnValue({ order }),
    });
    const deletedFilter = jest.fn().mockReturnValue({ eq: visibleFilter });
    const coachFilter = jest.fn().mockReturnValue({ eq: deletedFilter });
    const userFilter = jest.fn().mockReturnValue({ eq: coachFilter });
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

    await expect(fetchCoachMessages("sam")).resolves.toEqual([
      {
        id: "msg-1",
        coach_style: "sam",
        role: "coach",
        body: "What's the next ten minutes look like?",
        created_at: "2026-09-06T12:00:00.000Z",
        show_message: true,
      },
    ]);
    expect(select).toHaveBeenCalledWith(
      "id, coach_style, role, body, created_at, show_message",
    );
    expect(userFilter).toHaveBeenCalledWith("user_id", "user-1");
    expect(coachFilter).toHaveBeenCalledWith("coach_style", "sam");
    expect(deletedFilter).toHaveBeenCalledWith("deleted", false);
    expect(visibleFilter).toHaveBeenCalledWith("show_message", true);
  });

  test("saves a member message without sending the text to the job row", async () => {
    const single = jest.fn().mockResolvedValue({
      data: {
        id: "msg-2",
        coach_style: "marcus",
        role: "member",
        body: "The craving is loud.",
        created_at: "2026-09-06T12:01:00.000Z",
      },
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

    await expect(
      createCoachMessage({
        coachStyle: "marcus",
        role: "member",
        body: "The craving is loud.",
      }),
    ).resolves.toMatchObject({
      role: "member",
      body: "The craving is loud.",
    });
    expect(insert).toHaveBeenCalledWith({
      user_id: "user-1",
      coach_style: "marcus",
      role: "member",
      body: "The craving is loud.",
    });
  });

  test("asks sos-generate for a coach reply with style only", async () => {
    const invoke = jest.fn().mockResolvedValue({
      data: {
        job_id: "job-1",
        status: "succeeded",
        output: { body: "Ride it for ten minutes. Then decide." },
      },
      error: null,
    });
    mockedGetSupabase.mockReturnValue({
      functions: { invoke },
    } as never);

    await expect(generateCoachReply("elena")).resolves.toBe(
      "Ride it for ten minutes. Then decide.",
    );
    expect(invoke).toHaveBeenCalledWith("sos-generate", {
      body: {
        kind: "coach_reply",
        input: { coach_style: "elena" },
      },
    });
    expect(JSON.stringify(invoke.mock.calls[0])).not.toContain("why_matters");
    expect(JSON.stringify(invoke.mock.calls[0])).not.toContain("—");
  });

  test("hides one message without deleting the row", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({
      data: { id: "msg-1" },
      error: null,
    });
    const select = jest.fn().mockReturnValue({ maybeSingle });
    const visibleFilter = jest.fn().mockReturnValue({ select });
    const ownerFilter = jest.fn().mockReturnValue({ eq: visibleFilter });
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

    await hideCoachMessage("msg-1");
    expect(update).toHaveBeenCalledWith({ show_message: false });
    expect(idFilter).toHaveBeenCalledWith("id", "msg-1");
    expect(ownerFilter).toHaveBeenCalledWith("user_id", "user-1");
    expect(visibleFilter).toHaveBeenCalledWith("show_message", true);
  });

  test("hides every visible message for this coach without deleting rows", async () => {
    const visibleFilter = jest.fn().mockResolvedValue({ error: null });
    const coachFilter = jest.fn().mockReturnValue({ eq: visibleFilter });
    const ownerFilter = jest.fn().mockReturnValue({ eq: coachFilter });
    const update = jest.fn().mockReturnValue({ eq: ownerFilter });
    mockedGetSupabase.mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
      from: jest.fn().mockReturnValue({ update }),
    } as never);

    await hideVisibleCoachMessages("sam");
    expect(update).toHaveBeenCalledWith({ show_message: false });
    expect(ownerFilter).toHaveBeenCalledWith("user_id", "user-1");
    expect(coachFilter).toHaveBeenCalledWith("coach_style", "sam");
    expect(visibleFilter).toHaveBeenCalledWith("show_message", true);
  });
});
