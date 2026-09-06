/// <reference types="jsr:@supabase/functions-js/edge-runtime.d.ts" />

// Shared SOS generation gateway. `food_swaps` (Better Choices) is the first
// kind; later rails add a kind here instead of a second HTTP stack or a second
// provider key path.
//
// Privacy contract: the craving label, diet flags, and allergens arrive in the
// request body because the prompt and the safety filter need them. They are
// never logged, never echoed back to the caller, and never interpolated into
// error copy. Logs carry job_id, kind, and status only.

import { createSupabaseContext } from "npm:@supabase/server";

const SUPPORTED_KINDS = ["food_swaps"] as const;

type SosGenerateKind = (typeof SUPPORTED_KINDS)[number];

const DIET_FLAGS = [
  "vegetarian",
  "vegan",
  "nut_free",
  "dairy_free",
  "gluten_free",
] as const;

type DietFlag = (typeof DIET_FLAGS)[number];

type FoodRules = {
  dietFlags: DietFlag[];
  allergens: string[];
};

type Swap = {
  label: string;
  ruleTags: string[];
};

const MAX_JOBS_PER_HOUR = 10;
const ROLLING_WINDOW_MS = 60 * 60 * 1000;
const MAX_SWAPS = 4;
const MAX_CANDIDATES = 12;
const MAX_CRAVING_LENGTH = 60;
const MAX_LABEL_LENGTH = 80;
const MAX_ALLERGENS = 20;
const MAX_ALLERGEN_LENGTH = 40;

const UNAUTHORIZED_ERROR = "Sign in to ask for swap ideas.";
const BAD_REQUEST_ERROR = "That isn't something we can generate.";
const FOOD_RULES_ERROR = "Set your food rules before asking for swap ideas.";
const RATE_LIMIT_ERROR =
  "That's a lot of swap ideas for one hour. Try again later.";
const FAILED_ERROR = "Couldn't get swap ideas right now. Try again.";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = [
  "You suggest four short food swaps for one craving.",
  "Each swap must give similar satisfaction with better nutrition overall.",
  "Never make medical claims and never comment on weight, appearance, or diagnosis.",
  "Obey every diet flag and allergen the member lists; never suggest a food that breaks one.",
  'Reply with JSON only, shaped {"swaps":[{"label":"Greek yogurt with berries","ruleTags":["dairy"]}]}.',
  "Keep every label under 80 characters.",
  "Tag each suggestion honestly using only these tokens: nuts, peanuts, dairy, gluten, meat, fish, eggs.",
].join(" ");

// Backfill for model output that the filter removed. These carry no rule tags,
// so they survive unless the member listed one of them as an allergen.
const SAFE_FALLBACK_SWAPS: Swap[] = [
  { label: "Apple slices", ruleTags: [] },
  { label: "Sparkling water", ruleTags: [] },
  { label: "Herbal tea", ruleTags: [] },
  { label: "Carrot sticks", ruleTags: [] },
];

// Mirrors `tagHitsRules` in apps/mobile/src/presentation/foodRules.ts so a
// generated swap is judged exactly like a catalog swap. The mobile source
// contract test fails if the two tag vocabularies drift apart.
function tagHitsRules(tag: string, rules: FoodRules): boolean {
  if (rules.allergens.includes(tag)) return true;
  if (tag === "nuts" && rules.dietFlags.includes("nut_free")) return true;
  if (tag === "peanuts" && rules.dietFlags.includes("nut_free")) return true;
  if (tag === "dairy" && rules.dietFlags.includes("dairy_free")) return true;
  if (tag === "gluten" && rules.dietFlags.includes("gluten_free")) return true;
  if (
    (tag === "meat" || tag === "fish") &&
    rules.dietFlags.includes("vegetarian")
  ) {
    return true;
  }
  if (
    (tag === "meat" || tag === "fish" || tag === "dairy" || tag === "eggs") &&
    rules.dietFlags.includes("vegan")
  ) {
    return true;
  }
  return false;
}

function swapIsSafe(swap: Swap, rules: FoodRules): boolean {
  if (swap.ruleTags.some((tag) => tagHitsRules(tag, rules))) {
    return false;
  }

  // Defense in depth: a model can name an allergen in a swap it left untagged.
  const label = swap.label.toLowerCase();
  return !rules.allergens.some((allergen) => label.includes(allergen));
}

