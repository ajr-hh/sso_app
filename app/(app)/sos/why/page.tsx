import { TrackButton } from "@/components/track-button";
import { WhyPhotos } from "@/components/why-photos";
import {
  BackBar,
  Card,
  Divider,
  Eyebrow,
  ListItem,
  Screen,
  ScreenSub,
  ScreenTitle,
} from "@/components/ui";
import { withSignedUrls } from "@/lib/photos";
import { getAppUser } from "@/lib/user";

export const dynamic = "force-dynamic";

export default async function WhyPage() {
  const user = await getAppUser();
  const topReason =
    user.whyMatters ||
    user.goals[user.goals.length - 1]?.label ||
    user.goals[0]?.label ||
    "Stay on track";
  const photos = await withSignedUrls(
    user.photos.filter((photo) => photo.mode === "remember_why"),
  );

  return (
    <Screen>
      <BackBar label="Remember Your Why" href="/sos/rails" />
      <Eyebrow>Remember your why</Eyebrow>
      <ScreenTitle>You know what it takes</ScreenTitle>
      <ScreenSub>You&rsquo;ve done hard things before. Here&rsquo;s what you&rsquo;re working toward, and why.</ScreenSub>

      <Card className="border-0 bg-ember-tint shadow-none">
        <p className="mb-1.5 text-[13px] font-bold text-ember-dark">Your top reason</p>
        <p className="text-base font-bold">&ldquo;{topReason}&rdquo;</p>
      </Card>

      {user.goals.length > 0 && (
        <>
          <h2 className="mb-2 mt-4 text-sm">What you&rsquo;re working toward</h2>
          <Card>
            {user.goals.map((goal) => (
              <ListItem key={goal.id} icon="flag">
                {goal.label}
              </ListItem>
            ))}
          </Card>
        </>
      )}

      <h2 className="mb-2 mt-4 text-sm">Photos that motivate you</h2>
      <WhyPhotos photos={photos} />

      <Divider />
      <h2 className="mb-2 text-sm">Why you&rsquo;ve struggled before</h2>
      <Card>
        {user.pastAttempts.map((attempt) => (
          <ListItem key={attempt.id} icon="info" tone="mute">
            <span className="text-[13px]">{attempt.label}</span>
          </ListItem>
        ))}
      </Card>

      <TrackButton
        href="/followup"
        path="off_the_rails"
        reinforcement="remember_why"
        toast="Nice work getting back on track."
      >
        I&rsquo;m okay — back on track
      </TrackButton>
    </Screen>
  );
}
