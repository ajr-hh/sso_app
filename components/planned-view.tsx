"use client";

import { useState } from "react";
import { TrackButton } from "@/components/track-button";
import {
  BackBar,
  Card,
  Eyebrow,
  ListItem,
  Pill,
  PillRow,
  Screen,
  ScreenSub,
  ScreenTitle,
} from "@/components/ui";
import { PLANNED_EVENTS, plannedTipsByEvent, type PlannedEvent } from "@/lib/planned";

export function PlannedView({ lastEvent }: { lastEvent: string }) {
  const initial = PLANNED_EVENTS.includes(lastEvent as PlannedEvent)
    ? (lastEvent as PlannedEvent)
    : "Holiday meal";
  const [event, setEvent] = useState<PlannedEvent>(initial);
  const tips = plannedTipsByEvent[event];

  return (
    <Screen>
      <BackBar label="SOS" href="/sos" />
      <Eyebrow>Planned event</Eyebrow>
      <ScreenTitle>Let&rsquo;s plan ahead</ScreenTitle>
      <ScreenSub>
        We have time here. We&rsquo;re not trying to stop this — just help you make a few smart calls.
      </ScreenSub>

      <Card>
        <h2 className="mb-2.5 text-[14.5px]">What&rsquo;s coming up?</h2>
        <PillRow>
          {PLANNED_EVENTS.map((item) => (
            <Pill key={item} active={event === item} onClick={() => setEvent(item)}>
              {item}
            </Pill>
          ))}
        </PillRow>
      </Card>

      <Card>
        <h2 className="mb-1.5 text-[14.5px]">Suggestions for this event</h2>
        {tips.map((tip) => (
          <ListItem key={tip.text} icon={tip.icon} tone="mute">
            {tip.text}
          </ListItem>
        ))}
      </Card>

      <TrackButton
        href="/followup"
        path="planned_event"
        reinforcement={event}
        toast="Check-in set. You've already done the hard part."
      >
        Set a check-in for tomorrow
      </TrackButton>
    </Screen>
  );
}
