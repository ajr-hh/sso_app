"use client";

import { useMemo, useState } from "react";
import { saveAlias } from "@/app/actions";
import { suggestAlias, type FlexLevel } from "@/lib/alias";
import { useDemo } from "@/components/providers";
import {
  BackBar,
  Button,
  Card,
  Eyebrow,
  Field,
  PhotoTile,
  Pill,
  PillRow,
  Screen,
  ScreenSub,
  ScreenTitle,
} from "@/components/ui";

const LEVELS: FlexLevel[] = ["A little better", "Mid", "Very healthy"];

type SavedAlias = { id: string; craving: string; level: string; swapTitle: string; swapSub: string };

export function AliasView({
  lastCraving,
  lastFlex,
  recent,
}: {
  lastCraving: string;
  lastFlex: string;
  recent: SavedAlias[];
}) {
  const { showToast } = useDemo();
  const [craving, setCraving] = useState(lastCraving || "Apple Pie");
  const [level, setLevel] = useState<FlexLevel>(
    LEVELS.includes(lastFlex as FlexLevel) ? (lastFlex as FlexLevel) : "Mid",
  );
  const swap = useMemo(() => suggestAlias(craving, level), [craving, level]);

  return (
    <Screen>
      <BackBar label="Food alias" href="/profile" />
      <Eyebrow>Other tools</Eyebrow>
      <ScreenTitle>Food alias</ScreenTitle>
      <ScreenSub>Enter a craving, get a swap that fits how far you want to flex.</ScreenSub>

      <Card>
        <p className="mb-1 text-[12.5px] text-ink-70">Your craving</p>
        <Field value={craving} onChange={setCraving} placeholder="Apple pie, ice cream…" />
      </Card>

      <p className="my-3.5 text-[12.5px] font-bold text-ink-70">How healthy should the swap be?</p>
      <PillRow>
        {LEVELS.map((item) => (
          <Pill key={item} active={level === item} onClick={() => setLevel(item)}>
            {item}
          </Pill>
        ))}
      </PillRow>

      <Card className="mt-3">
        <div className="flex items-center gap-3">
          <PhotoTile icon="nutrition" className="h-16 w-16 shrink-0" />
          <div>
            <p className="text-[14.5px] font-bold">{swap.title}</p>
            <p className="text-xs text-ink-70">{swap.sub}</p>
          </div>
        </div>
      </Card>
      <Button
        onClick={async () => {
          const result = await saveAlias(craving, level, swap.title, swap.sub);
          if (result.error) {
            showToast(result.error);
            return;
          }
          showToast("Saved this swap.");
        }}
      >
        Save this swap
      </Button>

      {recent.length > 0 && (
        <>
          <p className="mt-5 mb-2 text-[12.5px] font-bold text-ink-70">Recent swaps</p>
          {recent.map((alias) => (
            <Card key={alias.id}>
              <p className="text-[14.5px] font-bold">{alias.swapTitle}</p>
              <p className="text-xs text-ink-70">
                {alias.craving} · {alias.level}
              </p>
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}
