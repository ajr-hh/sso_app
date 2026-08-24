"use client";

import { useState } from "react";
import { saveCoachStyle } from "@/app/actions";
import { coachLibrary, type CoachStyle } from "@/lib/messages";
import { useDemo } from "@/components/providers";
import {
  BackBar,
  Button,
  Eyebrow,
  Footnote,
  QuoteCard,
  Screen,
  ScreenSub,
  ScreenTitle,
} from "@/components/ui";

const COACHES: { id: CoachStyle; tag: string }[] = [
  { id: "marcus", tag: "Coach Marcus — Direct & driven" },
  { id: "elena", tag: "Coach Elena — Steady & encouraging" },
];

export function MessagesView({ coachStyle }: { coachStyle: string }) {
  const { showToast } = useDemo();
  const [style, setStyle] = useState<CoachStyle>(coachStyle === "elena" ? "elena" : "marcus");
  const [index, setIndex] = useState({ marcus: 0, elena: 0 });

  return (
    <Screen>
      <BackBar label="Coach Messages" href="/sos/rails" />
      <Eyebrow>A message, when you need it</Eyebrow>
      <ScreenTitle>Pick your coach&rsquo;s style</ScreenTitle>
      <ScreenSub>Same encouragement, different voice. Set a default, or choose in the moment.</ScreenSub>

      {COACHES.map((coach) => {
        const quote = coachLibrary[coach.id][index[coach.id] % coachLibrary[coach.id].length];
        const active = style === coach.id;
        return (
          <div key={coach.id} className={active ? "" : "opacity-70"}>
            <QuoteCard tag={`${coach.tag}${active ? " · Default" : ""}`}>{quote}</QuoteCard>
            <div className="-mt-1.5 mb-3.5 flex gap-2">
              <Button
                size="sm"
                variant={active ? "primary" : "ghost"}
                onClick={async () => {
                  setStyle(coach.id);
                  await saveCoachStyle(coach.id);
                  showToast(`${coach.tag.split(" — ")[0]} is your default.`);
                }}
              >
                {active ? "Your default" : "Set as default"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  setIndex((prev) => ({ ...prev, [coach.id]: prev[coach.id] + 1 }))
                }
              >
                Another
              </Button>
            </div>
          </div>
        );
      })}

      <Footnote>
        Messages rotate from a growing library, matched to whichever coach style you set as your
        default.
      </Footnote>
    </Screen>
  );
}
