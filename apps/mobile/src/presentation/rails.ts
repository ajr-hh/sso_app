export type MoveDirection = "up" | "down";

export type RailOrderSync = {
  beginLoad: () => number;
  shouldApplyLoad: (token: number) => boolean;
  beginSave: () => number;
  shouldRollbackSave: (token: number) => boolean;
  finishSave: (token: number) => void;
};

// The rail screens refetch on focus while saving reorders optimistically, so a
// slow load can otherwise overwrite a newer local order, and a failed save can
// roll back on top of a change made afterwards. Each optimistic save bumps a
// revision: a load only applies when it started at the current revision with no
// save in flight, and a save only rolls back while it is the newest change.
export function createRailOrderSync(): RailOrderSync {
  // A load that starts while a save is in flight can reach the server first, so
  // its response may carry the pre-save order however late it resolves. That
  // makes it stale for good rather than only until the save settles.
  const STALE_LOAD = -1;
  let revision = 0;
  const savesInFlight = new Set<number>();

  return {
    beginLoad() {
      return savesInFlight.size > 0 ? STALE_LOAD : revision;
    },
    shouldApplyLoad(token) {
      return (
        token !== STALE_LOAD && savesInFlight.size === 0 && token === revision
      );
    },
    beginSave() {
      revision += 1;
      savesInFlight.add(revision);
      return revision;
    },
    shouldRollbackSave(token) {
      return token === revision;
    },
    finishSave(token) {
      savesInFlight.delete(token);
    },
  };
}

export function getMoveControlText(direction: MoveDirection): string {
  return direction === "up" ? "Move up" : "Move down";
}

// Screen readers read the label instead of the visible text, so it has to start
// with the same words the control shows; the position goes in the hint.
export function getMoveControlLabel(
  direction: MoveDirection,
  title: string,
): string {
  return `${getMoveControlText(direction)}, ${title}`;
}

export function getMoveControlHint(index: number, total: number): string {
  return `Currently position ${index + 1} of ${total}.`;
}

export function getMovePositionText(index: number, total: number): string {
  return `Position ${index + 1} of ${total}`;
}

export function getMoveBoundaryAnnouncement(
  direction: MoveDirection,
  title: string,
): string {
  return direction === "up"
    ? `${title} is already first.`
    : `${title} is already last.`;
}

export function getReorderSavingStatus(): string {
  return "Saving new order…";
}

export function getMoveSuccessStatus(
  title: string,
  position: number,
  total: number,
): string {
  return `${title} moved to position ${position} of ${total}.`;
}

export function getMoveFailureStatus(): string {
  return "Move failed. The previous order was restored.";
}

export function getReorderModeAnnouncement(reordering: boolean): string {
  return reordering
    ? "Reorder mode started. Use the move controls for each support option."
    : "Reorder mode ended.";
}

// Android reads the permanent polite live region on its own, so only iOS needs
// an explicit announcement; doing both would duplicate the status.
export function shouldAnnounceReorderStatus(platform: string): boolean {
  return platform === "ios";
}
