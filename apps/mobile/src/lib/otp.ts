import type { SupabaseClient } from "@supabase/supabase-js";

type AuthClient = Pick<SupabaseClient["auth"], "signInWithOtp" | "verifyOtp">;

// Supabase issues 6-10 digit codes; the exact length is a project setting
// (Authentication -> Sign In / Providers -> Email -> Email OTP length), so the
// client accepts the whole range rather than assuming one length.
export const OTP_MIN_LENGTH = 6;
export const OTP_MAX_LENGTH = 10;

export function normalizeCode(input: string): string {
  return input.replace(/\D/g, "").slice(0, OTP_MAX_LENGTH);
}

export function isCompleteCode(input: string): boolean {
  return normalizeCode(input).length >= OTP_MIN_LENGTH;
}

export async function sendEmailCode(
  auth: AuthClient,
  email: string,
): Promise<void> {
  const { error } = await auth.signInWithOtp({
    email: email.trim(),
    options: { shouldCreateUser: true },
  });

  if (error) {
    throw error;
  }
}

export async function verifyEmailCode(
  auth: AuthClient,
  email: string,
  code: string,
): Promise<void> {
  const token = normalizeCode(code);

  if (token.length < OTP_MIN_LENGTH) {
    throw new Error("Enter the code from your email.");
  }

  const { error } = await auth.verifyOtp({
    email: email.trim(),
    token,
    type: "email",
  });

  if (error) {
    throw error;
  }
}
