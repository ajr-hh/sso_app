import { FollowupView } from "@/components/followup-view";
import { getAppUser } from "@/lib/user";

export const dynamic = "force-dynamic";

export default async function FollowupPage() {
  const user = await getAppUser();
  const last = user.sosEvents[0];

  return (
    <FollowupView
      goal={user.goals[0]?.label ?? "Stay on track today"}
      lastPath={last?.path ?? null}
      lastReinforcement={last?.reinforcement ?? null}
      lastWhen={last ? timeAgo(last.createdAt) : null}
      streak={user.streak}
    />
  );
}

function timeAgo(date: Date) {
  const minutes = Math.round((Date.now() - date.getTime()) / 60000);
  if (minutes < 2) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}
