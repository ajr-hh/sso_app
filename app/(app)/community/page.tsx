import { CommunityView } from "@/components/community-view";
import { getAppUser } from "@/lib/user";

export const dynamic = "force-dynamic";

export default async function CommunityPage() {
  const user = await getAppUser();
  return (
    <CommunityView
      posts={user.communityPosts.map((post) => ({
        id: post.id,
        authorName: post.authorName,
        initials: post.initials,
        text: post.text,
      }))}
      memberCount={user.challenges[0]?.members ?? 1}
    />
  );
}
