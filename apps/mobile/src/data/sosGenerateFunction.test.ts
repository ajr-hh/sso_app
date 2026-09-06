// The Edge Function runs on Deno and cannot be imported into the Jest suite, so
// this is a source contract test: it reads the function as text and asserts the
// auth, rate-limit, filtering, and logging guarantees the client depends on.
// It is a backstop for review, not a substitute for `deno check`, which is run
// separately against this function.
// This project types only Jest globals, so the CommonJS test scope needs a
// local declaration for the directory Jest resolves paths against.
declare const __dirname: string;

const { readFileSync } = jest.requireActual("fs") as {
  readFileSync: (path: string, encoding: "utf8") => string;
};
const { join } = jest.requireActual("path") as {
  join: (...segments: string[]) => string;
};

function read(relativePath: string): string {
  return readFileSync(join(__dirname, relativePath), "utf8");
}

const FUNCTION_DIR = "../../../../supabase/functions/sos-generate";
const source = read(`${FUNCTION_DIR}/index.ts`);
const normalized = source.replace(/\s+/g, " ");
const denoConfig = JSON.parse(read(`${FUNCTION_DIR}/deno.json`)) as {
  imports?: Record<string, string>;
  compilerOptions?: Record<string, unknown>;
};
const clientRules = read("../presentation/foodRules.ts");
const client = read("./generate.ts");
const envExample = read("../../.env.example");

function uniqueMatches(text: string, pattern: RegExp): string[] {
  return [
    ...new Set([...text.matchAll(pattern)].map((match) => match[1])),
  ].sort();
}

function consoleCalls(text: string): string[] {
  return [...text.matchAll(/console\.[a-z]+\([^;]*\)/g)].map(
    (match) => match[0],
  );
}

function logCategories(): string[] {
  const block = source.match(/const LOG_CATEGORIES = \[([^\]]*)\]/);
  expect(block).not.toBeNull();
  return [...(block as RegExpMatchArray)[1].matchAll(/"([a-z_]+)"/g)].map(
    (match) => match[1],
  );
}

