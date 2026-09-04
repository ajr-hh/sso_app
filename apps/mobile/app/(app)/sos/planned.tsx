import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { ErrorBanner } from "../../../components/ErrorBanner";
import {
  RailList,
  SosButton,
  SosCard,
  SosLoading,
  SosScreen,
  sosTextStyles,
} from "../../../components/SosUi";
import { PLANNED_TIPS } from "../../../src/content/planned-tips";
import { fetchProfile } from "../../../src/data/profile";
import { rankRails } from "../../../src/lib/domain";
import { explainError } from "../../../src/lib/errors";
import { colors } from "../../../src/theme/colors";
import type { Profile } from "../../../src/types";

export default function PlannedScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setProfile(await fetchProfile());
    } catch (caughtError) {
      setError(explainError(caughtError));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (!profile && !error) {
    return <SosLoading label="Building your event plan…" />;
  }

  if (!profile) {
    return (
      <SosScreen eyebrow="PLAN AHEAD" title="Set yourself up">
        {error ? <ErrorBanner message={error} /> : null}
        <SosButton label="Try again" onPress={load} />
      </SosScreen>
    );
  }

  return (
    <SosScreen
      eyebrow="PLAN AHEAD"
      subtitle="A few decisions now make the event easier later."
      title="Set yourself up"
    >
      {error ? <ErrorBanner message={error} /> : null}
      <SosCard>
        <Text style={sosTextStyles.sectionTitle}>Before you go</Text>
        {PLANNED_TIPS.map((tip, index) => (
          <View key={tip.icon} style={styles.tip}>
            <Text style={styles.tipNumber}>{index + 1}</Text>
            <Text style={[sosTextStyles.body, styles.tipCopy]}>
              {tip.text}
            </Text>
          </View>
        ))}
      </SosCard>
      <Text style={styles.nextTitle}>Choose a reinforcement</Text>
      <RailList
        path="planned_event"
        rails={rankRails(profile.motivators.split(","))}
      />
    </SosScreen>
  );
}

const styles = StyleSheet.create({
  tip: { alignItems: "flex-start", flexDirection: "row", gap: 12 },
  tipNumber: {
    backgroundColor: colors.emberTint,
    borderRadius: 999,
    color: colors.ember,
    fontSize: 14,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tipCopy: { flex: 1 },
  nextTitle: { color: colors.ink, fontSize: 22, fontWeight: "800" },
});
