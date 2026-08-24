import { ChallengeView } from "@/components/challenge-view";
import { getAppUser } from "@/lib/user";

export const dynamic = "force-dynamic";

export default async function ChallengePage() {
  const user = await getAppUser();
  const challenge = user.challenges[0];
  return (
    <ChallengeView
      durationDays={challenge?.durationDays ?? 30}
      buyIn={challenge?.buyIn ?? 20}
      members={challenge?.members ?? 1}
      invited={challenge?.invited ?? false}
    />
  );
}
