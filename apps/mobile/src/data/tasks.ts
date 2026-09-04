import { getSupabase } from "../lib/supabase";

export type DailyTask = {
  id: string;
  label: string;
  done: boolean;
};

async function requireUserId(): Promise<string> {
  const { data, error } = await getSupabase().auth.getUser();

  if (error) {
    throw new Error(error.message);
  }

  if (!data.user) {
    throw new Error("You must be signed in to manage daily tasks.");
  }

  return data.user.id;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function fetchTasks(): Promise<DailyTask[]> {
  const userId = await requireUserId();
  const { data, error } = await getSupabase()
    .from("daily_tasks")
    .select("id, label, done")
    .eq("user_id", userId)
    .eq("day", today())
    .order("id", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function addTask(label: string): Promise<void> {
  const userId = await requireUserId();
  const { error } = await getSupabase().from("daily_tasks").insert({
    user_id: userId,
    label,
    day: today(),
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function toggleTask(id: string, done: boolean): Promise<void> {
  const userId = await requireUserId();
  const { error } = await getSupabase()
    .from("daily_tasks")
    .update({ done })
    .eq("id", id)
    .eq("user_id", userId)
    .eq("day", today());

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteTask(id: string): Promise<void> {
  const userId = await requireUserId();
  const { error } = await getSupabase()
    .from("daily_tasks")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)
    .eq("day", today());

  if (error) {
    throw new Error(error.message);
  }
}
