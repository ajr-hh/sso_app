import { shouldExplicitlyAnnounceError } from "./ErrorBanner";

describe("ErrorBanner announcements", () => {
  test("uses explicit announcements only on iOS", () => {
    expect(shouldExplicitlyAnnounceError("ios")).toBe(true);
    expect(shouldExplicitlyAnnounceError("android")).toBe(false);
    expect(shouldExplicitlyAnnounceError("web")).toBe(false);
  });
});
