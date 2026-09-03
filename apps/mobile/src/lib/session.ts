import type { Session } from "@supabase/supabase-js";

import { getSupabase } from "./supabase";

export type AuthChangeCallback = (session: Session | null) => void;

export async function getSession(): Promise<Session | null> {
  const { data, error } = await getSupabase().auth.getSession();

  if (error) {
    throw error;
  }

  return data.session;
}

export function onAuthChange(callback: AuthChangeCallback) {
  const {
    data: { subscription },
  } = getSupabase().auth.onAuthStateChange((_event, session) => {
    callback(session);
  });

  return subscription;
}
