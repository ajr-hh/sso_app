import type { SupabaseClient } from "@supabase/supabase-js";

type AuthClient = Pick<SupabaseClient["auth"], "signInWithOtp" | "verifyOtp">;

export const OTP_LENGTH = 6;

export function normalizeCode(input: string): string {
  return input.replace(/\D/g, "").slice(0, OTP_LENGTH);
}

export function isCompleteCode(input: string): boolean {
  return normalizeCode(input).length === OTP_LENGTH;
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

  if (token.length !== OTP_LENGTH) {
    throw new Error(`Enter the ${OTP_LENGTH}-digit code from your email.`);
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
