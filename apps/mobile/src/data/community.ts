import { initialsFromName } from "../lib/domain";
import { getSupabase } from "../lib/supabase";

export type CommunityPost = {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  display_name: string;
  initials: string;
};

type PostRow = Omit<CommunityPost, "display_name" | "initials">;

async function requireUserId(): Promise<string> {
  const { data, error } = await getSupabase().auth.getUser();

  if (error) {
    throw new Error(error.message);
  }

  if (!data.user) {
    throw new Error("You must be signed in to use the community.");
  }

  return data.user.id;
}

export async function fetchPosts(): Promise<CommunityPost[]> {
  await requireUserId();
  const supabase = getSupabase();
  const { data: posts, error: postsError } = await supabase
    .from("community_posts")
    .select("id, user_id, body, created_at")
    .order("created_at", { ascending: false });

  if (postsError) {
    throw new Error(postsError.message);
  }

  const postRows = (posts ?? []) as PostRow[];
  if (postRows.length === 0) {
    return [];
  }

  const userIds = [...new Set(postRows.map((post) => post.user_id))];
  const { data: profiles, error: profilesError } = await supabase
    .from("community_profiles")
    .select("id, display_name")
    .in("id", userIds);

  if (profilesError) {
    throw new Error(profilesError.message);
  }

  const names = new Map(
    (profiles ?? []).map((profile) => [
      profile.id,
      profile.display_name?.trim() || "Community member",
    ]),
  );

  return postRows.map((post) => {
    const displayName = names.get(post.user_id) ?? "Community member";

    return {
      ...post,
      display_name: displayName,
      initials: initialsFromName(displayName),
    };
  });
}

export async function createPost(body: string): Promise<void> {
  const userId = await requireUserId();
  const { error } = await getSupabase().from("community_posts").insert({
    user_id: userId,
    body,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function deletePost(id: string): Promise<void> {
  const userId = await requireUserId();
  const { error } = await getSupabase()
    .from("community_posts")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }
}
