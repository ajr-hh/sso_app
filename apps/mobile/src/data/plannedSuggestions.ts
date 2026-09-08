import { explainError } from "../lib/errors";
import { getSupabase } from "../lib/supabase";
import {
  canSaveOtherEvent,
  isPlannedEventKind,
  MAX_OTHER_LABEL,
  parsePlannedSuggestions,
  type PlannedEventKind,
  type PlannedSuggestion,
} from "../presentation/planned";

export type PlannedEventPlan = {
  id: string;
  event_kind: PlannedEventKind;
  custom_label: string | null;
  suggestions: PlannedSuggestion[];
};

const LOAD_ERROR = "We couldn’t load that plan. Try again.";
const SAVE_ERROR = "We couldn’t save that plan. Try again.";
const GENERATE_ERROR = "We couldn’t get suggestions right now. Try again.";
const RATE_LIMIT_ERROR =
  "That's a lot of plans for one hour. Try again later.";

async function requireUserId(): Promise<string> {
  const { data, error } = await getSupabase().auth.getUser();
  if (error || !data.user) {
    throw new Error("You must be signed in to plan ahead.");
  }
  return data.user.id;
}

function readPlan(raw: unknown): PlannedEventPlan | null {
  if (typeof raw !== "object" || raw === null) {
    return null;
  }
  const row = raw as {
    id?: unknown;
    event_kind?: unknown;
    custom_label?: unknown;
    suggestions?: unknown;
  };
  if (typeof row.id !== "string" || !isPlannedEventKind(row.event_kind)) {
    return null;
  }
  const suggestions = parsePlannedSuggestions(row.suggestions);
  if (!suggestions) {
    return null;
  }
  const customLabel =
    typeof row.custom_label === "string" && row.custom_label.trim().length > 0
      ? row.custom_label.trim().slice(0, MAX_OTHER_LABEL)
      : null;
  if (row.event_kind === "other" && !customLabel) {
    return null;
  }
  if (row.event_kind !== "other" && customLabel) {
    return null;
  }
  return {
    id: row.id,
    event_kind: row.event_kind,
    custom_label: customLabel,
    suggestions,
  };
}

export async function fetchPlannedEventPlans(): Promise<PlannedEventPlan[]> {
  const userId = await requireUserId();
  const { data, error } = await getSupabase()
    .from("planned_event_plans")
    .select("id, event_kind, custom_label, suggestions")
    .eq("user_id", userId)
    .eq("deleted", false)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(LOAD_ERROR);
  }
  return (data ?? []).flatMap((row) => {
    const plan = readPlan(row);
    return plan ? [plan] : [];
  });
}

export async function fetchPlannedEventPlan(): Promise<PlannedEventPlan | null> {
  const userId = await requireUserId();
  const { data, error } = await getSupabase()
    .from("planned_event_plans")
    .select("id, event_kind, custom_label, suggestions")
    .eq("user_id", userId)
    .eq("deleted", false)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(LOAD_ERROR);
  }
  if (!data) {
    return null;
  }
  return readPlan(data);
}

export async function savePlannedEventPlan(input: {
  eventKind: PlannedEventKind;
  customLabel?: string;
  suggestions: readonly PlannedSuggestion[];
}): Promise<PlannedEventPlan> {
  const userId = await requireUserId();
  const suggestions = parsePlannedSuggestions(input.suggestions);
  if (!suggestions) {
    throw new Error(SAVE_ERROR);
  }
  const customLabel =
    input.eventKind === "other" && canSaveOtherEvent(input.customLabel ?? "")
      ? (input.customLabel ?? "").trim()
      : null;
  if (input.eventKind === "other" && !customLabel) {
    throw new Error(SAVE_ERROR);
  }

  const { data, error } = await getSupabase()
    .from("planned_event_plans")
    .insert({
      user_id: userId,
      event_kind: input.eventKind,
      custom_label: customLabel,
      suggestions,
    })
    .select("id, event_kind, custom_label, suggestions")
    .single();

  if (error) {
    throw new Error(SAVE_ERROR);
  }
  const plan = readPlan(data);
  if (!plan) {
    throw new Error(SAVE_ERROR);
  }
  return plan;
}

export async function updatePlannedEventSuggestions(
  id: string,
  suggestions: readonly PlannedSuggestion[],
): Promise<PlannedEventPlan> {
  const userId = await requireUserId();
  const parsed = parsePlannedSuggestions(suggestions);
  if (!parsed) {
    throw new Error(SAVE_ERROR);
  }
  const { data, error } = await getSupabase()
    .from("planned_event_plans")
    .update({ suggestions: parsed })
    .eq("id", id)
    .eq("user_id", userId)
    .eq("deleted", false)
    .select("id, event_kind, custom_label, suggestions")
    .maybeSingle();
  if (error || !data) {
    throw new Error(SAVE_ERROR);
  }
  const plan = readPlan(data);
  if (!plan) {
    throw new Error(SAVE_ERROR);
  }
  return plan;
}

export async function removePlannedEventPlan(id: string): Promise<void> {
  const userId = await requireUserId();
  const { data, error } = await getSupabase()
    .from("planned_event_plans")
    .update({ deleted: true, deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId)
    .eq("deleted", false)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    throw new Error(SAVE_ERROR);
  }
}

function isRateLimited(error: unknown): boolean {
  const { context } = (error ?? {}) as { context?: { status?: unknown } };
  return context?.status === 429;
}

function explainGenerateFailure(error: unknown): string {
  if (isRateLimited(error)) {
    return RATE_LIMIT_ERROR;
  }
  const message = error instanceof Error ? error.message : "";
  if (error instanceof TypeError || /network/i.test(message)) {
    return explainError(error);
  }
  return GENERATE_ERROR;
}

export async function generatePlannedSuggestions(input: {
  eventKind: PlannedEventKind;
  eventLabel?: string;
  avoidTexts?: readonly string[];
}): Promise<PlannedSuggestion[]> {
  const eventLabel =
    input.eventKind === "other" && canSaveOtherEvent(input.eventLabel ?? "")
      ? (input.eventLabel ?? "").trim()
      : undefined;
  const avoidTexts = (input.avoidTexts ?? [])
    .map((text) => text.trim())
    .filter((text) => text.length > 0)
    .slice(0, 12);

  let response: { data: unknown; error: unknown };
  try {
    response = await getSupabase().functions.invoke("sos-generate", {
      body: {
        kind: "planned_suggestions",
        input: {
          event_kind: input.eventKind,
          ...(eventLabel ? { event_label: eventLabel } : {}),
          ...(avoidTexts.length > 0 ? { avoid_texts: avoidTexts } : {}),
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

  const suggestions = parsePlannedSuggestions(job.output);
  if (!suggestions) {
    throw new Error(GENERATE_ERROR);
  }
  return suggestions;
}
