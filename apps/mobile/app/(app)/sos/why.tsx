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

export default function WhyScreen() {
  const router = useRouter();
  const path = useSosPath();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <SosScreen
      eyebrow="REMEMBER YOUR WHY"
      subtitle="Your personal reinforcement photos will live here."
      title="Reconnect with your reason"
    >
      {error ? <ErrorBanner message={error} /> : null}
      <SosCard>
        <Text style={sosTextStyles.sectionTitle}>photos in next task</Text>
        <Text style={sosTextStyles.body}>
          Photo capture arrives in Task 12. You can skip this reinforcement for
          now and choose another.
        </Text>
      </SosCard>
      <SosButton
        disabled={busy}
        label={busy ? "Saving…" : "Skip for now"}
        onPress={async () => {
          setBusy(true);
          setError(null);
          try {
            await logSosEvent(path, "why_skip");
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
