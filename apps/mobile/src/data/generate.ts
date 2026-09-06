import { explainError } from "../lib/errors";
import { getSupabase } from "../lib/supabase";
import {
  DIET_FLAGS,
  normalizeAllergens,
  type DietFlag,
  type FoodRules,
} from "../presentation/foodRules";

export type SosGenerateKind = "food_swaps";

export type GeneratedSwap = {
  label: string;
  ruleTags: string[];
};

export type FoodSwapsGenerateInput = {
  craving_label: string;
  diet_flags: DietFlag[];
  allergens: string[];
};

export type SosGenerateRequest = {
  kind: SosGenerateKind;
  input: FoodSwapsGenerateInput;
};

/**
 * Loggable description of a generation request: kind and counts only. The
 * invoke body carries the craving label and food rules because the function
 * needs them to prompt and filter, but only this shape is safe to log or
 * attach to an audit trail.
 */
export type SosGenerateAudit = {
  kind: SosGenerateKind;
  diet_flag_count: number;
  allergen_count: number;
};

const FAILED_MESSAGE = "Couldn't get swap ideas right now. Try again.";
const MAX_LABEL_LENGTH = 80;
const SWAP_COUNT = 4;

export function buildFoodSwapsGenerateRequest(
  rules: FoodRules,
  cravingLabel: string,
): SosGenerateRequest | null {
  if (!rules.foodRulesSet) {
    return null;
  }

  const knownDietFlags = new Set<string>(DIET_FLAGS);
  const dietFlags: DietFlag[] = [];
  for (const flag of rules.dietFlags) {
    if (knownDietFlags.has(flag) && !dietFlags.includes(flag)) {
      dietFlags.push(flag);
    }
  }

  return {
    kind: "food_swaps",
    input: {
      craving_label: cravingLabel.trim(),
      diet_flags: dietFlags,
      allergens: normalizeAllergens(rules.allergens),
    },
  };
}

export function describeSosGenerateRequest(
  request: SosGenerateRequest,
): SosGenerateAudit {
  return {
    kind: request.kind,
    diet_flag_count: request.input.diet_flags.length,
    allergen_count: request.input.allergens.length,
  };
}

function normalizeRuleTags(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) {
    return null;
  }

  const tags: string[] = [];
  for (const entry of raw) {
    if (typeof entry !== "string") {
      return null;
    }
    const tag = entry.trim().toLowerCase();
    if (tag.length > 0 && !tags.includes(tag)) {
      tags.push(tag);
    }
  }
  return tags;
}

function readSwap(raw: unknown): GeneratedSwap | null {
  if (typeof raw !== "object" || raw === null) {
    return null;
  }

  const { label, ruleTags } = raw as { label?: unknown; ruleTags?: unknown };
  if (typeof label !== "string") {
    return null;
  }

  const trimmed = label.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_LABEL_LENGTH) {
    return null;
  }

  const tags = normalizeRuleTags(ruleTags);
  return tags === null ? null : { label: trimmed, ruleTags: tags };
}

/**
 * Reads the `food_swaps` output of a succeeded job. The function already
 * filtered candidates against the member's food rules, so this only enforces
 * the transport shape: exactly four distinct, non-empty, tagged labels.
 */
export function parseFoodSwapsOutput(payload: unknown): GeneratedSwap[] {
  if (typeof payload !== "object" || payload === null) {
    throw new Error(FAILED_MESSAGE);
  }

  const { swaps: raw } = payload as { swaps?: unknown };
  if (!Array.isArray(raw) || raw.length !== SWAP_COUNT) {
    throw new Error(FAILED_MESSAGE);
  }

  const swaps: GeneratedSwap[] = [];
  const seen = new Set<string>();
  for (const entry of raw) {
    const swap = readSwap(entry);
    if (!swap) {
      throw new Error(FAILED_MESSAGE);
    }
    const key = swap.label.toLowerCase();
    if (seen.has(key)) {
      throw new Error(FAILED_MESSAGE);
    }
    seen.add(key);
    swaps.push(swap);
  }

  return swaps;
}

function isRateLimited(error: unknown): boolean {
  const { context } = (error ?? {}) as { context?: { status?: unknown } };
  return context?.status === 429;
}

/**
 * Generation failures must never repeat the craving or the food rules.
 * `explainError` echoes a message only in its final fallback branch, so it is
 * used here just for the offline and expired-credential cases where it returns
 * fixed copy; every other failure collapses to one generic line.
 */
function explainGenerateFailure(error: unknown): string {
  if (isRateLimited(error)) {
    return "That's a lot of swap ideas for one hour. Try again later.";
  }

  const message = error instanceof Error ? error.message : "";
  if (error instanceof TypeError || /network/i.test(message)) {
    return explainError(error);
  }

  return FAILED_MESSAGE;
}

export async function generateFoodSwaps(args: {
  cravingLabel: string;
  rules: FoodRules;
}): Promise<GeneratedSwap[]> {
  const request = buildFoodSwapsGenerateRequest(args.rules, args.cravingLabel);

  if (!request) {
    throw new Error("Set your food rules before asking for swap ideas.");
  }

  if (request.input.craving_label.length === 0) {
    throw new Error("Pick a craving before asking for swap ideas.");
  }

  let response: { data: unknown; error: unknown };

  try {
    response = await getSupabase().functions.invoke("sos-generate", {
      body: request,
    });
  } catch (caught) {
    throw new Error(explainGenerateFailure(caught));
  }

  if (response.error) {
    throw new Error(explainGenerateFailure(response.error));
  }

  const job = response.data as
    | { job_id?: unknown; status?: unknown; output?: unknown }
    | null
    | undefined;

  if (
    !job ||
    typeof job.job_id !== "string" ||
    job.job_id.length === 0 ||
    job.status !== "succeeded"
  ) {
    throw new Error(FAILED_MESSAGE);
  }

  return parseFoodSwapsOutput(job.output);
}
