import { getSupabase } from "../lib/supabase";
import {
  createMilestoneReward,
  fetchMilestoneRewards,
  removeMilestoneReward,
  updateMilestoneReward,
} from "./rewards";

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
  id: "m1",
  milestone: "Lose 10 pounds",
  reward: "A new shirt",
  progress_note: "6 lbs to go",
  completed: false,
  completed_at: null,
};

describe("milestone rewards data", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("loads only this member's active milestones", async () => {
    const order = jest.fn().mockResolvedValue({ data: [row], error: null });
    const deletedFilter = jest.fn().mockReturnValue({
      order: jest.fn().mockReturnValue({ order }),
    });
    const userFilter = jest.fn().mockReturnValue({ eq: deletedFilter });
    const select = jest.fn().mockReturnValue({ eq: userFilter });
    mockedGetSupabase.mockReturnValue({
      auth: signedInAuth,
      from: jest.fn().mockReturnValue({ select }),
    } as never);

    await expect(fetchMilestoneRewards()).resolves.toEqual([row]);
    expect(select).toHaveBeenCalledWith(
      "id, milestone, reward, progress_note, completed, completed_at",
    );
    expect(userFilter).toHaveBeenCalledWith("user_id", "user-1");
    expect(deletedFilter).toHaveBeenCalledWith("deleted", false);
  });

  test("saves a trimmed milestone and reward", async () => {
    const single = jest.fn().mockResolvedValue({ data: row, error: null });
    const select = jest.fn().mockReturnValue({ single });
    const insert = jest.fn().mockReturnValue({ select });
    mockedGetSupabase.mockReturnValue({
      auth: signedInAuth,
      from: jest.fn().mockReturnValue({ insert }),
    } as never);

    await expect(
      createMilestoneReward({
        milestone: "  Lose 10 pounds  ",
        reward: "  A new shirt  ",
      }),
    ).resolves.toEqual(row);
    expect(insert).toHaveBeenCalledWith({
      user_id: "user-1",
      milestone: "Lose 10 pounds",
      reward: "A new shirt",
    });
  });

  test("updates progress or completion without deleting the row", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({
      data: { ...row, completed: true, progress_note: null },
      error: null,
    });
    const select = jest.fn().mockReturnValue({ maybeSingle });
    const deletedFilter = jest.fn().mockReturnValue({ select });
    const ownerFilter = jest.fn().mockReturnValue({ eq: deletedFilter });
    const idFilter = jest.fn().mockReturnValue({ eq: ownerFilter });
    const update = jest.fn().mockReturnValue({ eq: idFilter });
    mockedGetSupabase.mockReturnValue({
      auth: signedInAuth,
      from: jest.fn().mockReturnValue({ update }),
    } as never);

    await updateMilestoneReward("m1", {
      completed: true,
      progress_note: "6 lbs to go",
    });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        completed: true,
        completed_at: expect.any(String),
      }),
    );
  });

  test("soft-deletes only an active milestone owned by this member", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({
      data: { id: "m1" },
      error: null,
    });
    const select = jest.fn().mockReturnValue({ maybeSingle });
    const deletedFilter = jest.fn().mockReturnValue({ select });
    const ownerFilter = jest.fn().mockReturnValue({ eq: deletedFilter });
    const idFilter = jest.fn().mockReturnValue({ eq: ownerFilter });
    const update = jest.fn().mockReturnValue({ eq: idFilter });
    mockedGetSupabase.mockReturnValue({
      auth: signedInAuth,
      from: jest.fn().mockReturnValue({ update }),
    } as never);

    await removeMilestoneReward("m1");
    expect(update).toHaveBeenCalledWith({
      deleted: true,
      deleted_at: expect.any(String),
    });
    expect(idFilter).toHaveBeenCalledWith("id", "m1");
    expect(ownerFilter).toHaveBeenCalledWith("user_id", "user-1");
    expect(deletedFilter).toHaveBeenCalledWith("deleted", false);
  });
});
