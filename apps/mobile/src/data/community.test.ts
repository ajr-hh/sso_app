import { getSupabase } from "../lib/supabase";
import { createPost, deletePost, fetchPosts } from "./community";

jest.mock("../lib/supabase", () => ({
  getSupabase: jest.fn(),
}));

const mockedGetSupabase = jest.mocked(getSupabase);

describe("community data", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("fetches newest posts with profile names and initials", async () => {
    const posts = [
      {
        id: "post-2",
        user_id: "user-2",
        body: "Keep going.",
        created_at: "2026-09-04T15:00:00.000Z",
      },
      {
        id: "post-1",
        user_id: "user-1",
        body: "One choice at a time.",
        created_at: "2026-09-03T15:00:00.000Z",
      },
    ];
    const postOrder = jest
      .fn()
      .mockResolvedValue({ data: posts, error: null });
    const activePosts = jest.fn().mockReturnValue({ order: postOrder });
    const postSelect = jest.fn().mockReturnValue({ is: activePosts });
    const profileFilter = jest.fn().mockResolvedValue({
      data: [
        { id: "user-1", display_name: "Alex Rivera" },
        { id: "user-2", display_name: "Sam" },
      ],
      error: null,
    });
    const profileSelect = jest.fn().mockReturnValue({ in: profileFilter });
    const from = jest
      .fn()
      .mockReturnValueOnce({ select: postSelect })
      .mockReturnValueOnce({ select: profileSelect });
    mockedGetSupabase.mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
      from,
    } as never);

    await expect(fetchPosts()).resolves.toEqual([
      { ...posts[0], display_name: "Sam", initials: "SA" },
      { ...posts[1], display_name: "Alex Rivera", initials: "AR" },
    ]);
    expect(postSelect).toHaveBeenCalledWith(
      "id, user_id, body, created_at",
    );
    expect(activePosts).toHaveBeenCalledWith("deleted_at", null);
    expect(postOrder).toHaveBeenCalledWith("created_at", {
      ascending: false,
    });
    expect(profileSelect).toHaveBeenCalledWith("id, display_name");
    expect(profileFilter).toHaveBeenCalledWith("id", ["user-2", "user-1"]);
    expect(from).toHaveBeenNthCalledWith(2, "community_profiles");
  });

  test("creates a body-only post for the signed-in member", async () => {
    const insert = jest.fn().mockResolvedValue({ error: null });
    mockedGetSupabase.mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
      from: jest.fn().mockReturnValue({ insert }),
    } as never);

    await expect(createPost("I made it through today.")).resolves.toBe(
      undefined,
    );
    expect(insert).toHaveBeenCalledWith({
      user_id: "user-1",
      body: "I made it through today.",
    });
  });

  test("soft-deletes only an active post owned by the signed-in member", async () => {
    const activeFilter = jest.fn().mockResolvedValue({ error: null });
    const ownerFilter = jest.fn().mockReturnValue({ is: activeFilter });
    const postFilter = jest.fn().mockReturnValue({ eq: ownerFilter });
    const update = jest.fn().mockReturnValue({ eq: postFilter });
    mockedGetSupabase.mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
      from: jest.fn().mockReturnValue({ update }),
    } as never);

    await expect(deletePost("post-1")).resolves.toBe(undefined);
    expect(update).toHaveBeenCalledWith({
      deleted_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T.*Z$/),
    });
    expect(postFilter).toHaveBeenCalledWith("id", "post-1");
    expect(ownerFilter).toHaveBeenCalledWith("user_id", "user-1");
    expect(activeFilter).toHaveBeenCalledWith("deleted_at", null);
  });

  test("propagates post soft-delete failures", async () => {
    const activeFilter = jest.fn().mockResolvedValue({
      error: { message: "Delete failed" },
    });
    mockedGetSupabase.mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
      from: jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({ is: activeFilter }),
          }),
        }),
      }),
    } as never);

    await expect(deletePost("post-1")).rejects.toThrow("Delete failed");
  });

  test("surfaces profile lookup failures", async () => {
    mockedGetSupabase.mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
      from: jest
        .fn()
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            is: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: [
                  {
                    id: "post-1",
                    user_id: "user-1",
                    body: "Hello",
                    created_at: "2026-09-04T15:00:00.000Z",
                  },
                ],
                error: null,
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockResolvedValue({
              data: null,
              error: { message: "Profiles unavailable" },
            }),
          }),
        }),
    } as never);

    await expect(fetchPosts()).rejects.toThrow("Profiles unavailable");
  });
});
