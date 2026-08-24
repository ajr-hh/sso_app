import { JournalForm } from "@/components/journal-form";
import { Eyebrow, Screen, ScreenSub, ScreenTitle } from "@/components/ui";
import { getAppUser } from "@/lib/user";

export const dynamic = "force-dynamic";

export default async function JournalPage() {
  const user = await getAppUser();

  return (
    <Screen>
      <Eyebrow>Daily check-in</Eyebrow>
      <ScreenTitle>Today&rsquo;s journal entry</ScreenTitle>
      <ScreenSub>Two minutes. How did today actually go?</ScreenSub>
      <JournalForm
        entries={user.journalEntries.map((entry) => ({
          id: entry.id,
          mood: entry.mood,
          text: entry.text,
        }))}
      />
    </Screen>
  );
}
