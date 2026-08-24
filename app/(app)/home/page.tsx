import Link from "next/link";
import { GoalList } from "@/components/goal-list";
import { HomeGreeting } from "@/components/home-greeting";
import { Icon } from "@/components/icon";
import { TaskList } from "@/components/task-list";
import { Card, Divider, Eyebrow, IconBadge, Screen, ScreenSub } from "@/components/ui";
import { getAppUser } from "@/lib/user";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getAppUser();

  return (
    <Screen>
      <div className="flex items-start justify-between">
        <div>
          <Eyebrow>Today</Eyebrow>
          <HomeGreeting name={user.name} />
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-ink py-1.5 pr-3 pl-2.5 text-[12.5px] font-extrabold text-white">
          <Icon name="local_fire_department" className="text-[16px] text-[#FFB65C]" />
          {user.streak}-day streak
        </span>
      </div>
      <ScreenSub>Here&rsquo;s what matters today. Tap the SOS button any time you need backup.</ScreenSub>

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-base">My daily tasks</h2>
          <Link href="/profile" className="flex items-center gap-0.5 text-[11px] font-bold text-ink-70">
            <Icon name="edit" className="text-[14px]" />
            Profile
          </Link>
        </div>
        <Divider className="my-2.5" />
        <TaskList tasks={user.dailyTasks} />
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-base">My goals</h2>
          <Link href="/profile" className="flex items-center gap-0.5 text-[11px] font-bold text-ink-70">
            <Icon name="edit" className="text-[14px]" />
            Profile
          </Link>
        </div>
        <Divider className="my-2.5" />
        <GoalList goals={user.goals.map((goal) => ({ id: goal.id, label: goal.label }))} />
      </Card>

      <Link href="/sos" className="mb-3 block rounded-2xl bg-ink p-4 text-white shadow-card transition-transform active:scale-[0.97]">
        <div className="flex items-center gap-3">
          <IconBadge tone="ember-solid">
            <Icon name="emergency" className="text-[18px]" />
          </IconBadge>
          <div>
            <p className="text-[14.5px] font-bold">Feeling shaky, or something coming up?</p>
            <p className="text-[12.5px] text-[#C7CBCC]">Tap the SOS button below — day or night.</p>
          </div>
        </div>
      </Link>
    </Screen>
  );
}
