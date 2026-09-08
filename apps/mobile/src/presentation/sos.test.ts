import {
  createGoalsLoad,
  getPathCardLabel,
  getQuickReminderStatus,
  getQuickReminderView,
  nextErrorRevision,
  shouldAnnounceQuickReminderStatus,
  PATH_CARD_HINT,
} from "./sos";

describe("createGoalsLoad", () => {
  test("treats the only load as current", () => {
    const load = createGoalsLoad();
    const token = load.begin();
    expect(load.isCurrent(token)).toBe(true);
  });

  test("a load from a previous focus never wins", () => {
    const load = createGoalsLoad();
    const previousFocus = load.begin();
    const currentFocus = load.begin();

    expect(load.isCurrent(previousFocus)).toBe(false);
    expect(load.isCurrent(currentFocus)).toBe(true);
  });

  test("an older retry cannot clear the newest loading state", () => {
    const load = createGoalsLoad();
    const firstRetry = load.begin();
    const secondRetry = load.begin();

    // The first retry's `finally` runs last but must leave loading alone.
    expect(load.isCurrent(secondRetry)).toBe(true);
    expect(load.isCurrent(firstRetry)).toBe(false);
  });

  test("staying current does not depend on how often it is checked", () => {
    const load = createGoalsLoad();
    const token = load.begin();

    expect(load.isCurrent(token)).toBe(true);
    expect(load.isCurrent(token)).toBe(true);
  });

  test("leaving the screen invalidates the load in flight", () => {
    const load = createGoalsLoad();
    const token = load.begin();

    load.invalidate();

    expect(load.isCurrent(token)).toBe(false);
  });

  test("invalidating leaves no token current at all", () => {
    const load = createGoalsLoad();
    const first = load.begin();
    const second = load.begin();

    load.invalidate();

    expect(load.isCurrent(first)).toBe(false);
    expect(load.isCurrent(second)).toBe(false);
  });

  test("a load started after invalidating is current again", () => {
    const load = createGoalsLoad();
    const beforeBlur = load.begin();
    load.invalidate();
    const afterRefocus = load.begin();

    expect(load.isCurrent(beforeBlur)).toBe(false);
    expect(load.isCurrent(afterRefocus)).toBe(true);
  });

  test("invalidating repeatedly is safe", () => {
    const load = createGoalsLoad();
    const token = load.begin();

    load.invalidate();
    load.invalidate();

    expect(load.isCurrent(token)).toBe(false);
    expect(load.isCurrent(load.begin())).toBe(true);
  });
});

const failure = { message: "Network error.", revision: 1 };

describe("getQuickReminderView", () => {
  test("shows a spinner only while the first load is running", () => {
    expect(getQuickReminderView(true, null, 0)).toEqual({
      failure: null,
      showEmpty: false,
      showGoals: false,
      showSpinner: true,
    });
  });

  test("keeps goals visible during a background refresh", () => {
    expect(getQuickReminderView(true, null, 2)).toEqual({
      failure: null,
      showEmpty: false,
      showGoals: true,
      showSpinner: false,
    });
  });

  test("shows the failure instead of an empty message when nothing loaded", () => {
    expect(getQuickReminderView(false, failure, 0)).toEqual({
      failure,
      showEmpty: false,
      showGoals: false,
      showSpinner: false,
    });
  });

  test("shows the failure alongside stale goals when a refresh fails", () => {
    expect(getQuickReminderView(false, failure, 3)).toEqual({
      failure,
      showEmpty: false,
      showGoals: true,
      showSpinner: false,
    });
  });

  test("carries the revision so a repeated failure remounts the banner", () => {
    const repeated = { message: failure.message, revision: 2 };

    expect(getQuickReminderView(false, repeated, 0).failure).toEqual(repeated);
  });

  test("shows the empty message once a load succeeds with no goals", () => {
    expect(getQuickReminderView(false, null, 0)).toEqual({
      failure: null,
      showEmpty: true,
      showGoals: false,
      showSpinner: false,
    });
  });

  test("shows goals once they arrive", () => {
    expect(getQuickReminderView(false, null, 1)).toEqual({
      failure: null,
      showEmpty: false,
      showGoals: true,
      showSpinner: false,
    });
  });
});

describe("getQuickReminderStatus", () => {
  test("reports progress while loading", () => {
    expect(getQuickReminderStatus(true, null, 0)).toBe("Loading goals…");
    expect(getQuickReminderStatus(true, failure, 0)).toBe("Loading goals…");
  });

  test("leaves failures to the error banner", () => {
    expect(getQuickReminderStatus(false, failure, 0)).toBeNull();
    expect(getQuickReminderStatus(false, failure, 2)).toBeNull();
  });

  test("introduces the goals it is about to list", () => {
    expect(getQuickReminderStatus(false, null, 1)).toBe("Your goal right now:");
    expect(getQuickReminderStatus(false, null, 2)).toBe(
      "Your goals right now:",
    );
    expect(getQuickReminderStatus(false, null, 0)).toBe("No goals yet.");
  });
});

describe("shouldAnnounceQuickReminderStatus", () => {
  test("only iOS announces explicitly", () => {
    expect(shouldAnnounceQuickReminderStatus("ios")).toBe(true);
    expect(shouldAnnounceQuickReminderStatus("android")).toBe(false);
  });
});

describe("getPathCardLabel", () => {
  test("carries the title, the body, and the visible Continue action", () => {
    expect(getPathCardLabel("Help", "Urgent support")).toBe(
      "Help. Urgent support. Continue",
    );
  });

  test("does not double up punctuation the copy already ends with", () => {
    expect(getPathCardLabel("Help!", "Something coming up.")).toBe(
      "Help! Something coming up. Continue",
    );
  });

  test("the hint describes the outcome rather than repeating the copy", () => {
    expect(PATH_CARD_HINT).toBe("Opens this support path.");
  });
});

describe("nextErrorRevision", () => {
  test("the first failure starts the sequence", () => {
    expect(nextErrorRevision(null)).toBe(1);
  });

  test("each repeated failure gets its own revision", () => {
    expect(nextErrorRevision(1)).toBe(2);
    expect(nextErrorRevision(2)).toBe(3);
  });
});
