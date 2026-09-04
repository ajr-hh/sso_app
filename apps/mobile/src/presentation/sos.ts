export type GoalsLoad = {
  begin: () => number;
  invalidate: () => void;
  isCurrent: (token: number) => boolean;
};

// The reminder section reloads on every focus and on every retry, so an earlier
// request can still resolve after a newer one started. Only the newest load may
// write goals, error, or loading: otherwise a stale response overwrites fresh
// goals, and a stale `finally` clears the spinner the newer request is showing.
// Leaving the screen invalidates whatever is in flight, so a request that lands
// after the blur cannot write state or announce into another screen.
export function createGoalsLoad(): GoalsLoad {
  let current = 0;

  return {
    begin() {
      current += 1;
      return current;
    },
    invalidate() {
      current += 1;
    },
    isCurrent(token) {
      return token === current;
    },
  };
}

export type GoalsFailure = {
  message: string;
  revision: number;
};

export type QuickReminderView = {
  failure: GoalsFailure | null;
  showEmpty: boolean;
  showGoals: boolean;
  showSpinner: boolean;
};

// One source for every branch the section renders, so the error UI cannot drift
// out of step with the body.
export function getQuickReminderView(
  loading: boolean,
  failure: GoalsFailure | null,
  goalCount: number,
): QuickReminderView {
  const hasGoals = goalCount > 0;

  return {
    failure,
    // A failure must never read as an empty goal list.
    showEmpty: !hasGoals && failure === null && !loading,
    // Goals that already loaded survive a failed or slow refresh.
    showGoals: hasGoals,
    showSpinner: loading && !hasGoals,
  };
}

// Failures are announced by the ErrorBanner alert, so the status region stays
// quiet about them and only reports progress and successful outcomes.
export function getQuickReminderStatus(
  loading: boolean,
  failure: GoalsFailure | null,
  goalCount: number,
): string | null {
  if (loading) {
    return "Loading goals…";
  }

  if (failure !== null) {
    return null;
  }

  return goalCount > 0 ? "Goals updated." : "No goals yet.";
}

// Android reads the permanent polite live region on its own, so only iOS needs
// an explicit announcement; doing both would duplicate the status.
export function shouldAnnounceQuickReminderStatus(platform: string): boolean {
  return platform === "ios";
}

function endPunctuated(text: string): string {
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

// The card groups its own children, so the label has to carry every visible
// string, including the Continue call to action; the hint only adds what
// happens on activation.
export function getPathCardLabel(title: string, body: string): string {
  return `${endPunctuated(title)} ${endPunctuated(body)} Continue`;
}

export const PATH_CARD_HINT = "Opens this support path.";

// Two failed retries in a row carry the same message, and neither platform
// reliably repeats an unchanged alert, so each failure gets its own revision to
// remount the banner and announce exactly once.
export function nextErrorRevision(current: number | null): number {
  return current === null ? 1 : current + 1;
}
