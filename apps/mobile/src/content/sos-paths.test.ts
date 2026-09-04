import { QUICK_REMINDER, SOS_PATHS } from "./sos-paths";

describe("SOS path content", () => {
  test("offers exactly two paths", () => {
    expect(SOS_PATHS.length).toBe(2);
  });

  test("the crisis path keeps its emergency icon and exact copy", () => {
    expect(SOS_PATHS[0]).toEqual({
      body: "Urgent, immediate support, something is happening right now",
      icon: "e911_emergency",
      id: "off_the_rails",
      route: "/(app)/sos/rails",
      title: "Help! I’m about to go off the rails",
    });
  });

  test("the planned path keeps its upcoming event icon and exact copy", () => {
    expect(SOS_PATHS[1]).toEqual({
      body: "A holiday, celebration, or moment you have coming up.",
      icon: "event_upcoming",
      id: "planned_event",
      route: "/(app)/sos/planned",
      title: "Assistance needed for a planned event",
    });
  });
});

describe("quick reminder content", () => {
  test("uses the reminder icon and heading", () => {
    expect(QUICK_REMINDER.heading).toBe("Quick reminder");
    expect(QUICK_REMINDER.icon).toBe("reminder");
  });

  test("has an empty message that points somewhere useful", () => {
    expect(QUICK_REMINDER.emptyMessage.length).toBeGreaterThan(0);
  });
});
