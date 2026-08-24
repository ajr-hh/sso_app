"use client";

import { useState } from "react";
import { addGoal, deleteGoal } from "@/app/actions";
import { Icon } from "@/components/icon";
import { useDemo } from "@/components/providers";
import { Button, Field, IconBadge } from "@/components/ui";

type Goal = { id: string; label: string };

export function GoalList({ goals }: { goals: Goal[] }) {
  const { showToast } = useDemo();
  const [items, setItems] = useState(goals);
  const [draft, setDraft] = useState("");

  return (
    <>
      {items.map((goal) => (
        <div key={goal.id} className="flex items-center gap-3 border-b border-[#E7E7E5] py-3 last:border-b-0">
          <IconBadge>
            <Icon name="flag" className="text-[18px]" />
          </IconBadge>
          <span className="flex-1 text-[13.5px]">{goal.label}</span>
          <button
            type="button"
            className="text-ink-30"
            aria-label={`Remove ${goal.label}`}
            onClick={async () => {
              setItems((prev) => prev.filter((item) => item.id !== goal.id));
              await deleteGoal(goal.id);
            }}
          >
            <Icon name="close" className="text-[16px]" />
          </button>
        </div>
      ))}
      <div className="mt-3 flex gap-2">
        <Field value={draft} onChange={setDraft} placeholder="Add a goal" />
        <Button
          size="sm"
          variant="ghost"
          onClick={async () => {
            const result = await addGoal(draft);
            if (result.error || !result.goal) {
              showToast(result.error ?? "Could not add that.");
              return;
            }
            setItems((prev) => [...prev, result.goal]);
            setDraft("");
          }}
        >
          Add
        </Button>
      </div>
    </>
  );
}
