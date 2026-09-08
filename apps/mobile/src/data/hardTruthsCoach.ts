import { parseCoachReply } from "../presentation/coaches";
import type { CoachId } from "../presentation/coaches";
import { explainError } from "../lib/errors";
import { getSupabase } from "../lib/supabase";

export type HardTruthsCoachLine = {
  id: string;
  coach_style: CoachId;
  body: string;
};

async function requireUserId(): Promise<string> {
  const { data, error } = await getSupabase().auth.getUser();
  if (error || !data.user) {
    throw new Error("You must be signed in to load Hard Truths.");
  }
  return data.user.id;
}

export async function fetchHardTruthsCoachLine(
  coachStyle: CoachId,
): Promise<HardTruthsCoachLine | null> {
  const userId = await requireUserId();
  const { data, error } = await getSupabase()
    .from("hard_truths_coach_lines")
    .select("id, coach_style, body")
    .eq("user_id", userId)
    .eq("coach_style", coachStyle)
    .eq("deleted", false)
    .maybeSingle();

  if (error) {
    throw new Error("Something went wrong.");
  }
  if (!data) {
    return null;
  }
  return data as HardTruthsCoachLine;
}

function isRateLimited(error: unknown): boolean {
  const { context } = (error ?? {}) as { context?: { status?: unknown } };
  return context?.status === 429;
}

function explainCoachLineFailure(error: unknown): string {
  if (isRateLimited(error)) {
    return "That's a lot of coach lines for one hour. Try again later.";
  }
  const message = error instanceof Error ? error.message : "";
  if (error instanceof TypeError || /network/i.test(message)) {
    return explainError(error);
  }
  return "We couldn’t get that coach line. Try again.";
}

export async function generateHardTruthsCoachLine(
  coachStyle: CoachId,
): Promise<string> {
  let response: { data: unknown; error: unknown };
  try {
    response = await getSupabase().functions.invoke("sos-generate", {
      body: {
        kind: "hard_truths_coach",
        input: { coach_style: coachStyle },
      },
    });
  } catch (caught) {
    throw new Error(explainCoachLineFailure(caught));
  }

  if (response.error) {
    throw new Error(explainCoachLineFailure(response.error));
  }

  const job = response.data as
    | { status?: unknown; output?: unknown }
    | null
    | undefined;
  if (!job || job.status !== "succeeded") {
    throw new Error("We couldn’t get that coach line. Try again.");
  }

  const body = parseCoachReply(job.output);
  if (!body) {
    throw new Error("We couldn’t get that coach line. Try again.");
  }
  return body;
}

export async function saveHardTruthsCoachLine(input: {
  coachStyle: CoachId;
  body: string;
}): Promise<HardTruthsCoachLine> {
  const userId = await requireUserId();
  const { data, error } = await getSupabase()
    .from("hard_truths_coach_lines")
    .insert({
      user_id: userId,
      coach_style: input.coachStyle,
      body: input.body.trim(),
    })
    .select("id, coach_style, body")
    .single();

  if (error) {
    throw new Error("Something went wrong.");
  }

  return data as HardTruthsCoachLine;
}
