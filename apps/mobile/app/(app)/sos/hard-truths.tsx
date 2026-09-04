import { PhotoComposer } from "../../../components/PhotoComposer";
import { SosScreen, useSosPath } from "../../../components/SosUi";

export default function HardTruthsScreen() {
  const path = useSosPath();

  return (
    <SosScreen
      eyebrow="HARD TRUTHS"
      subtitle="Use your own photo and words to remember what changed."
      title="Remember what changed"
    >
      <PhotoComposer mode="hard_truths" path={path} />
    </SosScreen>
  );
}
