import { toDayKey } from "../lib/domain";
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

export function taskDayKey(date = new Date()): string {
  return toDayKey(date);
}

export async function fetchTasks(): Promise<DailyTask[]> {
  const userId = await requireUserId();
  const { data, error } = await getSupabase()
    .from("daily_tasks")
    .select("id, label, done")
    .eq("user_id", userId)
    .eq("day", taskDayKey())
    .eq("deleted", false)
    .order("id", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function addTask(label: string): Promise<DailyTask> {
  const userId = await requireUserId();
  const { data, error } = await getSupabase()
    .from("daily_tasks")
    .insert({
      user_id: userId,
      label,
      day: taskDayKey(),
    })
    .select("id, label, done")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function toggleTask(id: string, done: boolean): Promise<void> {
  const userId = await requireUserId();
  const { error } = await getSupabase()
    .from("daily_tasks")
    .update({ done })
    .eq("id", id)
    .eq("user_id", userId)
    .eq("day", taskDayKey())
    .eq("deleted", false);

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateTask(id: string, label: string): Promise<void> {
  const userId = await requireUserId();
  const { error } = await getSupabase()
    .from("daily_tasks")
    .update({ label })
    .eq("id", id)
    .eq("user_id", userId)
    .eq("day", taskDayKey())
    .eq("deleted", false);

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteTask(id: string): Promise<void> {
  const userId = await requireUserId();
  const { error } = await getSupabase()
    .from("daily_tasks")
    .update({ deleted: true, deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId)
    .eq("day", taskDayKey())
    .eq("deleted", false);

  if (error) {
    throw new Error(error.message);
  }
}
