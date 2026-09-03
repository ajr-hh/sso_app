import { colors } from "../theme/colors";
import { SOS_PATH, TAB_SCREENS } from "./tabs";

describe("app navigation", () => {
  test("defines the four authenticated tabs in display order", () => {
    expect(TAB_SCREENS).toEqual([
      { name: "home", label: "Home", symbol: "⌂" },
      { name: "journal", label: "Activity", symbol: "≡" },
      { name: "community", label: "Community", symbol: "●" },
      { name: "profile", label: "Profile", symbol: "○" },
    ]);
  });

  test("uses the app SOS route and Ember brand color", () => {
    expect(SOS_PATH).toBe("/(app)/sos");
    expect(colors.ember).toBe("#FF7348");
  });
});