function selectSafeSwaps(candidates: Swap[], rules: FoodRules): Swap[] {
  const chosen: Swap[] = [];
  const seen = new Set<string>();

  for (const swap of [...candidates, ...SAFE_FALLBACK_SWAPS]) {
    if (chosen.length === MAX_SWAPS) break;
    const key = swap.label.toLowerCase();
    if (seen.has(key)) continue;
    if (!swapIsSafe(swap, rules)) continue;
    seen.add(key);
    chosen.push(swap);
  }

  return chosen;
}

function normalizeAllergens(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];

  const allergens: string[] = [];
  for (const entry of raw) {
    if (typeof entry !== "string") continue;
    const value = entry.trim().toLowerCase();
    if (value.length === 0 || value.length > MAX_ALLERGEN_LENGTH) continue;
    if (!allergens.includes(value)) allergens.push(value);
  }

  return allergens.slice(0, MAX_ALLERGENS);
}

function normalizeDietFlags(raw: unknown): DietFlag[] {
  if (!Array.isArray(raw)) return [];

  const known = new Set<string>(DIET_FLAGS);
  const flags: DietFlag[] = [];
  for (const entry of raw) {
    if (typeof entry !== "string" || !known.has(entry)) continue;
    const flag = entry as DietFlag;
    if (!flags.includes(flag)) flags.push(flag);
  }

  return flags;
}

// The saved profile is authoritative. The request's copy of the food rules is
// merged in, so a stale or tampered client can only add a restriction.
function unionDietFlags(stored: unknown, requested: unknown): DietFlag[] {
  return normalizeDietFlags([
    ...(Array.isArray(stored) ? stored : []),
    ...(Array.isArray(requested) ? requested : []),
  ]);
}

function unionAllergens(stored: unknown, requested: unknown): string[] {
  return normalizeAllergens([
    ...(Array.isArray(stored) ? stored : []),
    ...(Array.isArray(requested) ? requested : []),
  ]);
}

function readKind(body: unknown): SosGenerateKind | null {
  const { kind } = (body ?? {}) as { kind?: unknown };
  return SUPPORTED_KINDS.find((supported) => supported === kind) ?? null;
}

function readFoodSwapsRequest(body: unknown): {
  cravingLabel: string;
  dietFlags: unknown;
  allergens: unknown;
} | null {
  const { input } = (body ?? {}) as { input?: unknown };
  if (typeof input !== "object" || input === null) return null;

  const requested = input as {
    craving_label?: unknown;
    diet_flags?: unknown;
    allergens?: unknown;
  };
  if (typeof requested.craving_label !== "string") return null;

  const cravingLabel = requested.craving_label.trim();
  if (cravingLabel.length === 0 || cravingLabel.length > MAX_CRAVING_LENGTH) {
    return null;
  }

  return {
    cravingLabel,
    dietFlags: requested.diet_flags,
    allergens: requested.allergens,
  };
}

function normalizeRuleTags(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null;

  const tags: string[] = [];
  for (const entry of raw) {
    if (typeof entry !== "string") continue;
    const tag = entry.trim().toLowerCase();
    if (tag.length > 0 && !tags.includes(tag)) tags.push(tag);
  }

  return tags;
}

