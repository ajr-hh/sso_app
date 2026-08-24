export const PLANNED_EVENTS = ["Holiday meal", "Celebration", "Travel", "Other"] as const;

export type PlannedEvent = (typeof PLANNED_EVENTS)[number];

export const plannedTipsByEvent: Record<PlannedEvent, { icon: string; text: string }[]> = {
  "Holiday meal": [
    { icon: "restaurant", text: "Eat a protein-forward snack before you arrive." },
    { icon: "local_bar", text: "Pick one drink you'll actually enjoy, and stop there." },
    { icon: "chat", text: "Tell one person there what you're working on." },
  ],
  Celebration: [
    { icon: "celebration", text: "Eat before the party so you're not starving on arrival." },
    { icon: "local_bar", text: "Decide your drink count now, not after the second toast." },
    { icon: "photo_camera", text: "Take the photo. Stay for the people. Leave before the leftovers." },
  ],
  Travel: [
    { icon: "flight", text: "Pack a protein snack you actually like for the airport." },
    { icon: "restaurant", text: "Look up one solid meal near the hotel tonight." },
    { icon: "water_drop", text: "Water first on the plane. Then decide about the rest." },
  ],
  Other: [
    { icon: "flag", text: "Name the hard part of this event in one sentence." },
    { icon: "schedule", text: "Set a leave time now, while you're still clear." },
    { icon: "chat", text: "Text one person what you're aiming for tonight." },
  ],
};
