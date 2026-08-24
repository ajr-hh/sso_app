import { RewardsView } from "@/components/rewards-view";
import { getAppUser } from "@/lib/user";

export const dynamic = "force-dynamic";

export default async function RewardsPage() {
  const user = await getAppUser();
  return (
    <RewardsView
      rewards={user.rewards.map((reward) => ({
        id: reward.id,
        milestone: reward.milestone,
        rewardLabel: reward.rewardLabel,
        icon: reward.icon,
        statusLabel: reward.statusLabel,
        earned: reward.earned,
      }))}
    />
  );
}
