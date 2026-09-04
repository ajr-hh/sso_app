import {
  beginLabelChange,
  forgetLabelIntention,
  getIntendedLabel,
  restoreLabel,
  settleLabelChange,
  type LabelIntentions,
} from "./labels";

const EMPTY: LabelIntentions = new Map();

describe("label intentions", () => {
  test("restores the saved label when an edit is empty", () => {
    expect(restoreLabel("   ", "Take a walk")).toBe("Take a walk");
    expect(restoreLabel("", "Take a walk")).toBe("Take a walk");
    expect(restoreLabel(" Read ", "Take a walk")).toBe("Read");
  });

  test("falls back to the saved label until an edit is queued", () => {
    expect(getIntendedLabel(EMPTY, "goal-1", "Walk")).toBe("Walk");

    const started = beginLabelChange(EMPTY, "goal-1", "Walk", "Run");

    expect(getIntendedLabel(started.intentions, "goal-1", "Walk")).toBe("Run");
    expect(getIntendedLabel(started.intentions, "goal-2", "Walk")).toBe("Walk");
  });

  test("queued edits build on the latest synchronous intention", () => {
    const first = beginLabelChange(EMPTY, "goal-1", "A", "B");
    const second = beginLabelChange(first.intentions, "goal-1", "A", "C");

    expect(first.change.revision).toBe(1);
    expect(second.change.revision).toBe(2);
    expect(second.change.target).toBe("C");
    expect(getIntendedLabel(second.intentions, "goal-1", "A")).toBe("C");
  });

  test("two queued edits that both fail restore the last confirmed label", () => {
    const first = beginLabelChange(EMPTY, "goal-1", "A", "B");
    const second = beginLabelChange(first.intentions, "goal-1", "A", "C");

    const failedFirst = settleLabelChange(
      second.intentions,
      first.change,
      false,
    );
    const failedSecond = settleLabelChange(
      failedFirst.intentions,
      second.change,
      false,
    );

    // "B" also failed, so it must never become the restored value.
    expect(failedFirst.rollbackLabel).toBeUndefined();
    expect(failedSecond.rollbackLabel).toBe("A");
    expect(failedSecond.intentions.has("goal-1")).toBe(false);
  });

  test("three queued edits that all fail still restore the original label", () => {
    const first = beginLabelChange(EMPTY, "goal-1", "A", "B");
    const second = beginLabelChange(first.intentions, "goal-1", "A", "C");
    const third = beginLabelChange(second.intentions, "goal-1", "A", "D");

    const failedFirst = settleLabelChange(
      third.intentions,
      first.change,
      false,
    );
    const failedSecond = settleLabelChange(
      failedFirst.intentions,
      second.change,
      false,
    );
    const failedThird = settleLabelChange(
      failedSecond.intentions,
      third.change,
      false,
    );

    expect(failedFirst.rollbackLabel).toBeUndefined();
    expect(failedSecond.rollbackLabel).toBeUndefined();
    expect(failedThird.rollbackLabel).toBe("A");
  });

  test("an older success followed by a newer failure rolls back to that success", () => {
    const first = beginLabelChange(EMPTY, "goal-1", "A", "B");
    const second = beginLabelChange(first.intentions, "goal-1", "A", "C");

    const succeededFirst = settleLabelChange(
      second.intentions,
      first.change,
      true,
    );
    const failedSecond = settleLabelChange(
      succeededFirst.intentions,
      second.change,
      false,
    );

    expect(succeededFirst.rollbackLabel).toBeUndefined();
    expect(getIntendedLabel(succeededFirst.intentions, "goal-1", "A")).toBe(
      "C",
    );
    expect(failedSecond.rollbackLabel).toBe("B");
  });

  test("an older failure does not overwrite a newer pending intent", () => {
    const first = beginLabelChange(EMPTY, "goal-1", "A", "B");
    const second = beginLabelChange(first.intentions, "goal-1", "A", "C");

    const failedFirst = settleLabelChange(
      second.intentions,
      first.change,
      false,
    );

    expect(failedFirst.rollbackLabel).toBeUndefined();
    expect(getIntendedLabel(failedFirst.intentions, "goal-1", "A")).toBe("C");
  });

  test("an older success does not overwrite a newer pending intent", () => {
    const first = beginLabelChange(EMPTY, "goal-1", "A", "B");
    const second = beginLabelChange(first.intentions, "goal-1", "A", "C");

    const succeededFirst = settleLabelChange(
      second.intentions,
      first.change,
      true,
    );

    expect(getIntendedLabel(succeededFirst.intentions, "goal-1", "A")).toBe(
      "C",
    );
  });

  test("a settled success clears the intention so the saved label takes over", () => {
    const first = beginLabelChange(EMPTY, "goal-1", "A", "B");
    const settled = settleLabelChange(first.intentions, first.change, true);

    expect(settled.rollbackLabel).toBeUndefined();
    expect(settled.intentions.has("goal-1")).toBe(false);
    expect(getIntendedLabel(settled.intentions, "goal-1", "B")).toBe("B");
  });

  test("edits queued after a success roll back to that success", () => {
    const first = beginLabelChange(EMPTY, "goal-1", "A", "B");
    const afterSuccess = settleLabelChange(
      first.intentions,
      first.change,
      true,
    ).intentions;

    // The screen has since patched its saved label to "B".
    const second = beginLabelChange(afterSuccess, "goal-1", "B", "C");
    const third = beginLabelChange(second.intentions, "goal-1", "B", "D");

    expect(
      settleLabelChange(third.intentions, second.change, false).rollbackLabel,
    ).toBeUndefined();
    expect(
      settleLabelChange(third.intentions, third.change, false).rollbackLabel,
    ).toBe("B");
  });

  test("settling a change for a forgotten row is a no-op", () => {
    const started = beginLabelChange(EMPTY, "goal-1", "A", "B");
    const forgotten = forgetLabelIntention(started.intentions, "goal-1");
    const settled = settleLabelChange(forgotten, started.change, false);

    expect(forgotten.has("goal-1")).toBe(false);
    expect(settled.rollbackLabel).toBeUndefined();
    expect(settled.intentions.has("goal-1")).toBe(false);
  });

  test("forgetting one row leaves other rows pending", () => {
    const first = beginLabelChange(EMPTY, "goal-1", "A", "B");
    const second = beginLabelChange(first.intentions, "goal-2", "X", "Y");
    const forgotten = forgetLabelIntention(second.intentions, "goal-1");

    expect(getIntendedLabel(forgotten, "goal-1", "A")).toBe("A");
    expect(getIntendedLabel(forgotten, "goal-2", "X")).toBe("Y");
    expect(forgetLabelIntention(forgotten, "goal-1")).toBe(forgotten);
  });

  test("rows track revisions independently", () => {
    const first = beginLabelChange(EMPTY, "goal-1", "A", "B");
    const second = beginLabelChange(first.intentions, "goal-2", "X", "Y");
    const failedOther = settleLabelChange(
      second.intentions,
      second.change,
      false,
    );

    expect(failedOther.rollbackLabel).toBe("X");
    expect(getIntendedLabel(failedOther.intentions, "goal-1", "A")).toBe("B");
  });

  test("beginning a change never mutates the previous intentions", () => {
    const first = beginLabelChange(EMPTY, "goal-1", "A", "B");
    const second = beginLabelChange(first.intentions, "goal-1", "A", "C");

    expect(EMPTY.size).toBe(0);
    expect(getIntendedLabel(first.intentions, "goal-1", "A")).toBe("B");
    expect(getIntendedLabel(second.intentions, "goal-1", "A")).toBe("C");
  });
});
