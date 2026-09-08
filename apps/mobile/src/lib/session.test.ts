import { signOut } from "./session";
import { getSupabase } from "./supabase";

jest.mock("./supabase", () => ({
  getSupabase: jest.fn(),
}));

const mockedGetSupabase = jest.mocked(getSupabase);

describe("signOut", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("ends the supabase session", async () => {
    const authSignOut = jest.fn().mockResolvedValue({ error: null });
    mockedGetSupabase.mockReturnValue({
      auth: { signOut: authSignOut },
    } as never);

    await signOut();

    expect(authSignOut).toHaveBeenCalledTimes(1);
  });

  test("throws when supabase cannot sign out", async () => {
    const expected = new Error("session already expired");
    mockedGetSupabase.mockReturnValue({
      auth: { signOut: jest.fn().mockResolvedValue({ error: expected }) },
    } as never);

    await expect(signOut()).rejects.toBe(expected);
  });
});
