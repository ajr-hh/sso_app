import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
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
import { fetchProfile, saveRailOrder } from "../../../src/data/profile";
import { orderRails, type RailId } from "../../../src/lib/domain";
import { explainError } from "../../../src/lib/errors";
import { createRailOrderSync } from "../../../src/presentation/rails";
import { colors } from "../../../src/theme/colors";
import type { Profile } from "../../../src/types";

export default function PlannedScreen() {
  const orderSync = useRef(createRailOrderSync());
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = orderSync.current.beginLoad();
    setError(null);
    try {
      const loaded = await fetchProfile();
      // A reorder saved since this fetch started is the newer truth.
      if (orderSync.current.shouldApplyLoad(token)) {
        setProfile(loaded);
      }
    } catch (caughtError) {
      if (orderSync.current.shouldApplyLoad(token)) {
        setError(explainError(caughtError));
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (!profile && !error) {
    return (
      <SosScreen eyebrow="PLAN AHEAD" showBack title="Set yourself up">
        <SosLoading label="Building your event plan…" />
      </SosScreen>
    );
  }

  if (!profile) {
    return (
      <SosScreen eyebrow="PLAN AHEAD" showBack title="Set yourself up">
        {error ? <ErrorBanner message={error} /> : null}
        <SosButton label="Try again" onPress={load} />
      </SosScreen>
    );
  }

  const rails = orderRails(profile.rail_order);

  const persistOrder = async (ids: RailId[]) => {
    const previousOrder = profile.rail_order;
    const token = orderSync.current.beginSave();
    setError(null);
    setProfile((current) => (current ? { ...current, rail_order: ids } : current));
    try {
      await saveRailOrder(ids);
    } catch (caughtError) {
      // Only undo this save while it is still the order on screen.
      if (orderSync.current.shouldRollbackSave(token)) {
        setProfile((current) =>
          current ? { ...current, rail_order: previousOrder } : current,
        );
      }
      setError(explainError(caughtError));
      throw caughtError;
    } finally {
      orderSync.current.finishSave(token);
    }
  };

  return (
    <SosScreen
      eyebrow="PLAN AHEAD"
      showBack
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
        onOrderChange={persistOrder}
        path="planned_event"
        rails={rails}
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