// Untagged candidates are dropped rather than trusted: a missing tag list would
// let a dairy or gluten suggestion walk past the filter.
function readCandidates(raw: unknown): Swap[] {
  const { swaps } = (raw ?? {}) as { swaps?: unknown };
  if (!Array.isArray(swaps)) return [];

  const candidates: Swap[] = [];
  for (const entry of swaps.slice(0, MAX_CANDIDATES)) {
    if (typeof entry !== "object" || entry === null) continue;
    const { label, ruleTags } = entry as { label?: unknown; ruleTags?: unknown };
    if (typeof label !== "string") continue;

    const trimmed = label.trim();
    if (trimmed.length === 0 || trimmed.length > MAX_LABEL_LENGTH) continue;

    const tags = normalizeRuleTags(ruleTags);
    if (tags === null) continue;

    candidates.push({ label: trimmed, ruleTags: tags });
  }

  return candidates;
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function logJob(jobId: string, kind: SosGenerateKind, status: string): void {
  console.log(JSON.stringify({ job_id: jobId, kind, status }));
}

async function handle(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: BAD_REQUEST_ERROR }, 405);
  }

  // `auth: "user"` requires a caller JWT on top of the platform's verify_jwt
  // check and scopes ctx.supabase to that member's row-level security.
  const { data: ctx, error: contextError } = await createSupabaseContext(req, {
    auth: "user",
  });

  if (contextError || !ctx) {
    return jsonResponse({ error: UNAUTHORIZED_ERROR }, 401);
  }

  const { data: userData, error: userError } =
    await ctx.supabase.auth.getUser();
  const user = userData?.user;

  if (userError || !user) {
    return jsonResponse({ error: UNAUTHORIZED_ERROR }, 401);
  }

  const userId = user.id;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: BAD_REQUEST_ERROR }, 400);
  }

  const kind = readKind(body);
  if (!kind) {
    return jsonResponse({ error: BAD_REQUEST_ERROR }, 400);
  }

  const requested = readFoodSwapsRequest(body);
  if (!requested) {
    return jsonResponse({ error: BAD_REQUEST_ERROR }, 400);
  }

  const { data: profile, error: profileError } = await ctx.supabase
    .from("profiles")
    .select("food_rules_set, diet_flags, allergens")
    .eq("id", userId)
    .eq("deleted", false)
    .maybeSingle();

  if (profileError || !profile) {
    return jsonResponse({ error: FAILED_ERROR }, 500);
  }

  if (profile.food_rules_set !== true) {
    return jsonResponse({ error: FOOD_RULES_ERROR }, 403);
  }

  const rules: FoodRules = {
    dietFlags: unionDietFlags(profile.diet_flags, requested.dietFlags),
    allergens: unionAllergens(profile.allergens, requested.allergens),
  };
  const input = {
    craving_label: requested.cravingLabel,
    diet_flags: rules.dietFlags,
    allergens: rules.allergens,
  };

  // Cap spend and abuse before the provider is ever contacted.
  const windowStart = new Date(Date.now() - ROLLING_WINDOW_MS).toISOString();
  const { count, error: countError } = await ctx.supabase
    .from("generation_jobs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", windowStart);

  if (countError) {
    return jsonResponse({ error: FAILED_ERROR }, 500);
  }

  if ((count ?? 0) >= MAX_JOBS_PER_HOUR) {
    return jsonResponse({ error: RATE_LIMIT_ERROR }, 429);
  }

  const { data: job, error: insertError } = await ctx.supabase
    .from("generation_jobs")
    .insert({ user_id: userId, kind, status: "pending", input })
    .select("id")
    .single();

  if (insertError || !job) {
    return jsonResponse({ error: FAILED_ERROR }, 500);
  }

  const jobId = job.id as string;

  try {
    const candidates = await requestSwapCandidates(
      requested.cravingLabel,
      rules,
    );
    const swaps = selectSafeSwaps(candidates, rules);

    // Returning a short list would only fail the client's parse, and padding it
    // with anything unfiltered is what this gateway exists to prevent.
    if (swaps.length < MAX_SWAPS) {
      throw new Error("No safe swap set is available.");
    }

    const { error: finishError } = await ctx.supabaseAdmin
      .from("generation_jobs")
      .update({
        status: "succeeded",
        output: { swaps },
        finished_at: new Date().toISOString(),
      })
      .eq("id", jobId)
      .eq("user_id", userId);

    // An unrecorded job is a failed job: the row is the audit trail.
    if (finishError) {
      throw finishError;
    }

    logJob(jobId, kind, "succeeded");
    return jsonResponse(
      { job_id: jobId, status: "succeeded", output: { swaps } },
      200,
    );
  } catch {
    await ctx.supabaseAdmin
      .from("generation_jobs")
      .update({
        status: "failed",
        error: FAILED_ERROR,
        finished_at: new Date().toISOString(),
      })
      .eq("id", jobId)
      .eq("user_id", userId);

    logJob(jobId, kind, "failed");
    return jsonResponse(
      { job_id: jobId, status: "failed", error: FAILED_ERROR },
      502,
    );
  }
}

async function requestSwapCandidates(
  cravingLabel: string,
  rules: FoodRules,
): Promise<Swap[]> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");

  if (!apiKey) {
    throw new Error("The generation provider is not configured.");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: Deno.env.get("OPENAI_MODEL") ?? "gpt-4o-mini",
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: JSON.stringify({
            craving: cravingLabel,
            diet_flags: rules.dietFlags,
            allergens: rules.allergens,
          }),
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error("The generation provider rejected the request.");
  }

  const payload = (await response.json()) as {
    choices?: { message?: { content?: unknown } }[];
  };
  const content = payload.choices?.[0]?.message?.content;

  if (typeof content !== "string") {
    throw new Error("The generation provider returned no content.");
  }

  return readCandidates(JSON.parse(content));
}

export default { fetch: handle };
