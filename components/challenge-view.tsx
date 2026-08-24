"use client";

import { useState } from "react";
import { saveChallenge } from "@/app/actions";
import { useDemo } from "@/components/providers";
import {
  BackBar,
  Button,
  Card,
  Eyebrow,
  Field,
  ListItem,
  Screen,
  ScreenSub,
  ScreenTitle,
} from "@/components/ui";

export function ChallengeView({
  durationDays,
  buyIn,
  members,
  invited,
}: {
  durationDays: number;
  buyIn: number;
  members: number;
  invited: boolean;
}) {
  const { showToast } = useDemo();
  const [form, setForm] = useState({
    durationDays: String(durationDays),
    buyIn: String(buyIn),
    members: String(members),
  });
  const pool = Number(form.buyIn || 0) * Number(form.members || 0);

  return (
    <Screen>
      <BackBar label="Group challenge" href="/community" />
      <Eyebrow>Other tools</Eyebrow>
      <ScreenTitle>Create a group challenge</ScreenTitle>
      <ScreenSub>Pull together a group, set the rules, and stay accountable together.</ScreenSub>

      <Card>
        <h2 className="mb-2 text-sm">Challenge rules</h2>
        <ListItem icon="timer" tone="mute">
          {form.durationDays}-day duration
        </ListItem>
        <ListItem icon="scale" tone="mute">
          Log weight daily
        </ListItem>
        <ListItem icon="block" tone="mute">
          Miss 3 days in a row → eliminated
        </ListItem>
        <div className="mt-3 space-y-2">
          <Field
            value={form.durationDays}
            onChange={(durationDays) => setForm((prev) => ({ ...prev, durationDays }))}
            placeholder="Duration in days"
          />
          <Field
            value={form.buyIn}
            onChange={(buyIn) => setForm((prev) => ({ ...prev, buyIn }))}
            placeholder="Buy-in dollars"
          />
          <Field
            value={form.members}
            onChange={(members) => setForm((prev) => ({ ...prev, members }))}
            placeholder="People in the group"
          />
        </div>
      </Card>

      <Card>
        <h2 className="mb-2 text-sm">Prize pool</h2>
        <p className="mb-2.5 text-[13px] text-ink-70">
          Everyone contributes ${form.buyIn || 0} — winner takes the pool.
        </p>
        <p className="font-[family-name:var(--font-display)] text-[28px] leading-none font-extrabold text-ember-dark">
          ${Number.isFinite(pool) ? pool : 0}
        </p>
        <p className="text-xs text-ink-70">{form.members || 0} people in so far</p>
      </Card>

      <Button
        onClick={async () => {
          await saveChallenge({
            durationDays: Number(form.durationDays) || 30,
            buyIn: Number(form.buyIn) || 20,
            members: Number(form.members) || 1,
          });
          showToast(invited ? "Challenge updated." : "Challenge saved. Invites are ready.");
        }}
      >
        {invited ? "Save challenge" : "Invite friends"}
      </Button>
    </Screen>
  );
}
