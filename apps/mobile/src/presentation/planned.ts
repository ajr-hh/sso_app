export const UPCOMING_EVENTS = [
  "Holiday meal",
  "Celebration",
  "Travel",
  "Other",
] as const;

export type UpcomingEvent = (typeof UPCOMING_EVENTS)[number];

export const PLANNED_EVENT_KINDS = [
  "holiday_meal",
  "celebration",
  "travel",
  "other",
] as const;

export type PlannedEventKind = (typeof PLANNED_EVENT_KINDS)[number];

export const SUGGESTION_ICONS = ["restaurant", "local_bar", "chat"] as const;

export type PlannedSuggestionIcon = (typeof SUGGESTION_ICONS)[number];

export type PlannedSuggestion = {
  icon: PlannedSuggestionIcon;
  text: string;
};

export const CHECK_IN_LABEL = "Set a check in for tomorrow.";
export const CHECK_IN_SAVING_LABEL = "Setting your check in…";
export const CHECK_IN_DONE = "Check in set for tomorrow";

export const PLAN_AHEAD_COPY = {
  save: "Save",
  saving: "Saving…",
  generating: "Getting suggestions…",
  suggestions: "Suggestions",
  loadMore: "Load more suggestions",
  otherLabel: "What's coming up?",
  otherPlaceholder: "Office dinner, a wedding, a work trip",
} as const;

export function getRemoveEventLabel(label: string): string {
  return `Remove ${label}`;
}

export const MAX_OTHER_LABEL = 80;
export const MAX_SUGGESTION_TEXT = 160;

export const HOLIDAY_MEAL_SUGGESTIONS: readonly PlannedSuggestion[] = [
  {
    icon: "restaurant",
    text: "Eat a protein and vegetable plate first, then decide if you still want extras.",
  },
  {
    icon: "local_bar",
    text: "Drink water between any alcohol, and stop after one.",
  },
  {
    icon: "chat",
    text: "Tell one person your food plan so they can help you stay with it.",
  },
];

const FALLBACK_SUGGESTIONS: Record<
  UpcomingEvent,
  readonly PlannedSuggestion[]
> = {
  "Holiday meal": HOLIDAY_MEAL_SUGGESTIONS,
  Celebration: [
    {
      icon: "restaurant",
      text: "Eat a high-protein meal before you go so you are not starving.",
    },
    {
      icon: "local_bar",
      text: "Choose water or a lower-sugar drink, and keep it to one.",
    },
    {
      icon: "chat",
      text: "Tell one person your food plan so they can help you stay with it.",
    },
  ],
  Travel: [
    {
      icon: "restaurant",
      text: "Pack a protein snack and skip the pastry line.",
    },
    {
      icon: "local_bar",
      text: "Choose water or seltzer first, and keep alcohol to one.",
    },
    {
      icon: "chat",
      text: "Text one person your food plan before you leave.",
    },
  ],
  Other: HOLIDAY_MEAL_SUGGESTIONS,
};

export function customEventPills(
  plans: readonly { event_kind: string; custom_label: string | null }[],
): string[] {
  const seen = new Set<string>();
  const labels: string[] = [];
  for (const plan of plans) {
    if (plan.event_kind !== "other") continue;
    const label = plan.custom_label?.trim() ?? "";
    if (label.length === 0) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    labels.push(label);
  }
  return labels;
}

export function upcomingEventChips(customLabels: readonly string[]): string[] {
  return [
    "Holiday meal",
    "Celebration",
    "Travel",
    ...customLabels,
    "Other",
  ];
}

const KIND_BY_LABEL: Record<UpcomingEvent, PlannedEventKind> = {
  "Holiday meal": "holiday_meal",
  Celebration: "celebration",
  Travel: "travel",
  Other: "other",
};

const LABEL_BY_KIND: Record<PlannedEventKind, UpcomingEvent> = {
  holiday_meal: "Holiday meal",
  celebration: "Celebration",
  travel: "Travel",
  other: "Other",
};

export function eventKindFromLabel(event: UpcomingEvent): PlannedEventKind {
  return KIND_BY_LABEL[event];
}

