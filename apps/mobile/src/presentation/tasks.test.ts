import {
  beginTaskDoneChange,
  getTaskStatusMessage,
  settleTaskDoneChange,
  type TaskDoneIntentions,
} from "./tasks";

describe("task presentation", () => {
  test("describes successful mutations with the affected task text", () => {
    expect(getTaskStatusMessage("added", "Drink water")).toBe(
      "Task added: Drink water.",
    );
    expect(getTaskStatusMessage("updated", "Take a walk")).toBe(
      "Task updated: Take a walk.",
    );
    expect(getTaskStatusMessage("deleted", "Call Sam")).toBe(
      "Task deleted: Call Sam.",
    );
  });

  test("rapid toggles alternate from the latest synchronous intention", () => {
    const initial: TaskDoneIntentions = new Map();
    const first = beginTaskDoneChange(initial, "task-1", false);
    const second = beginTaskDoneChange(first.intentions, "task-1", false);

    expect(first.change.target).toBe(true);
    expect(second.change.target).toBe(false);
  });

  test("an older success updates confirmation without replacing newer intent", () => {
    const first = beginTaskDoneChange(new Map(), "task-1", false);
    const second = beginTaskDoneChange(first.intentions, "task-1", false);
    const settledFirst = settleTaskDoneChange(
      second.intentions,
      first.change,
      true,
    );

    expect(settledFirst.rollbackDone).toBeUndefined();
    expect(
      beginTaskDoneChange(settledFirst.intentions, "task-1", false).change
        .target,
    ).toBe(true);
  });

  test("the latest failure rolls back to the last confirmed value", () => {
    const first = beginTaskDoneChange(new Map(), "task-1", false);
    const second = beginTaskDoneChange(first.intentions, "task-1", false);
    const failedFirst = settleTaskDoneChange(
      second.intentions,
      first.change,
      false,
    );
    const failedSecond = settleTaskDoneChange(
      failedFirst.intentions,
      second.change,
      false,
    );

    expect(failedFirst.rollbackDone).toBeUndefined();
    expect(failedSecond.rollbackDone).toBe(false);
    expect(failedSecond.intentions.has("task-1")).toBe(false);
  });
});
