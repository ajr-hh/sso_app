import { useFocusEffect, useRouter } from "expo-router";
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
import { STATS } from "../../../src/content/stats";
import { logSosEvent } from "../../../src/data/sos";
import { explainError } from "../../../src/lib/errors";

export default function StatsScreen() {
  const router = useRouter();
  const path = useSosPath();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void logSosEvent(path, "stats_view").catch((caughtError) => {
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
      eyebrow="THE NUMBERS"
      subtitle="Use the facts as a pause, not as a judgment."
      title="Your next choice matters"
    >
      {error ? <ErrorBanner message={error} /> : null}
      {STATS.map((stat) => (
        <SosCard key={stat.title}>
          <Text style={sosTextStyles.number}>{stat.num}</Text>
          <Text style={sosTextStyles.sectionTitle}>{stat.title}</Text>
          <Text style={sosTextStyles.body}>{stat.body}</Text>
        </SosCard>
      ))}
      <SosButton
        disabled={busy}
        label={busy ? "Saving…" : "I’m ready for my next choice"}
        onPress={async () => {
          setBusy(true);
          setError(null);
          try {
            await logSosEvent(path, "stats_cta");
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