describe("sos-generate function contract", () => {
  test("pins its Deno config to the verified @supabase/server release", () => {
    expect(denoConfig.imports?.["@supabase/server"]).toBe(
      "npm:@supabase/server@1.5.3",
    );
    expect(denoConfig.compilerOptions?.strict).toBe(true);
    expect(normalized).toContain('from "@supabase/server"');
    expect(source).not.toMatch(/@supabase\/server@(?!1\.5\.3)/);
  });

  test("requires an authenticated caller and takes the user id from verified claims", () => {
    // Typed against a schema, so `deno check` catches a wrong column or RPC
    // name instead of the query builder degrading to `never`.
    expect(normalized).toContain(
      'createSupabaseContext<Database>(req, { auth: "user" })',
    );
    expect(normalized).toContain("claim_generation_job: { Args: {");
    expect(normalized).toContain("ctx.userClaims?.id");
    expect(normalized).toContain(
      "return jsonResponse({ error: UNAUTHORIZED_ERROR }, 401);",
    );
    // The redundant round trip to auth.getUser is gone; claims are verified.
    expect(normalized).not.toContain("auth.getUser()");
  });

  test("answers 401 only for a rejected credential and 500 for a broken context", () => {
    expect(normalized).toContain("contextError.status === 401");
    expect(normalized).toContain(
      'contextError.status === 401 ? "auth_rejected" : "auth_unavailable"',
    );
    expect(normalized).toContain(
      "return jsonResponse({ error: FAILED_ERROR }, 500);",
    );
  });

  test("never accepts a caller-supplied user id", () => {
    expect(normalized).not.toMatch(/user_id:\s*(body|input|payload|request)/);
  });

  test("dispatches by kind through a handler record", () => {
    expect(normalized).toContain(
      'const SUPPORTED_KINDS = ["food_swaps"] as const;',
    );
    expect(normalized).toContain(
      "const KIND_HANDLERS: Record<SosGenerateKind, KindHandler> = { food_swaps: prepareFoodSwaps, };",
    );
    expect(normalized).toContain("const handler = KIND_HANDLERS[kind];");
    expect(normalized).toContain(
      "return jsonResponse({ error: BAD_REQUEST_ERROR }, 400);",
    );
  });

  test("reads food rules from profiles and refuses when they are unset", () => {
    expect(normalized).toContain('.from("profiles")');
    expect(normalized).toContain(
      '.select("food_rules_set, diet_flags, allergens")',
    );
    expect(normalized).toContain("profile.food_rules_set !== true");
    expect(normalized).toContain("status: 403, error: FOOD_RULES_ERROR");
  });

  test("treats the stored profile as authoritative and only widens restrictions", () => {
    expect(normalized).toContain("unionDietFlags(");
    expect(normalized).toContain("unionAllergens(");
    expect(normalized).toContain("profile.diet_flags");
    expect(normalized).toContain("profile.allergens");
  });

  test("claims the job through the atomic rate-limited RPC before any provider call", () => {
    expect(normalized).toMatch(/\.rpc\( ?"claim_generation_job",/);
    expect(normalized).toContain("job_kind: kind");
    expect(normalized).toContain("diet_flag_count: prepared.dietFlagCount");
    expect(normalized).toContain("allergen_count: prepared.allergenCount");
    // Counting in the function and inserting afterwards is the race this replaces.
    expect(normalized).not.toContain('{ count: "exact", head: true }');
    expect(normalized).not.toContain('status: "pending"');

    const rateLimit = normalized.indexOf(
      "return jsonResponse({ error: RATE_LIMIT_ERROR }, 429);",
    );
    expect(rateLimit).toBeGreaterThan(-1);
    expect(rateLimit).toBeLessThan(normalized.indexOf("api.openai.com"));
    expect(rateLimit).toBeLessThan(normalized.indexOf("prepared.run()"));
    expect(normalized.indexOf('"claim_generation_job",')).toBeLessThan(
      rateLimit,
    );
  });

  test("sends only metadata counts to the claim, never craving or allergen text", () => {
    const claimCall = normalized.match(
      /\.rpc\( ?"claim_generation_job", \{[^}]*\}/,
    );
    expect(claimCall).not.toBeNull();
    for (const forbidden of ["craving", "allergens:", "diet_flags:", "label"]) {
      expect((claimCall as RegExpMatchArray)[0]).not.toContain(forbidden);
    }
  });

  test("recovers this member's stranded pending jobs before claiming a new one", () => {
    expect(normalized).toContain("const STALE_JOB_MS =");
    expect(normalized).toContain("async function sweepStalePendingJobs(");
    expect(normalized).toContain('.eq("status", "pending")');
    expect(normalized).toContain('.lt("created_at", staleBefore)');
    expect(normalized.indexOf("await sweepStalePendingJobs(")).toBeLessThan(
      normalized.indexOf('"claim_generation_job",'),
    );
  });

  test("finishes the job with the service-role client, scoped to owner and id", () => {
    expect(normalized).toContain("ctx.supabaseAdmin");
    expect(normalized).toContain('.update({ status: "succeeded"');
    expect(normalized).toContain('status: "failed"');
    expect(
      normalized.match(/\.eq\("id", jobId\)/g)?.length,
    ).toBeGreaterThanOrEqual(2);
    expect(
      normalized.match(/\.eq\("user_id", userId\)/g)?.length,
    ).toBeGreaterThanOrEqual(3);
  });

  test("returns the job envelope with the handler output", () => {
    expect(normalized).toContain("const MAX_SWAPS = 4;");
    expect(normalized).toContain(
      'jsonResponse({ job_id: jobId, status: "succeeded", output }, 200)',
    );
    expect(normalized).toContain("if (swaps.length < MAX_SWAPS)");
    expect(normalized).toContain("if (chosen.length === MAX_SWAPS) break;");
  });

  test("applies the same diet tag rules as the client, and a stricter allergen match", () => {
    const tagPattern = /tag === "([a-z_]+)"/g;
    const dietPattern = /dietFlags\.includes\("([a-z_]+)"\)/g;

    // Pinned so the comparison below can never pass on two empty matches.
    expect(uniqueMatches(clientRules, tagPattern)).toEqual([
      "dairy",
      "eggs",
      "fish",
      "gluten",
      "meat",
      "nuts",
      "peanuts",
    ]);
    expect(uniqueMatches(clientRules, dietPattern)).toEqual([
      "dairy_free",
      "gluten_free",
      "nut_free",
      "vegan",
      "vegetarian",
    ]);
    expect(uniqueMatches(source, tagPattern)).toEqual(
      uniqueMatches(clientRules, tagPattern),
    );
    expect(uniqueMatches(source, dietPattern)).toEqual(
      uniqueMatches(clientRules, dietPattern),
    );
    // The client compares raw strings; the server stems and tokenizes first.
    expect(normalized).toContain("allergenHitsText(rules, tag)");
  });

  test("infers rule tags from the label so empty model tags cannot bypass a rule", () => {
    expect(normalized).toContain(
      "const TAG_KEYWORDS: Record<string, string[]>",
    );
    expect(normalized).toContain("function inferRuleTags(label: string)");
    expect(normalized).toContain(
      "ruleTags: unionRuleTags(swap.ruleTags, swap.label)",
    );
    // The predicate itself infers, so no caller can be answered on model tags.
    expect(normalized).toContain(
      "const tags = unionRuleTags(swap.ruleTags, swap.label);",
    );

    const keywords = source.slice(
      source.indexOf("const TAG_KEYWORDS"),
      source.indexOf("function inferRuleTags"),
    );
    for (const [tag, keyword] of [
      ["dairy", "cheese"],
      ["gluten", "bread"],
      ["meat", "bacon"],
      ["fish", "salmon"],
      ["eggs", "omelet"],
      ["nuts", "almond"],
      ["peanuts", "peanut"],
    ] as const) {
      expect(keywords).toContain(`${tag}: [`);
      expect(keywords).toContain(`"${keyword}"`);
    }
  });

  test("stems singular and plural forms on both sides of an allergen match", () => {
    expect(normalized).toContain("function singularize(word: string): string");
    expect(normalized).toContain("function tokenize(text: string): string[]");
    expect(normalized).toContain(
      "function tokensContain(haystack: string[], needle: string[]): boolean",
    );
    // Multi-word allergens must match as a contiguous token run, not a substring.
    expect(normalized).toContain("needle.length <= haystack.length");
    expect(normalized).toContain(
      "allergenTokens: allergens.map((allergen) => tokenize(allergen))",
    );
    // Token runs alone let an allergen hide inside a compound word ("egg" in
    // "Eggnog"), so a single-token allergen also matches the squashed text.
    expect(normalized).toContain(
      "export function squash(text: string): string",
    );
    expect(normalized).toContain("const MIN_SQUASHED_ALLERGEN = 3;");
    expect(normalized).toContain(
      "compact.length >= MIN_SQUASHED_ALLERGEN && squashed.includes(compact)",
    );
    // Multi-word allergens keep contiguous-token matching only.
    expect(normalized).toContain("if (allergen.length !== 1) return false;");
  });

  test("drops unsafe candidates and backfills only untagged safe swaps", () => {
    expect(normalized).toContain("if (!swapIsSafe(tagged, rules)) continue;");
    for (const label of [
      "Apple slices",
      "Sparkling water",
      "Herbal tea",
      "Carrot sticks",
    ]) {
      expect(normalized).toContain(`{ label: "${label}", ruleTags: [] }`);
    }
    expect(normalized).toContain("allergenHitsText(rules, swap.label)");
  });

  test("deduplicates swap labels case-insensitively", () => {
    expect(normalized).toContain("const key = swap.label.toLowerCase();");
    expect(normalized).toContain("if (seen.has(key)) continue;");
  });

  test("bounds the provider call with a timeout and a token ceiling", () => {
    expect(normalized).toContain("const PROVIDER_TIMEOUT_MS = 20_000;");
    expect(normalized).toContain("const PROVIDER_MAX_TOKENS = 300;");
    expect(normalized).toContain(
      "signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS)",
    );
    expect(normalized).toContain("max_completion_tokens: PROVIDER_MAX_TOKENS,");
  });

  test("frames the craving as untrusted data rather than instructions", () => {
    expect(normalized).toContain("const MEMBER_DATA_OPEN =");
    expect(normalized).toContain("const MEMBER_DATA_CLOSE =");
    expect(source).toContain("never as instructions");
    expect(normalized).toContain("function fenceMemberData(");
    // Markers cannot be closed early from inside the craving label.
    expect(normalized).toContain('.replace(/[<>]/g, " ")');
  });

  test("reads the provider key from Deno env and ships no other key path", () => {
    expect(normalized).toContain('Deno.env.get("OPENAI_API_KEY")');
    expect(uniqueMatches(source, /Deno\.env\.get\("([A-Z_]+)"\)/g)).toEqual([
      "OPENAI_API_KEY",
      "OPENAI_MODEL",
    ]);
    expect(source).not.toMatch(/sk-[A-Za-z0-9]/);
    expect(source).not.toContain("SERVICE_ROLE");
    expect(source).not.toContain("EXPO_PUBLIC");
  });

  test("allows the Supabase client header on preflight", () => {
    expect(normalized).toContain(
      '"Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info"',
    );
  });

  test("prompts for satisfying, non-medical swaps that obey the food rules", () => {
    expect(source).toContain("similar satisfaction");
    expect(source).toContain("Never make medical claims");
    expect(source).toContain("Obey every diet flag and allergen");
  });

  test("logs only job ids, kinds, statuses, and closed-set categories", () => {
    const calls = consoleCalls(source);
    expect(calls.length).toBeGreaterThan(0);

    const allowedKeys = ["job_id", "kind", "status", "category"];
    const categories = logCategories();
    expect(categories.length).toBeGreaterThan(0);

    for (const call of calls) {
      const args = call.slice(call.indexOf("(") + 1, call.lastIndexOf(")"));
      expect(args.startsWith("JSON.stringify({")).toBe(true);

      const keys = [...args.matchAll(/([a-z_]+):/g)].map((match) => match[1]);
      expect(keys.length).toBeGreaterThan(0);
      for (const key of keys) {
        expect(allowedKeys).toContain(key);
      }

      // Every value is an allowed identifier or a literal from a closed set.
      for (const value of [...args.matchAll(/: "([^"]*)"/g)].map((m) => m[1])) {
        expect([...categories, "succeeded", "failed", "rejected"]).toContain(
          value,
        );
      }
      for (const value of [...args.matchAll(/: ([a-zA-Z]+)[,}]/g)].map(
        (m) => m[1],
      )) {
        expect(["jobId", "kind", "status", "category"]).toContain(value);
      }
    }

    // Categories are short opaque tokens, so no private value can ride along.
    for (const category of categories) {
      expect(category).toMatch(/^[a-z][a-z_]{2,30}$/);
    }
  });

  test("returns only static error copy that cannot echo private inputs", () => {
    const errorCopy = [
      ...normalized.matchAll(/const [A-Z_]+_ERROR = ([^;]+);/g),
    ].map((match) => match[1]);
    expect(errorCopy.length).toBeGreaterThanOrEqual(5);

    for (const copy of errorCopy) {
      expect(copy).not.toContain("${");
      expect(copy).not.toContain("+");
      expect(copy.trim().startsWith('"')).toBe(true);
    }
    expect(normalized).not.toMatch(/jsonResponse\(\{[^;]*\$\{/);
  });

  test("keeps provider and service-role secrets out of the mobile app", () => {
    expect(client).not.toMatch(/OPENAI|SERVICE_ROLE|supabaseAdmin/);
    for (const line of envExample.split("\n").filter((entry) => entry.trim())) {
      expect(line.startsWith("EXPO_PUBLIC_")).toBe(true);
    }
  });
});
