export type GoalStatusKind = "added" | "updated" | "removed";

export function getGoalStatusMessage(
  kind: GoalStatusKind,
  label: string,
): string {
  switch (kind) {
    case "added":
      return `Goal added: ${label}.`;
    case "updated":
      return `Goal updated: ${label}.`;
    case "removed":
      return `Goal removed: ${label}.`;
  }
}

export function shouldAnnounceGoalStatus(platform: string): boolean {
  return platform === "ios";
}

export function shouldShowGoalsInitialLoadFailure(
  hasLoaded: boolean,
  loadError: string | null,
): boolean {
  return !hasLoaded && loadError !== null;
}
