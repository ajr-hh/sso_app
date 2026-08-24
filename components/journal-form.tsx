"use client";

import { useState } from "react";
import { addJournalEntry } from "@/app/actions";
import { Icon } from "@/components/icon";
import { useDemo } from "@/components/providers";
import {
  Button,
  Card,
  Divider,
  IconBadge,
  Pill,
  PillRow,
} from "@/components/ui";

export type Mood = "good" | "tough" | "mixed";

type Entry = {
  id: string;
  mood: string;
  text: string;
};

const MOODS: { id: Mood; label: string }[] = [
  { id: "good", label: "Good day" },
  { id: "tough", label: "Tough day" },
  { id: "mixed", label: "Mixed" },
];

const MOOD_ICON: Record<string, string> = {
  good: "sentiment_satisfied",
  tough: "sentiment_dissatisfied",
  mixed: "sentiment_neutral",
};

export function JournalForm({ entries }: { entries: Entry[] }) {
  const { showToast } = useDemo();
  const [mood, setMood] = useState<Mood>("good");
  const [text, setText] = useState("");
  const [list, setList] = useState(entries);
  const [saving, setSaving] = useState(false);

  async function onSave() {
    if (!text.trim() || saving) return;
    setSaving(true);
    const created = await addJournalEntry(mood, text);
    setList((prev) => [created, ...prev]);
    setText("");
    showToast("Entry saved. That's the streak talking.");
    setSaving(false);
  }

  return (
    <>
      <Card>
        <PillRow>
          {MOODS.map((item) => (
            <Pill key={item.id} active={mood === item.id} onClick={() => setMood(item.id)}>
              {item.label}
            </Pill>
          ))}
        </PillRow>
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Type how the day went, how you're feeling, or what you're proud of…"
          className="mt-3 min-h-16 w-full resize-none rounded-xl bg-canvas p-3.5 text-[13px] text-ink outline-none placeholder:text-ink-70"
        />
      </Card>
      <Button onClick={onSave}>{saving ? "Saving…" : "Save entry"}</Button>

      <Divider />
      <h2 className="mb-2 text-sm">Past entries</h2>
      {list.map((entry) => (
        <Card key={entry.id}>
          <div className="flex items-start gap-2.5">
            <IconBadge>
              <Icon name={MOOD_ICON[entry.mood] ?? "sentiment_satisfied"} className="text-[18px]" />
            </IconBadge>
            <p className="text-[13px] leading-normal text-ink-70">&ldquo;{entry.text}&rdquo;</p>
          </div>
        </Card>
      ))}
    </>
  );
}
