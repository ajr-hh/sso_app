import { getSupabase } from "../lib/supabase";

export type SosPath = "off_the_rails" | "planned_event";

export async function logSosEvent(
  path: SosPath,
  reinforcement: string,
): Promise<void> {
  const supabase = getSupabase();
  const { data, error: authError } = await supabase.auth.getUser();

  if (authError) {
    throw new Error(authError.message);
  }

  if (!data.user) {
    throw new Error("You must be signed in to use SOS.");
  }

  const { error } = await supabase.from("sos_events").insert({
    path,
    reinforcement,
    user_id: data.user.id,
  });

  if (error) {
    throw new Error(error.message);
  }
}
