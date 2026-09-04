import {
  isCompleteCode,
  normalizeCode,
  sendEmailCode,
  verifyEmailCode,
} from "./otp";

describe("normalizeCode", () => {
  test.each([
    ["123456", "123456"],
    ["123 456", "123456"],
    ["123-456", "123456"],
    ["1234567", "123456"],
    ["12a34b56", "123456"],
    ["", ""],
  ])("normalizes %p to %p", (input, expected) => {
    expect(normalizeCode(input)).toBe(expected);
  });
});

describe("isCompleteCode", () => {
  test("accepts six digits", () => {
    expect(isCompleteCode("123 456")).toBe(true);
  });

  test("rejects a short code", () => {
    expect(isCompleteCode("12345")).toBe(false);
  });
});

describe("sendEmailCode", () => {
  test("requests a code for the trimmed email", async () => {
    const signInWithOtp = jest.fn().mockResolvedValue({ error: null });

    await sendEmailCode(
      { signInWithOtp, verifyOtp: jest.fn() },
      "  member@example.com ",
    );

    expect(signInWithOtp).toHaveBeenCalledWith({
      email: "member@example.com",
      options: { shouldCreateUser: true },
    });
  });

  test("throws Supabase errors", async () => {
    const expected = new Error("Email rate limit exceeded");

    await expect(
      sendEmailCode(
        {
          signInWithOtp: jest.fn().mockResolvedValue({ error: expected }),
          verifyOtp: jest.fn(),
        },
        "member@example.com",
      ),
    ).rejects.toBe(expected);
  });
});

describe("verifyEmailCode", () => {
  test("verifies the digits of the entered code", async () => {
    const verifyOtp = jest.fn().mockResolvedValue({ error: null });

    await verifyEmailCode(
      { signInWithOtp: jest.fn(), verifyOtp },
      "  member@example.com ",
      "123 456",
    );

    expect(verifyOtp).toHaveBeenCalledWith({
      email: "member@example.com",
      token: "123456",
      type: "email",
    });
  });

  test("rejects an incomplete code without calling Supabase", async () => {
    const verifyOtp = jest.fn();

    await expect(
      verifyEmailCode(
        { signInWithOtp: jest.fn(), verifyOtp },
        "member@example.com",
        "12345",
      ),
    ).rejects.toThrow("Enter the 6-digit code from your email.");

    expect(verifyOtp).not.toHaveBeenCalled();
  });

  test("throws Supabase errors", async () => {
    const expected = new Error("Token has expired or is invalid");

    await expect(
      verifyEmailCode(
        {
          signInWithOtp: jest.fn(),
          verifyOtp: jest.fn().mockResolvedValue({ error: expected }),
        },
        "member@example.com",
        "123456",
      ),
    ).rejects.toBe(expected);
  });
});
