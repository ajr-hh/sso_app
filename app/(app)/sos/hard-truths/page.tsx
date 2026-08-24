import { HardTruthsView } from "@/components/hard-truths-view";
import { withSignedUrls } from "@/lib/photos";
import { getAppUser } from "@/lib/user";

export const dynamic = "force-dynamic";

export default async function HardTruthsPage() {
  const user = await getAppUser();
  const photos = await withSignedUrls(
    user.photos.filter((photo) => photo.mode === "hard_truths"),
  );

  return <HardTruthsView photos={photos} />;
}
