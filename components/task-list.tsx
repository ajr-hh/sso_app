"use client";

import { useState } from "react";
import { addTask, deleteTask, toggleTask } from "@/app/actions";
import { Icon } from "@/components/icon";
import { useDemo } from "@/components/providers";
import { Button, Field } from "@/components/ui";
import { toastLines } from "@/lib/demo-data";

type Task = {
  id: string;
  label: string;
  done: boolean;
};

export function TaskList({ tasks }: { tasks: Task[] }) {
  const [items, setItems] = useState(tasks);
  const [draft, setDraft] = useState("");
  const { showToast, burstConfetti } = useDemo();

  async function onToggle(id: string, origin: DOMRect) {
    const current = items.find((task) => task.id === id);
    if (!current) return;

    const next = items.map((task) =>
      task.id === id ? { ...task, done: !task.done } : task,
    );
    setItems(next);

    if (!current.done) {
      const doneCount = next.filter((task) => task.done).length;
      showToast(
        doneCount === next.length
          ? "All done — that's a clean sweep!"
          : toastLines[Math.max(0, next.findIndex((task) => task.id === id)) % toastLines.length],
      );
      burstConfetti(origin);
    }

    await toggleTask(id);
  }

  return (
    <>
      {items.map((task) => (
        <div key={task.id} className="flex items-center gap-2">
          <button
            type="button"
            onClick={(event) => onToggle(task.id, event.currentTarget.getBoundingClientRect())}
            className="flex min-w-0 flex-1 items-center gap-2.5 py-2 text-left"
          >
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-[1.5px] transition-transform ${
                task.done ? "border-ember bg-ember text-white" : "border-ink-30"
              }`}
            >
              {task.done && <Icon name="check" className="text-[14px]" />}
            </span>
            <span className={`text-[13.5px] ${task.done ? "text-ink-70 line-through" : ""}`}>
              {task.label}
            </span>
          </button>
          <button
            type="button"
            className="text-ink-30"
            aria-label={`Remove ${task.label}`}
            onClick={async () => {
              setItems((prev) => prev.filter((item) => item.id !== task.id));
              await deleteTask(task.id);
            }}
          >
            <Icon name="close" className="text-[16px]" />
          </button>
        </div>
      ))}
      <div className="mt-2 flex gap-2">
        <Field value={draft} onChange={setDraft} placeholder="Add a daily task" />
        <Button
          size="sm"
          variant="ghost"
          onClick={async () => {
            const result = await addTask(draft);
            if (result.error || !result.task) {
              showToast(result.error ?? "Could not add that.");
              return;
            }
            setItems((prev) => [...prev, result.task]);
            setDraft("");
          }}
        >
          Add
        </Button>
      </div>
    </>
  );
}
