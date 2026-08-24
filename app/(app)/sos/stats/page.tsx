import {
  BackBar,
  Card,
  Eyebrow,
  Footnote,
  Screen,
  ScreenSub,
  ScreenTitle,
} from "@/components/ui";
import { stats } from "@/lib/demo-data";
import { getAppUser } from "@/lib/user";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const user = await getAppUser();
  const goal = user.goals[0]?.label;

  return (
    <Screen>
      <BackBar label="The Numbers" href="/sos/rails" />
      <Eyebrow>Statistical reinforcement</Eyebrow>
      <ScreenTitle>What the research says</ScreenTitle>
      <ScreenSub>Plain facts about metabolic health — no spin, just what&rsquo;s true.</ScreenSub>

      <Card className="border-0 bg-ember-tint shadow-none">
        <p className="font-[family-name:var(--font-display)] text-[40px] leading-none font-extrabold text-ember-dark">
          {user.streak}
        </p>
        <p className="mt-1 text-[13.5px] font-bold">Days in a row</p>
        <p className="mt-0.5 text-[12.5px] text-ink-70">
          {goal ? `Your current aim: ${goal}.` : "Keep stacking days. The research is on your side."}
        </p>
      </Card>

      {stats.map((stat) => (
        <Card key={stat.title}>
          <p className="font-[family-name:var(--font-display)] text-[40px] leading-none font-extrabold text-ember-dark">
            {stat.num}
          </p>
          <p className="mt-1 text-[13.5px] font-bold">{stat.title}</p>
          <p className="mt-0.5 text-[12.5px] text-ink-70">{stat.body}</p>
        </Card>
      ))}
      <Footnote>
        You can curate your own stat list, or let SOS rotate from the research library — up to 20 at
        a time.
      </Footnote>
    </Screen>
  );
}
