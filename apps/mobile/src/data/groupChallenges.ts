import { getSupabase } from "../lib/supabase";
import {
  DEFAULT_CHALLENGE_BUY_IN,
  DEFAULT_CHALLENGE_DURATION_DAYS,
} from "../presentation/otherTools";

export type GroupChallenge = {
  id: string;
  duration_days: number;
  buy_in: number;
  created_at: string;
  invited_emails: string[];
};

export type GroupChallengeInvite = {
  id: string;
  challenge_id: string;
  email: string;
};

const LOAD_ERROR = "We couldn’t load those challenges. Try again.";
const SAVE_ERROR = "We couldn’t save that challenge. Try again.";

async function requireUserId(): Promise<string> {
  const { data, error } = await getSupabase().auth.getUser();
  if (error || !data.user) {
    throw new Error("You must be signed in to use group challenges.");
  }
  return data.user.id;
}

function readChallenge(
  raw: unknown,
  emails: string[],
): GroupChallenge | null {
  if (typeof raw !== "object" || raw === null) return null;
  const row = raw as {
    id?: unknown;
    duration_days?: unknown;
    buy_in?: unknown;
    created_at?: unknown;
  };
  if (typeof row.id !== "string") return null;
  if (typeof row.duration_days !== "number" || row.duration_days <= 0) {
    return null;
  }
  if (typeof row.buy_in !== "number" || row.buy_in < 0) return null;
  if (typeof row.created_at !== "string") return null;
  return {
    id: row.id,
    duration_days: row.duration_days,
    buy_in: row.buy_in,
    created_at: row.created_at,
    invited_emails: emails,
  };
}

export async function fetchGroupChallenges(): Promise<GroupChallenge[]> {
  const userId = await requireUserId();
  const supabase = getSupabase();
  const { data: rows, error } = await supabase
    .from("group_challenges")
    .select("id, duration_days, buy_in, created_at")
    .eq("user_id", userId)
    .eq("deleted", false)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(LOAD_ERROR);
  }

  const { data: invites, error: inviteError } = await supabase
    .from("group_challenge_invites")
    .select("challenge_id, email")
    .eq("user_id", userId)
    .eq("deleted", false);

  if (inviteError) {
    throw new Error(LOAD_ERROR);
  }

  const emailsByChallenge = new Map<string, string[]>();
  for (const invite of invites ?? []) {
    if (
      typeof invite.challenge_id !== "string" ||
      typeof invite.email !== "string"
    ) {
      continue;
    }
    const list = emailsByChallenge.get(invite.challenge_id) ?? [];
    list.push(invite.email);
    emailsByChallenge.set(invite.challenge_id, list);
  }

  return (rows ?? []).flatMap((row) => {
    const challenge = readChallenge(
      row,
      emailsByChallenge.get((row as { id?: string }).id ?? "") ?? [],
    );
    return challenge ? [challenge] : [];
  });
}

export async function createGroupChallenge(): Promise<GroupChallenge> {
  const userId = await requireUserId();
  const { data, error } = await getSupabase()
    .from("group_challenges")
    .insert({
      user_id: userId,
      duration_days: DEFAULT_CHALLENGE_DURATION_DAYS,
      buy_in: DEFAULT_CHALLENGE_BUY_IN,
    })
    .select("id, duration_days, buy_in, created_at")
    .single();

  if (error) {
    throw new Error(SAVE_ERROR);
  }
  const challenge = readChallenge(data, []);
  if (!challenge) {
    throw new Error(SAVE_ERROR);
  }
  return challenge;
}

export async function inviteToGroupChallenge(
  challengeId: string,
  email: string,
): Promise<GroupChallengeInvite> {
  const userId = await requireUserId();
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes("@") || normalized.length > 320) {
    throw new Error("Enter an email address to invite.");
  }

  const { data, error } = await getSupabase()
    .from("group_challenge_invites")
    .insert({
      user_id: userId,
      challenge_id: challengeId,
      email: normalized,
    })
    .select("id, challenge_id, email")
    .single();

  if (error) {
    throw new Error(SAVE_ERROR);
  }
  return data as GroupChallengeInvite;
}
