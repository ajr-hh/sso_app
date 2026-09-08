import { explainError } from "../lib/errors";
import { getSupabase } from "../lib/supabase";
import {
  getResearchFactValidationError,
  parseResearchFact,
  STATS_ERRORS,
  type ResearchFact,
  type ResearchFactSource,
} from "../presentation/statsScreen";

async function requireUserId(): Promise<string> {
  const { data, error } = await getSupabase().auth.getUser();
  if (error || !data.user) {
    throw new Error("You must be signed in to manage research facts.");
  }
  return data.user.id;
}

function readFact(raw: unknown): ResearchFact | null {
  if (typeof raw !== "object" || raw === null) {
    return null;
  }
  const row = raw as {
    id?: unknown;
    num?: unknown;
    title?: unknown;
    body?: unknown;
    source?: unknown;
  };
  if (typeof row.id !== "string") return null;
  if (row.source !== "ai" && row.source !== "member") return null;
  const parsed = parseResearchFact({
    num: typeof row.num === "string" ? row.num : "",
    title: row.title,
    body: row.body,
  });
  if (!parsed) return null;
  return { id: row.id, source: row.source, ...parsed };
}

export async function fetchResearchFacts(): Promise<ResearchFact[]> {
  const userId = await requireUserId();
  const { data, error } = await getSupabase()
    .from("research_facts")
    .select("id, num, title, body, source")
    .eq("user_id", userId)
    .eq("deleted", false)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    throw new Error(STATS_ERRORS.load);
  }

  return (data ?? []).flatMap((row) => {
    const fact = readFact(row);
    return fact ? [fact] : [];
  });
}

export async function createResearchFact(input: {
  num?: string | null;
  title: string;
  body: string;
  source: ResearchFactSource;
}): Promise<ResearchFact> {
  const userId = await requireUserId();
  const parsed = parseResearchFact({
    num: input.num ?? "",
    title: input.title,
    body: input.body,
  });
  if (!parsed) {
    throw new Error(
      getResearchFactValidationError({
        title: input.title,
        body: input.body,
        num: input.num ?? undefined,
      }) ?? STATS_ERRORS.save,
    );
  }
  if (input.source === "editorial") {
    throw new Error(STATS_ERRORS.save);
  }

  const { data, error } = await getSupabase()
    .from("research_facts")
    .insert({
      user_id: userId,
      num: parsed.num,
      title: parsed.title,
      body: parsed.body,
      source: input.source,
    })
    .select("id, num, title, body, source")
    .single();

  if (error) {
    throw new Error(STATS_ERRORS.save);
  }

  const fact = readFact(data);
  if (!fact) {
    throw new Error(STATS_ERRORS.save);
  }
  return fact;
}

function isRateLimited(error: unknown): boolean {
  const { context } = (error ?? {}) as { context?: { status?: unknown } };
  return context?.status === 429;
}

function explainFactFailure(error: unknown): string {
  if (isRateLimited(error)) {
    return "That's a lot of new facts for one hour. Try again later.";
  }
  const message = error instanceof Error ? error.message : "";
  if (error instanceof TypeError || /network/i.test(message)) {
    return explainError(error);
  }
  return STATS_ERRORS.generate;
}

export async function generateResearchFact(
  existingCount: number,
): Promise<Omit<ResearchFact, "id" | "source">> {
  let response: { data: unknown; error: unknown };
  try {
    response = await getSupabase().functions.invoke("sos-generate", {
      body: {
        kind: "research_fact",
        input: { existing_count: existingCount },
      },
    });
  } catch (caught) {
    throw new Error(explainFactFailure(caught));
  }

  if (response.error) {
    throw new Error(explainFactFailure(response.error));
  }

  const job = response.data as
    | { status?: unknown; output?: unknown }
    | null
    | undefined;
  if (!job || job.status !== "succeeded") {
    throw new Error(STATS_ERRORS.generate);
  }

  const fact = parseResearchFact(job.output);
  if (!fact) {
    throw new Error(STATS_ERRORS.generate);
  }
  return fact;
}
