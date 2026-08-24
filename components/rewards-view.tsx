"use client";

import { useState } from "react";
import { addReward, toggleReward } from "@/app/actions";
import { Icon } from "@/components/icon";
import { useDemo } from "@/components/providers";
import {
  BackBar,
  Button,
  Card,
  Eyebrow,
  Field,
  Footnote,
  IconBadge,
  Screen,
  ScreenSub,
  ScreenTitle,
  Tag,
} from "@/components/ui";

export type RewardItem = {
  id: string;
  milestone: string;
  rewardLabel: string;
  icon: string;
  statusLabel: string | null;
  earned: boolean;
};

export function RewardsView({ rewards }: { rewards: RewardItem[] }) {
  const { showToast, burstConfetti } = useDemo();
  const [items, setItems] = useState(rewards);
  const [milestone, setMilestone] = useState("");
  const [rewardLabel, setRewardLabel] = useState("");
  const [adding, setAdding] = useState(false);

  return (
    <Screen>
      <BackBar label="Small Wins" href="/sos/rails" />
      <Eyebrow>Rewards reinforcement</Eyebrow>
      <ScreenTitle>You&rsquo;re closer than you think</ScreenTitle>
      <ScreenSub>Milestones you set for yourself — tangible, meaningful, attainable.</ScreenSub>

      {items.map((reward) => (
        <Card key={reward.id}>
          <button
            type="button"
            className="w-full text-left"
            onClick={async (event) => {
              const next = await toggleReward(reward.id);
              if (!next) return;
              setItems((prev) =>
                prev.map((item) =>
                  item.id === reward.id
                    ? { ...item, earned: next.earned, statusLabel: next.statusLabel }
                    : item,
                ),
              );
              if (next.earned) {
                burstConfetti(event.currentTarget.getBoundingClientRect());
                showToast("Earned. Enjoy it.");
              }
            }}
          >
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[14.5px] font-bold">{reward.milestone}</p>
              <Tag>
                {reward.earned && <Icon name="check_circle" className="text-[13px]" />}
                {reward.statusLabel ?? (reward.earned ? "Earned" : "In progress")}
              </Tag>
            </div>
            <div className="flex items-center gap-2.5">
              <IconBadge tone="dark">
                <Icon name={reward.icon} className="text-[18px]" />
              </IconBadge>
              <p className="text-[13px] text-ink-70">{reward.rewardLabel}</p>
            </div>
          </button>
        </Card>
      ))}

      {adding ? (
        <Card>
          <div className="space-y-2">
            <Field value={milestone} onChange={setMilestone} placeholder="Milestone, e.g. Lose 15 pounds" />
            <Field value={rewardLabel} onChange={setRewardLabel} placeholder="The reward you'll give yourself" />
            <Button
              onClick={async () => {
                const result = await addReward(milestone, rewardLabel);
                if (result.error || !result.reward) {
                  showToast(result.error ?? "Could not add that.");
                  return;
                }
                setItems((prev) => [...prev, result.reward]);
                setMilestone("");
                setRewardLabel("");
                setAdding(false);
                showToast("Milestone saved.");
              }}
            >
              Save milestone
            </Button>
          </div>
        </Card>
      ) : (
        <Button variant="ghost" onClick={() => setAdding(true)}>
          <Icon name="add" className="text-[18px]" />
          Add a new milestone reward
        </Button>
      )}
      <Footnote>
        Rewards can stay private, or be shared with your accountability partners and challenge group.
      </Footnote>
    </Screen>
  );
}
