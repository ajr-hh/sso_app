import { explainError } from "../lib/errors";
import { getSupabase } from "../lib/supabase";
import {
  isAliasLevel,
  type AliasLevel,
} from "../presentation/otherTools";

export type FoodAlias = {
  id: string;
  craving: string;
  flex_level: AliasLevel;
  title: string;
  sub: string;
};

const LOAD_ERROR = "We couldn’t load those swaps. Try again.";
const SAVE_ERROR = "We couldn’t save that swap. Try again.";
const GENERATE_ERROR = "We couldn’t find a swap right now. Try again.";
const RATE_LIMIT_ERROR =
  "That's a lot of alias swaps for one hour. Try again later.";

async function requireUserId(): Promise<string> {
  const { data, error } = await getSupabase().auth.getUser();
  if (error || !data.user) {
    throw new Error("You must be signed in to use Food alias swap.");
  }
  return data.user.id;
}

function readAlias(raw: unknown): FoodAlias | null {
  if (typeof raw !== "object" || raw === null) return null;
  const row = raw as {
    id?: unknown;
    craving?: unknown;
    flex_level?: unknown;
    title?: unknown;
    sub?: unknown;
  };
  if (typeof row.id !== "string") return null;
  if (typeof row.craving !== "string" || row.craving.trim().length === 0) {
    return null;
  }
  if (!isAliasLevel(row.flex_level)) return null;
  if (typeof row.title !== "string" || row.title.trim().length === 0) {
    return null;
  }
  if (typeof row.sub !== "string" || row.sub.trim().length === 0) return null;
  return {
    id: row.id,
    craving: row.craving.trim(),
    flex_level: row.flex_level,
    title: row.title.trim(),
    sub: row.sub.trim(),
  };
}

export async function fetchFoodAliases(): Promise<FoodAlias[]> {
  const userId = await requireUserId();
  const { data, error } = await getSupabase()
    .from("food_aliases")
    .select("id, craving, flex_level, title, sub")
    .eq("user_id", userId)
    .eq("deleted", false)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(LOAD_ERROR);
  }
  return (data ?? []).flatMap((row) => {
    const alias = readAlias(row);
    return alias ? [alias] : [];
  });
}

export async function saveFoodAlias(input: {
  craving: string;
  flexLevel: AliasLevel;
  title: string;
  sub: string;
}): Promise<FoodAlias> {
  const userId = await requireUserId();
  const craving = input.craving.trim();
  const title = input.title.trim();
  const sub = input.sub.trim();
  if (craving.length === 0 || title.length === 0 || sub.length === 0) {
    throw new Error(SAVE_ERROR);
  }

  const { data, error } = await getSupabase()
    .from("food_aliases")
    .insert({
      user_id: userId,
      craving,
      flex_level: input.flexLevel,
      title,
      sub,
    })
    .select("id, craving, flex_level, title, sub")
    .single();

  if (error) {
    throw new Error(SAVE_ERROR);
  }
  const alias = readAlias(data);
  if (!alias) {
    throw new Error(SAVE_ERROR);
  }
  return alias;
}

export function parseAliasOutput(payload: unknown): {
  title: string;
  sub: string;
} | null {
  if (typeof payload !== "object" || payload === null) return null;
  const { title, sub } = payload as { title?: unknown; sub?: unknown };
  if (typeof title !== "string" || typeof sub !== "string") return null;
  const cleanTitle = title.trim();
  const cleanSub = sub.trim();
  if (cleanTitle.length === 0 || cleanSub.length === 0) return null;
  return { title: cleanTitle, sub: cleanSub };
}

function isRateLimited(error: unknown): boolean {
  const { context } = (error ?? {}) as { context?: { status?: unknown } };
  return context?.status === 429;
}

function explainGenerateFailure(error: unknown): string {
  if (isRateLimited(error)) return RATE_LIMIT_ERROR;
  const message = error instanceof Error ? error.message : "";
  if (error instanceof TypeError || /network/i.test(message)) {
    return explainError(error);
  }
  return GENERATE_ERROR;
}

export async function generateFoodAlias(input: {
  craving: string;
  flexLevel: AliasLevel;
}): Promise<{ title: string; sub: string }> {
  const craving = input.craving.trim();
  if (craving.length === 0) {
    throw new Error("Enter a craving first.");
  }

  let response: { data: unknown; error: unknown };
  try {
    response = await getSupabase().functions.invoke("sos-generate", {
      body: {
        kind: "food_alias",
        input: {
          flex_level: input.flexLevel,
          craving_label: craving,
        },
      },
    });
  } catch (caught) {
    throw new Error(explainGenerateFailure(caught));
  }

  if (response.error) {
    throw new Error(explainGenerateFailure(response.error));
  }
  const job = response.data as
    | { status?: unknown; output?: unknown }
    | null
    | undefined;
  if (!job || job.status !== "succeeded") {
    throw new Error(GENERATE_ERROR);
  }
  const parsed = parseAliasOutput(job.output);
  if (!parsed) {
    throw new Error(GENERATE_ERROR);
  }
  return parsed;
}
