// The Edge Function runs on Deno and cannot be imported into the Jest suite, so
// this is a source contract test: it reads the function as text and asserts the
// auth, rate-limit, filtering, and logging guarantees the client depends on.
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

const source = read("../../../../supabase/functions/sos-generate/index.ts");
const normalized = source.replace(/\s+/g, " ");
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

describe("sos-generate function contract", () => {
  test("requires an authenticated caller and derives the user from the JWT", () => {
    expect(normalized).toContain('createSupabaseContext(req, { auth: "user"');
    expect(normalized).toContain("await ctx.supabase.auth.getUser()");
    expect(normalized).toContain(
      "return jsonResponse({ error: UNAUTHORIZED_ERROR }, 401);",
    );
    expect(normalized).toContain("const userId = user.id;");
  });

  test("never accepts a caller-supplied user id", () => {
    expect(normalized).not.toMatch(/user_id:\s*(body|input|payload|request)/);
    expect(normalized).toContain("user_id: userId");
  });

  test("rejects unsupported kinds with 400", () => {
    expect(normalized).toContain(
      'const SUPPORTED_KINDS = ["food_swaps"] as const;',
    );
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
    expect(normalized).toContain(
      "return jsonResponse({ error: FOOD_RULES_ERROR }, 403);",
    );
  });

  test("treats the stored profile as authoritative and only widens restrictions", () => {
    expect(normalized).toContain("dietFlags: unionDietFlags(");
    expect(normalized).toContain("allergens: unionAllergens(");
    expect(normalized).toContain("profile.diet_flags");
    expect(normalized).toContain("profile.allergens");
  });

  test("caps generation jobs per rolling hour and returns 429 before the provider call", () => {
    expect(normalized).toContain("const MAX_JOBS_PER_HOUR = 10;");
    expect(normalized).toContain("const ROLLING_WINDOW_MS = 60 * 60 * 1000;");
    expect(normalized).toContain('.select("id", { count: "exact", head: true })');
    expect(normalized).toContain('.gte("created_at", windowStart)');
    expect(normalized).toContain("(count ?? 0) >= MAX_JOBS_PER_HOUR");

    const rateLimit = normalized.indexOf(
      "return jsonResponse({ error: RATE_LIMIT_ERROR }, 429);",
    );
    expect(rateLimit).toBeGreaterThan(-1);
    expect(rateLimit).toBeLessThan(normalized.indexOf("api.openai.com"));
    expect(rateLimit).toBeLessThan(normalized.indexOf('status: "pending"'));
  });

  test("inserts the job as pending then finishes it with the service-role client", () => {
    expect(normalized).toContain('.from("generation_jobs")');
    expect(normalized).toContain(
      '.insert({ user_id: userId, kind, status: "pending", input })',
    );
    expect(normalized).toContain("ctx.supabaseAdmin");
    expect(normalized).toContain('.update({ status: "succeeded"');
    expect(normalized).toContain('.update({ status: "failed"');
    expect(normalized.match(/\.eq\("id", jobId\)/g)).toHaveLength(2);
    expect(
      normalized.match(/\.eq\("user_id", userId\)/g)?.length,
    ).toBeGreaterThanOrEqual(2);
  });

  test("returns the job envelope with four swaps", () => {
    expect(normalized).toContain("const MAX_SWAPS = 4;");
    expect(normalized).toContain(
      '{ job_id: jobId, status: "succeeded", output: { swaps } }, 200,',
    );
    expect(normalized).toContain("if (swaps.length < MAX_SWAPS)");
    expect(normalized).toContain("if (chosen.length === MAX_SWAPS) break;");
  });

  test("applies the same diet and allergen tag rules as the client", () => {
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
    expect(normalized).toContain("rules.allergens.includes(tag)");
  });

  test("drops unsafe candidates and backfills only untagged safe swaps", () => {
    expect(normalized).toContain("if (!swapIsSafe(swap, rules)) continue;");
    for (const label of [
      "Apple slices",
      "Sparkling water",
      "Herbal tea",
      "Carrot sticks",
    ]) {
      expect(normalized).toContain(`{ label: "${label}", ruleTags: [] }`);
    }
    expect(normalized).toContain("label.includes(allergen)");
  });

  test("deduplicates swap labels case-insensitively", () => {
    expect(normalized).toContain("const key = swap.label.toLowerCase();");
    expect(normalized).toContain("if (seen.has(key)) continue;");
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

  test("prompts for satisfying, non-medical swaps that obey the food rules", () => {
    expect(source).toContain("similar satisfaction");
    expect(source).toContain("Never make medical claims");
    expect(source).toContain("Obey every diet flag and allergen");
  });

  test("logs job_id, kind, and status only", () => {
    const calls = consoleCalls(source);
    expect(calls.length).toBeGreaterThan(0);

    for (const call of calls) {
      expect(call).toContain("job_id");
      expect(call).toContain("status");
      for (const forbidden of [
        "allergen",
        "diet",
        "craving",
        "input",
        "output",
        "swap",
        "label",
        "prompt",
        "profile",
        "apikey",
        "error",
      ]) {
        expect(call.toLowerCase()).not.toContain(forbidden);
      }
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
