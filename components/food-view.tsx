"use client";

import { useState } from "react";
import { addKryptonite, addKryptoniteSwap } from "@/app/actions";
import { useDemo } from "@/components/providers";
import {
  BackBar,
  Button,
  Card,
  Divider,
  Eyebrow,
  Field,
  Footnote,
  ListItem,
  Pill,
  PillRow,
  Screen,
  ScreenSub,
  ScreenTitle,
} from "@/components/ui";

type Food = {
  id: string;
  label: string;
  swaps: { id: string; label: string }[];
};

export function FoodView({ foods }: { foods: Food[] }) {
  const { showToast } = useDemo();
  const [items, setItems] = useState(foods);
  const [selected, setSelected] = useState(foods[0]?.id ?? "");
  const [newFood, setNewFood] = useState("");
  const [newSwap, setNewSwap] = useState("");
  const current = items.find((item) => item.id === selected) ?? items[0];

  return (
    <Screen>
      <BackBar label="Better Choices" href="/sos/rails" />
      <Eyebrow>Food alternatives</Eyebrow>
      <ScreenTitle>Your top food kryptonite</ScreenTitle>
      <ScreenSub>Tap one to see better options — built for the craving, not against it.</ScreenSub>

      <PillRow>
        {items.map((item) => (
          <Pill key={item.id} active={current?.id === item.id} onClick={() => setSelected(item.id)}>
            {item.label}
          </Pill>
        ))}
      </PillRow>

      {current && (
        <Card className="mt-3">
          <p className="mb-0.5 text-[13px] text-ink-70">Instead of {current.label}, try:</p>
          <Divider className="my-2" />
          {current.swaps.map((swap) => (
            <ListItem key={swap.id} icon="nutrition">
              {swap.label}
            </ListItem>
          ))}
          <div className="mt-3 flex gap-2">
            <Field value={newSwap} onChange={setNewSwap} placeholder="Add a swap" />
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                const result = await addKryptoniteSwap(current.id, newSwap);
                if (result.error || !result.swap) {
                  showToast(result.error ?? "Could not add that.");
                  return;
                }
                setItems((prev) =>
                  prev.map((item) =>
                    item.id === current.id ? { ...item, swaps: [...item.swaps, result.swap] } : item,
                  ),
                );
                setNewSwap("");
              }}
            >
              Add
            </Button>
          </div>
        </Card>
      )}

      <div className="mt-3 flex gap-2">
        <Field value={newFood} onChange={setNewFood} placeholder="Add a kryptonite food" />
        <Button
          size="sm"
          onClick={async () => {
            const result = await addKryptonite(newFood);
            if (result.error || !result.food) {
              showToast(result.error ?? "Could not add that.");
              return;
            }
            setItems((prev) => [...prev, result.food]);
            setSelected(result.food.id);
            setNewFood("");
            showToast("Added to your list.");
          }}
        >
          Add
        </Button>
      </div>
      <Footnote>
        Suggestions start from your nutritionist-reviewed library. Add your own as cravings shift.
      </Footnote>
    </Screen>
  );
}
