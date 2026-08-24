export const coachLibrary = {
  marcus: [
    "You don't stop because it's hard. You stop when you decide it's over — so don't decide that today.",
    "The craving is a ten-minute wave. Ride it. Then decide.",
    "You already know the next move. Do it before the story starts.",
  ],
  elena: [
    "One choice doesn't undo your progress. You've already proven you can do hard things — this is just the next one.",
    "You don't have to be perfect tonight. You have to be on your own side.",
    "This feeling will pass. The person you're becoming is still here.",
  ],
} as const;

export type CoachStyle = keyof typeof coachLibrary;
