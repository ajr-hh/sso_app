import {
  createRailOrderSync,
  getMoveBoundaryAnnouncement,
  getMoveControlHint,
  getMoveControlLabel,
  getMoveControlText,
  getMoveFailureStatus,
  getMovePositionText,
  getMoveSuccessStatus,
  getReorderModeAnnouncement,
  getReorderSavingStatus,
  shouldAnnounceReorderStatus,
} from "./rails";

describe("createRailOrderSync", () => {
  test("applies a load that nothing has superseded", () => {
    const sync = createRailOrderSync();
    const load = sync.beginLoad();

    expect(sync.shouldApplyLoad(load)).toBe(true);
  });

  test("ignores a load that resolves while a save is in flight", () => {
    const sync = createRailOrderSync();
    const load = sync.beginLoad();
    sync.beginSave();

    expect(sync.shouldApplyLoad(load)).toBe(false);
  });

  test("ignores a load that started before a completed save", () => {
    const sync = createRailOrderSync();
    const load = sync.beginLoad();
    const save = sync.beginSave();
    sync.finishSave(save);

    expect(sync.shouldApplyLoad(load)).toBe(false);
  });

  // Such a load may have reached the server before the save did, so its
  // response can still hold the pre-save order once the save settles.
  test("never applies a load that started while a save was in flight", () => {
    const sync = createRailOrderSync();
    const save = sync.beginSave();
    const load = sync.beginLoad();

    expect(sync.shouldApplyLoad(load)).toBe(false);

    sync.finishSave(save);
    expect(sync.shouldApplyLoad(load)).toBe(false);
  });

  test("never applies a load that started before a save settled", () => {
    const sync = createRailOrderSync();
    const load = sync.beginLoad();
    const save = sync.beginSave();

    expect(sync.shouldApplyLoad(load)).toBe(false);

    sync.finishSave(save);
    expect(sync.shouldApplyLoad(load)).toBe(false);
  });

  test("never applies a load overlapped by staggered saves", () => {
    const sync = createRailOrderSync();
    const first = sync.beginSave();
    const load = sync.beginLoad();
    const second = sync.beginSave();
    sync.finishSave(first);

    expect(sync.shouldApplyLoad(load)).toBe(false);

    sync.finishSave(second);
    expect(sync.shouldApplyLoad(load)).toBe(false);
  });

  test("applies a load started after the last save settled", () => {
    const sync = createRailOrderSync();
    const save = sync.beginSave();
    sync.finishSave(save);
    const load = sync.beginLoad();

    expect(sync.shouldApplyLoad(load)).toBe(true);
  });

  test("applies a fresh load retried after a stale one", () => {
    const sync = createRailOrderSync();
    const save = sync.beginSave();
    const stale = sync.beginLoad();
    sync.finishSave(save);
    const retried = sync.beginLoad();

    expect(sync.shouldApplyLoad(stale)).toBe(false);
    expect(sync.shouldApplyLoad(retried)).toBe(true);
  });

  test("applies a load only once every overlapping save has settled", () => {
    const sync = createRailOrderSync();
    const first = sync.beginSave();
    const second = sync.beginSave();
    sync.finishSave(second);
    const duringFirst = sync.beginLoad();
    sync.finishSave(first);
    const afterBoth = sync.beginLoad();

    expect(sync.shouldApplyLoad(duringFirst)).toBe(false);
    expect(sync.shouldApplyLoad(afterBoth)).toBe(true);
  });

  test("rolls back the newest failed save", () => {
    const sync = createRailOrderSync();
    const save = sync.beginSave();

    expect(sync.shouldRollbackSave(save)).toBe(true);
  });

  test("does not roll back a save superseded by a newer reorder", () => {
    const sync = createRailOrderSync();
    const stale = sync.beginSave();
    sync.beginSave();

    expect(sync.shouldRollbackSave(stale)).toBe(false);
  });

  test("finishing a save twice leaves later loads applicable", () => {
    const sync = createRailOrderSync();
    const save = sync.beginSave();
    sync.finishSave(save);
    sync.finishSave(save);
    const load = sync.beginLoad();

    expect(sync.shouldApplyLoad(load)).toBe(true);
  });
});

describe("rail move controls", () => {
  test("accessible names begin with the visible control text", () => {
    for (const direction of ["up", "down"] as const) {
      const label = getMoveControlLabel(direction, "Remember Your Why");
      expect(label.startsWith(getMoveControlText(direction))).toBe(true);
    }

    expect(getMoveControlLabel("up", "Remember Your Why")).toBe(
      "Move up, Remember Your Why",
    );
    expect(getMoveControlLabel("down", "Hard Truths")).toBe(
      "Move down, Hard Truths",
    );
  });

  test("keeps the position out of the name and in the hint", () => {
    expect(getMoveControlLabel("up", "The Numbers")).not.toMatch(/position/i);
    expect(getMoveControlHint(0, 7)).toBe("Currently position 1 of 7.");
    expect(getMovePositionText(2, 7)).toBe("Position 3 of 7");
  });

  test("announces an unchanged order at each boundary", () => {
    expect(getMoveBoundaryAnnouncement("up", "Better Choices")).toBe(
      "Better Choices is already first.",
    );
    expect(getMoveBoundaryAnnouncement("down", "The Numbers")).toBe(
      "The Numbers is already last.",
    );
  });
});

describe("rail reorder status", () => {
  test("reports saving, success, and restored order", () => {
    expect(getReorderSavingStatus()).toBe("Saving new order…");
    expect(getMoveSuccessStatus("Small Wins", 2, 7)).toBe(
      "Small Wins moved to position 2 of 7.",
    );
    expect(getMoveFailureStatus()).toBe(
      "Move failed. The previous order was restored.",
    );
  });

  test("describes entering and leaving reorder mode", () => {
    expect(getReorderModeAnnouncement(true)).toMatch(/^Reorder mode started/);
    expect(getReorderModeAnnouncement(false)).toBe("Reorder mode ended.");
  });

  test("announces explicitly only on iOS", () => {
    expect(shouldAnnounceReorderStatus("ios")).toBe(true);
    expect(shouldAnnounceReorderStatus("android")).toBe(false);
    expect(shouldAnnounceReorderStatus("web")).toBe(false);
  });
});
