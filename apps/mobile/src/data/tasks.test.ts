import { taskDayKey } from "./tasks";

describe("task day keys", () => {
  test("uses the local calendar day late in the evening", () => {
    expect(taskDayKey(new Date(2026, 8, 3, 23, 30))).toBe("2026-09-03");
  });
});
