import { MessagesView } from "@/components/messages-view";
import { getAppUser } from "@/lib/user";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const user = await getAppUser();
  return <MessagesView coachStyle={user.coachStyle} />;
}
