import {
  getMilestonePillLabel,
  getMilestoneTileLabel,
  getMilestoneValidationError,
  MILESTONE_FIELD_LIMITS,
  REWARDS_COPY,
} from "./rewards";

describe("rewards presentation", () => {
  test("uses the Small Wins copy", () => {
    expect(REWARDS_COPY.title).toBe("You're closer than you think");
    expect(REWARDS_COPY.subtitle).toBe(
      "Milestones you set for yourself, tangible, meaningful, attainable.",
    );
    expect(REWARDS_COPY.add).toBe("Add a new milestone reward");
    expect(REWARDS_COPY.privacy).toBe(
      "Rewards can stay private or be shared with your accountability partners or challenge group.",
    );
    expect(REWARDS_COPY.subtitle).not.toContain("—");
    expect(REWARDS_COPY.title).not.toContain("Progress is still progress");
  });

  test("shows earned or how far to go in the pill", () => {
    expect(getMilestonePillLabel({ completed: true, progress_note: "2 lbs" })).toBe(
      REWARDS_COPY.earned,
    );
    expect(
      getMilestonePillLabel({ completed: false, progress_note: "6 lbs to go" }),
    ).toBe("6 lbs to go");
    expect(getMilestonePillLabel({ completed: false, progress_note: "  " })).toBe(
      REWARDS_COPY.justStarted,
    );
  });

  test("names a tile with the milestone, reward, and how far to go", () => {
    expect(
      getMilestoneTileLabel({
        milestone: "Lose 10 pounds",
        reward: "A new shirt",
        completed: true,
        progress_note: null,
      }),
    ).toBe("Lose 10 pounds, A new shirt, Earned. Edit");
    expect(
      getMilestoneTileLabel({
        milestone: "Lose 20 pounds",
        reward: "A weekend drive",
        completed: false,
        progress_note: "6 lbs to go",
      }),
    ).toBe("Lose 20 pounds, A weekend drive, 6 lbs to go. Edit");
  });

  test("requires a milestone and a reward", () => {
    expect(MILESTONE_FIELD_LIMITS).toEqual({
      milestone: 80,
      reward: 120,
      progress_note: 40,
    });
    expect(
      getMilestoneValidationError({ milestone: "", reward: "A new shirt" }),
    ).toBe("Write the milestone first.");
    expect(
      getMilestoneValidationError({ milestone: "Lose 10 pounds", reward: "" }),
    ).toBe("Write the reward first.");
    expect(
      getMilestoneValidationError({
        milestone: "Lose 10 pounds",
        reward: "A new shirt",
      }),
    ).toBeNull();
  });
});