export function eventLabelFromKind(kind: PlannedEventKind): UpcomingEvent {
  return LABEL_BY_KIND[kind];
}

export function isPlannedEventKind(value: unknown): value is PlannedEventKind {
  return (
    typeof value === "string" &&
    (PLANNED_EVENT_KINDS as readonly string[]).includes(value)
  );
}

export function canSaveOtherEvent(label: string): boolean {
  const trimmed = label.trim();
  return trimmed.length > 0 && trimmed.length <= MAX_OTHER_LABEL;
}

export function fallbackSuggestionsFor(
  event: UpcomingEvent,
  customLabel = "",
): PlannedSuggestion[] {
  if (event === "Other") {
    const name = customLabel.trim();
    if (name.length > 0) {
      return [
        {
          icon: "restaurant",
          text: `Eat a protein and vegetable meal before ${name}.`,
        },
        {
          icon: "local_bar",
          text: `Drink water at ${name}, and stop after one alcoholic drink.`,
        },
        {
          icon: "chat",
          text: `Tell one person your food plan for ${name}.`,
        },
      ];
    }
  }
  return [...FALLBACK_SUGGESTIONS[event]];
}

export function getSuggestionsHeading(
  event: UpcomingEvent,
  customLabel = "",
): string {
  if (event === "Other") {
    const typed = customLabel.trim();
    return typed.length > 0
      ? `Suggestions for ${typed}`
      : "Suggestions for this event";
  }
  return `Suggestions for ${event}`;
}

// The task shows up in tomorrow's list on its own, so its label names the plan
// it belongs to rather than repeating that it is a check-in for tomorrow.
export function getCheckInTaskLabel(
  event: UpcomingEvent | null,
  customLabel = "",
): string {
  if (event === null) {
    return "Check in on your plan";
  }
  if (event === "Other") {
    const typed = customLabel.trim();
    return typed.length > 0
      ? `Check in on your ${typed.toLowerCase()} plan`
      : "Check in on your plan";
  }
  return `Check in on your ${event.toLowerCase()} plan`;
}

function isSuggestionIcon(value: unknown): value is PlannedSuggestionIcon {
  return (
    typeof value === "string" &&
    (SUGGESTION_ICONS as readonly string[]).includes(value)
  );
}

function humanizeSuggestionText(raw: string): string {
  return raw
    .replace(/\u2014/g, ",")
    .replace(/\u2013/g, ",")
    .replace(/\s*—\s*/g, ", ")
    .replace(/\s*–\s*/g, ", ")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+,/g, ",")
    .replace(/\.,/g, ",")
    .trim();
}

function readSuggestion(raw: unknown): PlannedSuggestion | null {
  if (typeof raw !== "object" || raw === null) {
    return null;
  }
  const { icon, text } = raw as { icon?: unknown; text?: unknown };
  if (!isSuggestionIcon(icon) || typeof text !== "string") {
    return null;
  }
  const cleaned = humanizeSuggestionText(text);
  if (cleaned.length === 0 || cleaned.length > MAX_SUGGESTION_TEXT) {
    return null;
  }
  return { icon, text: cleaned };
}

export function parsePlannedSuggestions(
  payload: unknown,
): PlannedSuggestion[] | null {
  const raw = Array.isArray(payload)
    ? payload
    : typeof payload === "object" && payload !== null
      ? (payload as { suggestions?: unknown }).suggestions
      : null;
  if (!Array.isArray(raw) || raw.length !== SUGGESTION_ICONS.length) {
    return null;
  }

  const suggestions: PlannedSuggestion[] = [];
  const seenText = new Set<string>();
  for (const entry of raw) {
    const suggestion = readSuggestion(entry);
    if (
      !suggestion ||
      suggestion.icon !== SUGGESTION_ICONS[suggestions.length]
    ) {
      return null;
    }
    const key = suggestion.text.toLowerCase();
    if (seenText.has(key)) {
      return null;
    }
    seenText.add(key);
    suggestions.push(suggestion);
  }

  if (suggestions.length !== SUGGESTION_ICONS.length) {
    return null;
  }
  return suggestions;
}
