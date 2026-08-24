import { Icon } from "@/components/icon";
import {
  BackBar,
  Card,
  Eyebrow,
  IconBadge,
  Screen,
  ScreenSub,
  ScreenTitle,
  Tag,
} from "@/components/ui";
import { isPreferredRail, rankRailsOptions } from "@/lib/rails";
import { getAppUser } from "@/lib/user";

export const dynamic = "force-dynamic";

export default async function RailsPage() {
  const user = await getAppUser();
  const motivators = user.motivators.split(", ").filter(Boolean);
  const options = rankRailsOptions(motivators);

  return (
    <Screen>
      <BackBar label="SOS" href="/sos" />
      <Eyebrow>Urgent support</Eyebrow>
      <ScreenTitle>Help! I&rsquo;m about to go off the rails</ScreenTitle>
      <ScreenSub>
        Choose what&rsquo;s most likely to help you right now. We&rsquo;ll get you back on track — no
        downward spirals.
      </ScreenSub>

      {options.map((option) => {
        const preferred = isPreferredRail(option.href, motivators);
        return (
          <Card key={option.href} href={option.href}>
            <div className="flex items-center gap-3">
              <IconBadge>
                <Icon name={option.icon} className="text-[18px]" />
              </IconBadge>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-[14.5px] font-bold">{option.title}</p>
                  {preferred && <Tag>For you</Tag>}
                </div>
                <p className="text-[12.5px] text-ink-70">{option.sub}</p>
              </div>
              <Icon name="chevron_right" className="text-ink-30" />
            </div>
          </Card>
        );
      })}
    </Screen>
  );
}
