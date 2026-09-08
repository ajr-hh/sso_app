import { explainError } from "../lib/errors";
import { getSupabase } from "../lib/supabase";
import {
  getCoachMessageValidationError,
  humanizeCoachText,
  parseCoachId,
  parseCoachReply,
  type CoachId,
  COACH_ERRORS,
} from "../presentation/coaches";

export type CoachMessageRole = "member" | "coach";

export type CoachMessage = {
  id: string;
  coach_style: CoachId;
  role: CoachMessageRole;
  body: string;
  created_at: string;
  show_message: boolean;
};

async function requireUserId(): Promise<string> {
  const { data, error } = await getSupabase().auth.getUser();
  if (error || !data.user) {
    throw new Error("You must be signed in to message your coach.");
  }
  return data.user.id;
}

function readMessage(raw: unknown): CoachMessage | null {
  if (typeof raw !== "object" || raw === null) {
    return null;
  }
  const row = raw as {
    id?: unknown;
    coach_style?: unknown;
    role?: unknown;
    body?: unknown;
    created_at?: unknown;
    show_message?: unknown;
  };
  if (typeof row.id !== "string" || typeof row.created_at !== "string") {
    return null;
  }
  if (row.role !== "member" && row.role !== "coach") {
    return null;
  }
  if (typeof row.body !== "string") {
    return null;
  }
  const body =
    row.role === "coach" ? humanizeCoachText(row.body) : row.body.trim();
  if (body.length === 0) {
    return null;
  }
  return {
    id: row.id,
    coach_style: parseCoachId(row.coach_style),
    role: row.role,
    body,
    created_at: row.created_at,
    show_message: row.show_message !== false,
  };
}

export async function fetchCoachMessages(
  coachStyle: CoachId,
): Promise<CoachMessage[]> {
  const userId = await requireUserId();
  const { data, error } = await getSupabase()
    .from("coach_messages")
    .select("id, coach_style, role, body, created_at, show_message")
    .eq("user_id", userId)
    .eq("coach_style", coachStyle)
    .eq("deleted", false)
    .eq("show_message", true)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    throw new Error(COACH_ERRORS.load);
  }

  return (data ?? []).flatMap((row) => {
    const message = readMessage(row);
    return message ? [message] : [];
  });
}

export async function createCoachMessage(input: {
  coachStyle: CoachId;
  role: CoachMessageRole;
  body: string;
}): Promise<CoachMessage> {
  const userId = await requireUserId();
  const trimmed = input.body.trim();
  if (input.role === "member") {
    const validationError = getCoachMessageValidationError(trimmed);
    if (validationError) {
      throw new Error(validationError);
    }
  }
  const body =
    input.role === "coach" ? humanizeCoachText(trimmed) : trimmed;
  if (body.length === 0) {
    throw new Error(COACH_ERRORS.send);
  }

  const { data, error } = await getSupabase()
    .from("coach_messages")
    .insert({
      user_id: userId,
      coach_style: input.coachStyle,
      role: input.role,
      body,
    })
    .select("id, coach_style, role, body, created_at, show_message")
    .single();

  if (error) {
    throw new Error(COACH_ERRORS.send);
  }

  const message = readMessage(data);
  if (!message) {
    throw new Error(COACH_ERRORS.send);
  }
  return message;
}

export async function hideCoachMessage(id: string): Promise<void> {
  const userId = await requireUserId();
  const { data, error } = await getSupabase()
    .from("coach_messages")
    .update({ show_message: false })
    .eq("id", id)
    .eq("user_id", userId)
    .eq("show_message", true)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    throw new Error(COACH_ERRORS.hide);
  }
}

export async function hideVisibleCoachMessages(
  coachStyle: CoachId,
): Promise<void> {
  const userId = await requireUserId();
  const { error } = await getSupabase()
    .from("coach_messages")
    .update({ show_message: false })
    .eq("user_id", userId)
    .eq("coach_style", coachStyle)
    .eq("show_message", true);

  if (error) {
    throw new Error(COACH_ERRORS.hide);
  }
}

function isRateLimited(error: unknown): boolean {
  const { context } = (error ?? {}) as { context?: { status?: unknown } };
  return context?.status === 429;
}

function explainCoachFailure(error: unknown): string {
  if (isRateLimited(error)) {
    return "That's a lot of coach messages for one hour. Try again later.";
  }
  const message = error instanceof Error ? error.message : "";
  if (error instanceof TypeError || /network/i.test(message)) {
    return explainError(error);
  }
  return COACH_ERRORS.reply;
}

export async function generateCoachReply(coachStyle: CoachId): Promise<string> {
  let response: { data: unknown; error: unknown };
  try {
    response = await getSupabase().functions.invoke("sos-generate", {
      body: {
        kind: "coach_reply",
        input: { coach_style: coachStyle },
      },
    });
  } catch (caught) {
    throw new Error(explainCoachFailure(caught));
  }

  if (response.error) {
    throw new Error(explainCoachFailure(response.error));
  }

  const job = response.data as
    | { status?: unknown; output?: unknown }
    | null
    | undefined;
  if (!job || job.status !== "succeeded") {
    throw new Error(COACH_ERRORS.reply);
  }

  const body = parseCoachReply(job.output);
  if (!body) {
    throw new Error(COACH_ERRORS.reply);
  }
  return body;
}
