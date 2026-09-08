import { getSupabase } from "../lib/supabase";
import {
  createResearchFact,
  fetchResearchFacts,
  generateResearchFact,
} from "./researchFacts";

jest.mock("../lib/supabase", () => ({
  getSupabase: jest.fn(),
}));

const mockedGetSupabase = jest.mocked(getSupabase);

describe("research facts data", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("loads only this member's active facts", async () => {
    const order = jest.fn().mockResolvedValue({
      data: [
        {
          id: "f1",
          num: "10%",
          title: "A saved fact",
          body: "Stored for this member.",
          source: "ai",
        },
      ],
      error: null,
    });
    const deletedFilter = jest.fn().mockReturnValue({
      order: jest.fn().mockReturnValue({ order }),
    });
    const userFilter = jest.fn().mockReturnValue({ eq: deletedFilter });
    const select = jest.fn().mockReturnValue({ eq: userFilter });
    mockedGetSupabase.mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
      from: jest.fn().mockReturnValue({ select }),
    } as never);

    await expect(fetchResearchFacts()).resolves.toEqual([
      {
        id: "f1",
        num: "10%",
        title: "A saved fact",
        body: "Stored for this member.",
        source: "ai",
      },
    ]);
    expect(select).toHaveBeenCalledWith("id, num, title, body, source");
    expect(userFilter).toHaveBeenCalledWith("user_id", "user-1");
    expect(deletedFilter).toHaveBeenCalledWith("deleted", false);
  });

  test("saves a member fact without putting the text on a job row", async () => {
    const single = jest.fn().mockResolvedValue({
      data: {
        id: "f2",
        num: "12%",
        title: "My fact",
        body: "Something I read.",
        source: "member",
      },
      error: null,
    });
    const select = jest.fn().mockReturnValue({ single });
    const insert = jest.fn().mockReturnValue({ select });
    mockedGetSupabase.mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
      from: jest.fn().mockReturnValue({ insert }),
    } as never);

    await expect(
      createResearchFact({
        num: "12%",
        title: "My fact",
        body: "Something I read.",
        source: "member",
      }),
    ).resolves.toMatchObject({ title: "My fact", source: "member" });
    expect(insert).toHaveBeenCalledWith({
      user_id: "user-1",
      num: "12%",
      title: "My fact",
      body: "Something I read.",
      source: "member",
    });
  });

  test("asks sos-generate for a research fact with a count only", async () => {
    const invoke = jest.fn().mockResolvedValue({
      data: {
        status: "succeeded",
        output: {
          num: "27%",
          title: "Higher heart attack risk",
          body: "Carrying extra weight can raise cardiovascular risk.",
        },
      },
      error: null,
    });
    mockedGetSupabase.mockReturnValue({
      functions: { invoke },
    } as never);

    await expect(generateResearchFact(3)).resolves.toEqual({
      num: "27%",
      title: "Higher heart attack risk",
      body: "Carrying extra weight can raise cardiovascular risk.",
    });
    expect(invoke).toHaveBeenCalledWith("sos-generate", {
      body: {
        kind: "research_fact",
        input: { existing_count: 3 },
      },
    });
    expect(JSON.stringify(invoke.mock.calls[0])).not.toContain("why_matters");
  });
});
