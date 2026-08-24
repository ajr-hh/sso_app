"use client";

import { useState } from "react";
import { addContact, saveProfile } from "@/app/actions";
import { Icon } from "@/components/icon";
import { useDemo } from "@/components/providers";
import {
  Button,
  Card,
  Eyebrow,
  Field,
  IconBadge,
  Pill,
  PillRow,
  Screen,
  ScreenSub,
  ScreenTitle,
} from "@/components/ui";

const MOTIVATORS = ["Remember why", "The numbers", "Rewards", "A live call"];

type Contact = { id: string; name: string; contactInfo: string; initials: string };

export function ProfileForm({
  name,
  age,
  contactInfo,
  whyMatters,
  motivators,
  goals,
  pastAttempts,
  contacts,
}: {
  name: string;
  age: string;
  contactInfo: string;
  whyMatters: string;
  motivators: string[];
  goals: string[];
  pastAttempts: string[];
  contacts: Contact[];
}) {
  const { showToast } = useDemo();
  const [form, setForm] = useState({ name, age, contactInfo, whyMatters });
  const [picks, setPicks] = useState(motivators);
  const [goalList, setGoalList] = useState(goals);
  const [attemptList, setAttemptList] = useState(pastAttempts);
  const [people, setPeople] = useState(contacts);
  const [newGoal, setNewGoal] = useState("");
  const [newAttempt, setNewAttempt] = useState("");
  const [newPerson, setNewPerson] = useState({ name: "", contactInfo: "" });
  const [saving, setSaving] = useState(false);

  async function onSave() {
    setSaving(true);
    await saveProfile({
      ...form,
      motivators: picks,
      goals: goalList,
      pastAttempts: attemptList,
    });
    setSaving(false);
    showToast("Profile saved. SOS will use this.");
  }

  return (
    <Screen>
      <Eyebrow>Your account</Eyebrow>
      <ScreenTitle>Set up your account</ScreenTitle>
      <ScreenSub>This is what SOS uses to personalize every intervention.</ScreenSub>

      <Card>
        <h2 className="mb-2.5 text-[15px]">About you</h2>
        <div className="space-y-2">
          <Field value={form.name} onChange={(name) => setForm((prev) => ({ ...prev, name }))} placeholder="Name" />
          <Field value={form.age} onChange={(age) => setForm((prev) => ({ ...prev, age }))} placeholder="Age" />
          <Field
            value={form.contactInfo}
            onChange={(contactInfo) => setForm((prev) => ({ ...prev, contactInfo }))}
            placeholder="Contact info"
          />
        </div>
      </Card>

      <Card>
        <h2 className="mb-2.5 text-[15px]">Your goals</h2>
        {goalList.map((goal, index) => (
          <div key={`${goal}-${index}`} className="mb-2 flex items-center gap-2">
            <Field
              value={goal}
              onChange={(value) =>
                setGoalList((prev) => prev.map((item, i) => (i === index ? value : item)))
              }
            />
            <button type="button" className="text-ink-70" onClick={() => setGoalList((prev) => prev.filter((_, i) => i !== index))}>
              <Icon name="close" className="text-[18px]" />
            </button>
          </div>
        ))}
        <div className="mt-2 flex gap-2">
          <Field value={newGoal} onChange={setNewGoal} placeholder="Add a goal" />
          <Button size="sm" variant="ghost" onClick={() => {
            if (!newGoal.trim()) return;
            setGoalList((prev) => [...prev, newGoal.trim()]);
            setNewGoal("");
          }}>
            Add
          </Button>
        </div>
        <p className="mt-3 mb-2 text-[13px] font-bold text-ink-70">Why these matter</p>
        <textarea
          value={form.whyMatters}
          onChange={(event) => setForm((prev) => ({ ...prev, whyMatters: event.target.value }))}
          placeholder="Why this is worth it to you"
          className="min-h-16 w-full resize-none rounded-xl bg-canvas p-3 text-[13.5px] outline-none placeholder:text-ink-70"
        />
        <p className="mt-3 mb-2 text-[13px] font-bold text-ink-70">Why past attempts stalled</p>
        {attemptList.map((attempt, index) => (
          <div key={`${attempt}-${index}`} className="mb-2 flex items-center gap-2">
            <Field
              value={attempt}
              onChange={(value) =>
                setAttemptList((prev) => prev.map((item, i) => (i === index ? value : item)))
              }
            />
            <button type="button" className="text-ink-70" onClick={() => setAttemptList((prev) => prev.filter((_, i) => i !== index))}>
              <Icon name="close" className="text-[18px]" />
            </button>
          </div>
        ))}
        <div className="mt-2 flex gap-2">
          <Field value={newAttempt} onChange={setNewAttempt} placeholder="Add a reason" />
          <Button size="sm" variant="ghost" onClick={() => {
            if (!newAttempt.trim()) return;
            setAttemptList((prev) => [...prev, newAttempt.trim()]);
            setNewAttempt("");
          }}>
            Add
          </Button>
        </div>
      </Card>

      <Card>
        <h2 className="mb-2.5 text-[15px]">How you want to be motivated</h2>
        <PillRow>
          {MOTIVATORS.map((item) => (
            <Pill
              key={item}
              active={picks.includes(item)}
              onClick={() =>
                setPicks((prev) =>
                  prev.includes(item) ? prev.filter((value) => value !== item) : [...prev, item],
                )
              }
            >
              {item}
            </Pill>
          ))}
        </PillRow>
        <ScreenSub className="mb-0 mt-2.5">
          Choose which reinforcement types SOS should lead with when you reach out.
        </ScreenSub>
      </Card>

      <Card>
        <h2 className="mb-2.5 text-[15px]">Your people</h2>
        {people.map((person) => (
          <div key={person.id} className="flex items-center gap-3 border-b border-[#E7E7E5] py-3 last:border-b-0">
            <IconBadge>
              <span className="text-xs font-extrabold">{person.initials}</span>
            </IconBadge>
            <div>
              <p className="text-[13.5px] font-bold">{person.name}</p>
              <p className="text-xs text-ink-70">{person.contactInfo}</p>
            </div>
          </div>
        ))}
        <div className="mt-3 space-y-2">
          <Field
            value={newPerson.name}
            onChange={(name) => setNewPerson((prev) => ({ ...prev, name }))}
            placeholder="Name"
          />
          <Field
            value={newPerson.contactInfo}
            onChange={(contactInfo) => setNewPerson((prev) => ({ ...prev, contactInfo }))}
            placeholder="Phone or email"
          />
          <Button
            variant="ghost"
            onClick={async () => {
              const result = await addContact(newPerson.name, newPerson.contactInfo);
              if (result.error || !result.contact) {
                showToast(result.error ?? "Could not add them.");
                return;
              }
              setPeople((prev) => [...prev, result.contact]);
              setNewPerson({ name: "", contactInfo: "" });
              showToast("They're on your list.");
            }}
          >
            <Icon name="person_add" className="text-[18px]" />
            Add a loved one
          </Button>
        </div>
      </Card>

      <Card>
        <h2 className="mb-2.5 text-[15px]">Other tools</h2>
        <Button variant="ghost" href="/restaurant" className="mb-2">
          <Icon name="restaurant" className="text-[18px]" />
          Restaurant finder
        </Button>
        <Button variant="ghost" href="/alias">
          <Icon name="swap_horiz" className="text-[18px]" />
          Food alias
        </Button>
      </Card>

      <Button onClick={onSave}>{saving ? "Saving…" : "Save & continue"}</Button>
      <Button href="/home" variant="ghost" className="mt-2">
        Back to today
      </Button>
    </Screen>
  );
}
