import { explainError } from "./errors";

describe("explainError", () => {
  test.each([
    [new Error("OTP token expired"), "That link expired. Request a new one."],
    [new Error("Network request failed"), "Couldn't reach the server. Check your connection."],
    [new TypeError("Failed to fetch"), "Couldn't reach the server. Check your connection."],
    [new Error("Invalid login"), "Error: Invalid login"],
    [null, "Something went wrong."],
  ])("maps %p to a user-facing message", (error, expected) => {
    expect(explainError(error)).toBe(expected);
  });
});
