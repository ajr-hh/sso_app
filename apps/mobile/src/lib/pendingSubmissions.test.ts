import { createPendingSubmissions } from "./pendingSubmissions";

describe("pending submissions", () => {
  test("claims a submission once while it stays in flight", () => {
    const pending = createPendingSubmissions();

    expect(pending.claim("Read")).toBe(true);
    expect(pending.claim("Read")).toBe(false);
    expect(pending.isPending("Read")).toBe(true);
  });

  test("allows a different submission while one is in flight", () => {
    const pending = createPendingSubmissions();

    pending.claim("Read");

    expect(pending.claim("Walk")).toBe(true);
  });

  test("allows a retry after the submission is released", () => {
    const pending = createPendingSubmissions();

    pending.claim("Read");
    pending.release("Read");

    expect(pending.isPending("Read")).toBe(false);
    expect(pending.claim("Read")).toBe(true);
  });

  test("ignores releasing a submission that was never claimed", () => {
    const pending = createPendingSubmissions();

    expect(() => pending.release("Read")).not.toThrow();
    expect(pending.claim("Read")).toBe(true);
  });
});
