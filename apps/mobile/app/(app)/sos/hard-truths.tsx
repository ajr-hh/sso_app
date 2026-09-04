import { useRouter } from "expo-router";
import { useState } from "react";
import { Text } from "react-native";

import { ErrorBanner } from "../../../components/ErrorBanner";
import {
  SosButton,
  SosCard,
  SosScreen,
  sosTextStyles,
  useSosPath,
} from "../../../components/SosUi";
import { logSosEvent } from "../../../src/data/sos";
import { explainError } from "../../../src/lib/errors";

export default function HardTruthsScreen() {
  const router = useRouter();
  const path = useSosPath();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <SosScreen
      eyebrow="HARD TRUTHS"
      subtitle="Your own photos and words will support this reset."
      title="Remember what changed"
    >
      {error ? <ErrorBanner message={error} /> : null}
      <SosCard>
        <Text style={sosTextStyles.sectionTitle}>photos in next task</Text>
        <Text style={sosTextStyles.body}>
          Task 12 will add member-selected photos, tags, and captions. Nothing
          will be generated for you.
        </Text>
      </SosCard>
      <SosButton
        disabled={busy}
        label={busy ? "Saving…" : "Skip for now"}
        onPress={async () => {
          setBusy(true);
          setError(null);
          try {
            await logSosEvent(path, "hard_truths_skip");
            router.back();
          } catch (caughtError) {
            setError(explainError(caughtError));
          } finally {
            setBusy(false);
          }
        }}
      />
    </SosScreen>
  );
}
