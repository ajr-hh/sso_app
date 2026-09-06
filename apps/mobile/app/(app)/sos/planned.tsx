import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

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
import { addTask, taskDayKey } from "../../../src/data/tasks";
import { addDays, orderRails, type RailId } from "../../../src/lib/domain";
import { explainError } from "../../../src/lib/errors";
import { createRailOrderSync } from "../../../src/presentation/rails";
import {
  CHECK_IN_DONE,
  CHECK_IN_LABEL,
  CHECK_IN_SAVING_LABEL,
  getCheckInTaskLabel,
  UPCOMING_EVENTS,
  type UpcomingEvent,
} from "../../../src/presentation/planned";
import { colors } from "../../../src/theme/colors";
import type { Profile } from "../../../src/types";

const EYEBROW = "PLAN AHEAD";
const TITLE = "Let’s plan ahead";
const SUBTITLE =
  "We have time here. We’re not trying to stop this, just help you make a few smart decisions.";

export default function PlannedScreen() {
  const orderSync = useRef(createRailOrderSync());
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [event, setEvent] = useState<UpcomingEvent | null>(null);
  const [checkInSaving, setCheckInSaving] = useState(false);
  const [checkInSet, setCheckInSet] = useState(false);
  const [checkInError, setCheckInError] = useState<string | null>(null);

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
      <SosScreen eyebrow={EYEBROW} showBack title={TITLE}>
        <SosLoading label="Building your event plan…" />
      </SosScreen>
    );
  }

  if (!profile) {
    return (
      <SosScreen eyebrow={EYEBROW} showBack title={TITLE}>
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

  const setCheckIn = async () => {
    if (checkInSaving) return;

    setCheckInSaving(true);
    setCheckInError(null);
    try {
      await addTask(getCheckInTaskLabel(event), addDays(taskDayKey(), 1));
      setCheckInSet(true);
    } catch (caughtError) {
      setCheckInError(explainError(caughtError));
    } finally {
      setCheckInSaving(false);
    }
  };

  return (
    <SosScreen eyebrow={EYEBROW} showBack subtitle={SUBTITLE} title={TITLE}>
      {error ? <ErrorBanner message={error} /> : null}

      <SosCard>
        <Text style={sosTextStyles.sectionTitle}>What’s coming up?</Text>
        <View style={styles.eventRow}>
          {UPCOMING_EVENTS.map((option) => {
            const selected = option === event;

            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected }}
                key={option}
                // Choosing the same one again clears it, so nobody is stuck
                // with an event they tapped by accident.
                onPress={() => setEvent(selected ? null : option)}
                style={({ pressed }) => [
                  styles.eventChip,
                  selected && styles.eventChipSelected,
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.eventChipText,
                    selected && styles.eventChipTextSelected,
                  ]}
                >
                  {option}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </SosCard>

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

      {checkInError ? <ErrorBanner message={checkInError} /> : null}
      <SosButton
        disabled={checkInSaving || checkInSet}
        label={
          checkInSet
            ? CHECK_IN_DONE
            : checkInSaving
              ? CHECK_IN_SAVING_LABEL
              : CHECK_IN_LABEL
        }
        onPress={() => void setCheckIn()}
        size="large"
      />
      {checkInSet ? (
        <Text
          accessibilityLiveRegion={
            Platform.OS === "android" ? "polite" : "none"
          }
          role="status"
          style={styles.checkInNote}
        >
          It’s waiting in tomorrow’s tasks.
        </Text>
      ) : null}
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
  eventRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  eventChip: {
    alignItems: "center",
    backgroundColor: colors.canvas,
    borderColor: "#DCDEDE",
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 16,
  },
  eventChipSelected: {
    backgroundColor: colors.emberTint,
    borderColor: colors.ember,
  },
  eventChipText: { color: colors.ink, fontSize: 15, fontWeight: "700" },
  eventChipTextSelected: { color: colors.alert },
  pressed: { opacity: 0.72 },
  checkInNote: { color: colors.body, fontSize: 14, textAlign: "center" },
});
