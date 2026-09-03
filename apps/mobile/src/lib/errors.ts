const EXPIRED_LINK_MESSAGE = "That link expired. Request a new one.";
const NETWORK_MESSAGE = "Couldn't reach the server. Check your connection.";
const FALLBACK_MESSAGE = "Something went wrong.";

export function explainError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? "");

  if (/expired|otp/i.test(message)) {
    return EXPIRED_LINK_MESSAGE;
  }

  if (error instanceof TypeError || /network/i.test(message)) {
    return NETWORK_MESSAGE;
  }

  return error == null ? FALLBACK_MESSAGE : String(error);
}
