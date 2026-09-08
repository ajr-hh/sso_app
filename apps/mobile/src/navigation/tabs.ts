export const TAB_SCREENS = [
  { name: "home", label: "Home", symbol: "home" },
  { name: "journal", label: "Activity", symbol: "edit_note" },
  { name: "community", label: "Community", symbol: "groups" },
  { name: "profile", label: "Profile", symbol: "person" },
] as const;

// SOS is a tab like any other, so switching to it swaps the tab instead of
// stacking a screen over the tabs and rebuilding them on the way back.
export const SOS_TAB_NAME = "sos" as const;
export const SOS_PATH = "/(app)/(tabs)/sos" as const;
