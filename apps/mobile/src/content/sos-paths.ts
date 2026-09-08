import type { MaterialSymbolName } from "../../components/MaterialSymbol";
import type { SosPath } from "../data/sos";

export type SosPathCard = {
  body: string;
  icon: MaterialSymbolName;
  id: SosPath;
  route: "/(app)/sos/rails" | "/(app)/sos/planned";
  title: string;
};

export const SOS_PATHS: readonly SosPathCard[] = [
  {
    body: "Urgent, immediate support, something is happening right now",
    icon: "e911_emergency",
    id: "off_the_rails",
    route: "/(app)/sos/rails",
    title: "Help! I’m about to go off the rails",
  },
  {
    body: "A holiday, celebration, or moment you have coming up.",
    icon: "event_upcoming",
    id: "planned_event",
    route: "/(app)/sos/planned",
    title: "Assistance needed for a planned event",
  },
];

export const QUICK_REMINDER = {
  // The status region already reports that there are no goals yet, so this only
  // says where to add one.
  emptyMessage: "Add a goal from My goals on Home to see it here.",
  heading: "Quick reminder",
  icon: "reminder",
} as const satisfies {
  emptyMessage: string;
  heading: string;
  icon: MaterialSymbolName;
};
