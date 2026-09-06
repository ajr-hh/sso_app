export const UPCOMING_EVENTS = [
  "Holiday Meal",
  "Celebration",
  "Travel",
] as const;

export type UpcomingEvent = (typeof UPCOMING_EVENTS)[number];

export const CHECK_IN_LABEL = "Set a check-in for tomorrow";
export const CHECK_IN_SAVING_LABEL = "Setting your check-in…";
export const CHECK_IN_DONE = "Check-in set for tomorrow";

// The task shows up in tomorrow's list on its own, so its label names the plan
// it belongs to rather than repeating that it is a check-in for tomorrow.
export function getCheckInTaskLabel(event: UpcomingEvent | null): string {
  return event === null
    ? "Check in on your plan"
    : `Check in on your ${event.toLowerCase()} plan`;
}
