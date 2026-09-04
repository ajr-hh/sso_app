import { getSupabase } from "../lib/supabase";

export type JournalSentiment = "Good day" | "Tough day" | "Mixed";

export type JournalEntry = {
  id: string;
  mood: string | null;
  body: string;
  created_at: string;
};

async function requireUserId(): Promise<string> {
  const { data, error } = await getSupabase().auth.getUser();

  if (error) {
    throw new Error(error.message);
  }

  if (!data.user) {
    throw new Error("You must be signed in to manage your journal.");
  }

  return data.user.id;
}

export async function fetchJournal(): Promise<JournalEntry[]> {
  const userId = await requireUserId();
  const { data, error } = await getSupabase()
    .from("journal_entries")
    .select("id, mood, body, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function addJournalEntry(
  mood: JournalSentiment,
  body: string,
): Promise<void> {
  const userId = await requireUserId();
  const { error } = await getSupabase().from("journal_entries").insert({
    user_id: userId,
    mood,
    body,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateJournalEntry(
  id: string,
  mood: JournalSentiment,
  body: string,
): Promise<void> {
  const userId = await requireUserId();
  const { error } = await getSupabase()
    .from("journal_entries")
    .update({ mood, body })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteJournalEntry(id: string): Promise<void> {
  const userId = await requireUserId();
  const { error } = await getSupabase()
    .from("journal_entries")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }
}
