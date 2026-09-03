import type { SupabaseClient } from "@supabase/supabase-js";

type AuthClient = Pick<
  SupabaseClient["auth"],
  "exchangeCodeForSession" | "setSession"
>;

export async function completeAuthFromUrl(
  auth: AuthClient,
  url: string,
): Promise<void> {
  const parsedUrl = new URL(url);
  const hashParams = new URLSearchParams(parsedUrl.hash.slice(1));
  const callbackError =
    parsedUrl.searchParams.get("error_description") ??
    hashParams.get("error_description") ??
    parsedUrl.searchParams.get("error") ??
    hashParams.get("error");

  if (callbackError) {
    throw new Error(callbackError);
  }

  const code = parsedUrl.searchParams.get("code");

  if (code) {
    const { error } = await auth.exchangeCodeForSession(code);

    if (error) {
      throw error;
    }

    return;
  }

  const accessToken =
    parsedUrl.searchParams.get("access_token") ??
    hashParams.get("access_token");
  const refreshToken =
    parsedUrl.searchParams.get("refresh_token") ??
    hashParams.get("refresh_token");

  if (accessToken && refreshToken) {
    const { error } = await auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error) {
      throw error;
    }
  }
}
