import * as Linking from "expo-linking";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
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

export default function CallScreen() {
  const path = useSosPath();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void logSosEvent(path, "call").catch((caughtError) => {
        if (active) {
          setError(explainError(caughtError));
        }
      });
      return () => {
        active = false;
      };
    }, [path]),
  );

  return (
    <SosScreen
      eyebrow="TALK TO SOMEONE"
      showBack
      subtitle="You do not have to solve this moment alone."
      title="Call someone safe"
    >
      {error ? <ErrorBanner message={error} /> : null}
      <SosCard>
        <Text style={sosTextStyles.sectionTitle}>Choose one steady person</Text>
        <Text style={sosTextStyles.body}>
          Think of someone who listens without judging: a partner, friend,
          family member, sponsor, or coach.
        </Text>
        <Text style={sosTextStyles.strong}>
          “I’m having a hard moment. Can you stay on the phone with me for a few
          minutes?”
        </Text>
      </SosCard>
      <SosButton
        disabled={busy}
        label={busy ? "Opening phone…" : "Open phone"}
        onPress={async () => {
          setBusy(true);
          setError(null);
          try {
            const canCall = await Linking.canOpenURL("tel:");
            if (!canCall) {
              setError(
                "Phone calls are not available on this device. Please call someone safe from another phone.",
              );
              return;
            }
            await Linking.openURL("tel:");
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
