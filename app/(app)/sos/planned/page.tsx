import { PlannedView } from "@/components/planned-view";
import { getAppUser } from "@/lib/user";

export const dynamic = "force-dynamic";

export default async function PlannedPage() {
  const user = await getAppUser();
  const lastPlanned = user.sosEvents.find((event) => event.path === "planned_event");
  return <PlannedView lastEvent={lastPlanned?.reinforcement ?? "Holiday meal"} />;
}
