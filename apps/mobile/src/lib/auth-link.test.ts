import { completeAuthFromUrl } from "./auth-link";

describe("completeAuthFromUrl", () => {
  test("exchanges a PKCE code for a session", async () => {
    const exchangeCodeForSession = jest.fn().mockResolvedValue({ error: null });
    const setSession = jest.fn();

    await completeAuthFromUrl(
      {
        exchangeCodeForSession,
        setSession,
      },
      "humanaut-sos://?code=pkce-code",
    );

    expect(exchangeCodeForSession).toHaveBeenCalledWith("pkce-code");
    expect(setSession).not.toHaveBeenCalled();
  });

  test("sets a session from implicit-flow URL tokens", async () => {
    const exchangeCodeForSession = jest.fn();
    const setSession = jest.fn().mockResolvedValue({ error: null });

    await completeAuthFromUrl(
      {
        exchangeCodeForSession,
        setSession,
      },
      "humanaut-sos://#access_token=access&refresh_token=refresh",
    );

    expect(setSession).toHaveBeenCalledWith({
      access_token: "access",
      refresh_token: "refresh",
    });
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
  });

  test("throws Supabase exchange errors", async () => {
    const expected = new Error("OTP token expired");

    await expect(
      completeAuthFromUrl(
        {
          exchangeCodeForSession: jest
            .fn()
            .mockResolvedValue({ error: expected }),
          setSession: jest.fn(),
        },
        "humanaut-sos://?code=expired",
      ),
    ).rejects.toBe(expected);
  });

  test("throws errors returned in the auth callback URL", async () => {
    await expect(
      completeAuthFromUrl(
        {
          exchangeCodeForSession: jest.fn(),
          setSession: jest.fn(),
        },
        "humanaut-sos://#error=access_denied&error_description=OTP+token+expired",
      ),
    ).rejects.toThrow("OTP token expired");
  });
});
