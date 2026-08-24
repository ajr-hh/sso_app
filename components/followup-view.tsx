"use client";

import { useState } from "react";
import { confirmStayOnTrack } from "@/app/actions";
import { useDemo } from "@/components/providers";
import {
  Button,
  Card,
  Eyebrow,
  ListItem,
  Screen,
  ScreenSub,
  ScreenTitle,
} from "@/components/ui";

export function FollowupView({
  goal,
  lastPath,
  lastReinforcement,
  lastWhen,
  streak,
}: {
  goal: string;
  lastPath: string | null;
  lastReinforcement: string | null;
  lastWhen: string | null;
  streak: number;
}) {
  const { showToast, burstConfetti } = useDemo();
  const [days, setDays] = useState(streak);
  const [confirmed, setConfirmed] = useState(false);

  const headline =
    lastPath === "planned_event"
      ? "You planned ahead"
      : lastPath
        ? "You reached out when it counted"
        : "Checking in";

  const detail =
    lastPath === "planned_event" && lastReinforcement
      ? `Your ${lastReinforcement.toLowerCase()} check-in${lastWhen ? ` · ${lastWhen}` : ""}`
      : lastReinforcement
        ? `You used ${labelForReinforcement(lastReinforcement)}${lastWhen ? ` · ${lastWhen}` : ""}`
        : lastWhen
          ? `Last SOS ${lastWhen}`
          : "One day since you reached out. Here's what matters right now.";

  return (
    <Screen>
      <Eyebrow>24 hours later</Eyebrow>
      <ScreenTitle>{headline}</ScreenTitle>
      <ScreenSub>{detail}</ScreenSub>

      <Card>
        <ListItem icon="flag">Reminder: {goal}</ListItem>
        <ListItem icon="monitoring">
          One off day rarely undoes weeks of progress — but a string of them can.
        </ListItem>
        <ListItem icon="nutrition">Tip: lean on protein today to steady things out.</ListItem>
        <ListItem icon="restaurant">Tonight&rsquo;s recipe: sheet-pan salmon &amp; greens</ListItem>
      </Card>

      <Card className="bg-ember-tint">
        <p className="text-sm font-bold">
          {confirmed ? `Streak is now ${days} days.` : "You showed up when it mattered."}
        </p>
        <p className="mt-0.5 text-[12.5px] text-ink-70">
          {confirmed
            ? "That's the actual skill. Keep stacking days."
            : "That's the actual skill. Let's keep the streak going."}
        </p>
      </Card>

      {!confirmed && (
        <Button
          onClick={async (event) => {
            const result = await confirmStayOnTrack();
            setDays(result.streak);
            setConfirmed(true);
            burstConfetti(event.currentTarget.getBoundingClientRect());
            showToast(`${result.streak}-day streak. Keep going.`);
          }}
        >
          I stayed on track
        </Button>
      )}
      <Button href="/home" variant={confirmed ? "primary" : "ghost"} className={confirmed ? "" : "mt-2"}>
        Back to today
      </Button>
    </Screen>
  );
}

function labelForReinforcement(value: string) {
  const labels: Record<string, string> = {
    remember_why: "Remember Your Why",
    hard_truths: "Hard Truths",
    check_in: "a planned check-in",
    live_call: "a live call",
    messages: "a coach message",
  };
  return labels[value] ?? value;
}
