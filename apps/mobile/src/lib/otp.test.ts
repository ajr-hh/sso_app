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
    ["73652313", "73652313"],
    ["12345678901", "1234567890"],
    ["12a34b56", "123456"],
    ["", ""],
  ])("normalizes %p to %p", (input, expected) => {
    expect(normalizeCode(input)).toBe(expected);
  });
});

describe("isCompleteCode", () => {
  // Supabase projects issue 6-10 digit codes depending on Email OTP length.
  test.each([
    ["123 456", true],
    ["73652313", true],
    ["1234567890", true],
    ["12345", false],
    ["", false],
  ])("treats %p as complete: %p", (input, expected) => {
    expect(isCompleteCode(input)).toBe(expected);
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

  test("verifies a longer code from a project configured for more digits", async () => {
    const verifyOtp = jest.fn().mockResolvedValue({ error: null });

    await verifyEmailCode(
      { signInWithOtp: jest.fn(), verifyOtp },
      "member@example.com",
      "73652313",
    );

    expect(verifyOtp).toHaveBeenCalledWith({
      email: "member@example.com",
      token: "73652313",
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
    ).rejects.toThrow("Enter the code from your email.");

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
