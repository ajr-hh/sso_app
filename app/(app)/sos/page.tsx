import { SosPathCard } from "@/components/sos-path-card";
import { Icon } from "@/components/icon";
import { Card, Divider, IconBadge, Screen, ScreenSub, ScreenTitle } from "@/components/ui";
import { getAppUser } from "@/lib/user";

export const dynamic = "force-dynamic";

export default async function SosPage() {
  const user = await getAppUser();
  const currentGoal = user.goals[0]?.label ?? "Stay on track today";

  return (
    <Screen>
      <div className="pt-1.5 text-center">
        <IconBadge className="mx-auto mb-3.5 h-16 w-16 rounded-[20px]">
          <Icon name="emergency" className="text-[32px]" />
        </IconBadge>
        <ScreenTitle>Push in case of emergency</ScreenTitle>
        <ScreenSub>Two ways to use SOS — pick what&rsquo;s true right now.</ScreenSub>
      </div>

      <SosPathCard href="/sos/rails" path="off_the_rails" className="border-[1.5px] border-ember">
        <div className="flex items-start gap-3">
          <IconBadge tone="ember-solid">
            <Icon name="bolt" className="text-[18px]" />
          </IconBadge>
          <div>
            <p className="text-[15px] font-bold">Help! I&rsquo;m about to go off the rails</p>
            <ScreenSub className="mb-0 mt-0.5">
              Urgent, immediate support — something&rsquo;s happening right now.
            </ScreenSub>
          </div>
        </div>
      </SosPathCard>

      <SosPathCard href="/sos/planned" path="planned_event">
        <div className="flex items-start gap-3">
          <IconBadge tone="mute">
            <Icon name="event" className="text-[18px]" />
          </IconBadge>
          <div>
            <p className="text-[15px] font-bold">Assistance needed for a planned event</p>
            <ScreenSub className="mb-0 mt-0.5">
              A holiday, celebration, or moment you can see coming.
            </ScreenSub>
          </div>
        </div>
      </SosPathCard>

      <Divider />
      <h2 className="mb-2 text-sm">Quick reminder</h2>
      <Card>
        <p className="mb-1.5 text-[13px] text-ink-70">Your goal right now:</p>
        <p className="text-[14.5px] font-bold">{currentGoal}</p>
      </Card>
    </Screen>
  );
}
