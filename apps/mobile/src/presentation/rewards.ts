export const MILESTONE_FIELD_LIMITS = {
  milestone: 80,
  reward: 120,
  progress_note: 40,
} as const;

export const REWARDS_COPY = {
  title: "You're closer than you think",
  subtitle:
    "Milestones you set for yourself, tangible, meaningful, attainable.",
  add: "Add a new milestone reward",
  privacy:
    "Rewards can stay private or be shared with your accountability partners or challenge group.",
  earned: "Earned",
  justStarted: "Just started",
  milestoneLabel: "Milestone",
  rewardLabel: "Reward",
  progressLabel: "How close",
  save: "Save milestone",
  markComplete: "Mark complete",
  remove: "Remove",
  removeTitle: "Remove this reward?",
  removeBody: (milestone: string) => `Remove ${milestone} from Small Wins?`,
  addTitle: "Add a milestone reward",
  editTitle: "Edit milestone reward",
  loading: "Loading your rewards…",
} as const;

export function getMilestonePillLabel(input: {
  completed: boolean;
  progress_note: string | null;
}): string {
  if (input.completed) {
    return REWARDS_COPY.earned;
  }
  const note = input.progress_note?.trim() ?? "";
  return note.length > 0 ? note : REWARDS_COPY.justStarted;
}

export function getMilestoneTileLabel(input: {
  milestone: string;
  reward: string;
  completed: boolean;
  progress_note: string | null;
}): string {
  return `${input.milestone}, ${input.reward}, ${getMilestonePillLabel(input)}. Edit`;
}

export function getMilestoneValidationError(input: {
  milestone: string;
  reward: string;
}): string | null {
  const milestone = input.milestone.trim();
  const reward = input.reward.trim();
  if (milestone.length === 0) {
    return "Write the milestone first.";
  }
  if (milestone.length > MILESTONE_FIELD_LIMITS.milestone) {
    return "Keep milestones under 80 characters.";
  }
  if (reward.length === 0) {
    return "Write the reward first.";
  }
  if (reward.length > MILESTONE_FIELD_LIMITS.reward) {
    return "Keep rewards under 120 characters.";
  }
  return null;
}
