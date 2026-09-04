import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  findNodeHandle,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ErrorBanner } from "../../../components/ErrorBanner";
import {
  MaterialSymbol,
  type MaterialSymbolName,
} from "../../../components/MaterialSymbol";
import { SosScreen as Screen } from "../../../components/SosUi";
import { QUICK_REMINDER, SOS_PATHS } from "../../../src/content/sos-paths";
import { fetchGoals, type Goal } from "../../../src/data/goals";
import { explainError } from "../../../src/lib/errors";
import {
  createGoalsLoad,
  getPathCardLabel,
  getQuickReminderStatus,
  getQuickReminderView,
  nextErrorRevision,
  shouldAnnounceQuickReminderStatus,
  type GoalsFailure,
  PATH_CARD_HINT,
} from "../../../src/presentation/sos";
import { colors } from "../../../src/theme/colors";

export default function SosScreen() {
  const router = useRouter();
  const goalsLoad = useRef(createGoalsLoad());
  const focused = useRef(false);
  const retryToken = useRef<number | null>(null);
  const focusStatus = useRef(false);
  const statusRef = useRef<Text>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState<GoalsFailure | null>(null);

  const loadGoals = useCallback(async (fromRetry = false) => {
    const token = goalsLoad.current.begin();
    if (fromRetry) {
      retryToken.current = token;
    }
    setLoading(true);
    try {
      const nextGoals = await fetchGoals();
      if (!goalsLoad.current.isCurrent(token)) return;
      setGoals(nextGoals);
      setFailure(null);
      if (retryToken.current === token) {
        focusStatus.current = true;
      }
    } catch (caughtError) {
      if (!goalsLoad.current.isCurrent(token)) return;
      const message = explainError(caughtError);
      // The failure stays until a later load succeeds, so the banner and its
      // retry button survive the retry that a screen reader is focused on. Each
      // failure carries its own revision so a repeat announces again.
      setFailure((current) => ({
        message,
        revision: nextErrorRevision(current?.revision ?? null),
      }));
    } finally {
      // Covers success, failure, and a load that went stale: only the retry that
      // is still the newest may move focus, and only once.
      if (retryToken.current === token) {
        retryToken.current = null;
      }
      if (goalsLoad.current.isCurrent(token)) {
        setLoading(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      void loadGoals();

      return () => {
        focused.current = false;
        goalsLoad.current.invalidate();
        retryToken.current = null;
        focusStatus.current = false;
      };
    }, [loadGoals]),
  );

  const view = getQuickReminderView(loading, failure, goals.length);
  const status = getQuickReminderStatus(loading, failure, goals.length);

  useEffect(() => {
    if (status === null || !focused.current) {
      focusStatus.current = false;
      return;
    }

    if (focusStatus.current) {
      focusStatus.current = false;
      const node = findNodeHandle(statusRef.current);
      if (node !== null) {
        // Moving focus makes the screen reader read the status, so announcing
        // it as well would say the same sentence twice.
        AccessibilityInfo.setAccessibilityFocus(node);
        return;
      }
    }

    if (shouldAnnounceQuickReminderStatus(Platform.OS)) {
      AccessibilityInfo.announceForAccessibility(status);
    }
  }, [status]);

  return (
    <Screen
      eyebrow="PAUSE. RESET. CHOOSE."
      showBack
      subtitle="Pick the kind of support you need right now."
      title="SOS"
    >
      {SOS_PATHS.map((path) => (
        <PathCard
          body={path.body}
          icon={path.icon}
          key={path.id}
          onPress={() => router.push(path.route)}
          title={path.title}
        />
      ))}

      <View style={styles.divider} />

      <View style={styles.reminderHeader}>
        <MaterialSymbol
          color={colors.ink}
          name={QUICK_REMINDER.icon}
          size={24}
        />
        <Text accessibilityRole="header" style={styles.reminderHeading}>
          {QUICK_REMINDER.heading}
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.statusRow}>
          {view.showSpinner ? (
            // The status text says the section is loading, so the spinner is
            // decorative.
            <ActivityIndicator
              accessibilityElementsHidden
              aria-hidden
              color={colors.ember}
              importantForAccessibility="no"
              size="small"
            />
          ) : null}
          {/* Mounted permanently, and the live region sits on the text itself,
              so Android reads each new status as its content changes instead of
              missing a region that just appeared. Empty text keeps it out of the
              swipe order while the banner owns the failure. */}
          <Text
            accessibilityLiveRegion={
              Platform.OS === "android" ? "polite" : "none"
            }
            ref={statusRef}
            style={styles.statusText}
          >
            {status ?? ""}
          </Text>
        </View>

        {view.failure !== null ? (
          <>
            <ErrorBanner
              key={view.failure.revision}
              message={view.failure.message}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ busy: loading, disabled: loading }}
              disabled={loading}
              onPress={() => {
                if (loading) return;
                void loadGoals(true);
              }}
              style={({ pressed }) => [
                styles.retry,
                loading && styles.disabled,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </>
        ) : null}

        {view.showEmpty ? (
          <Text style={styles.cardBody}>{QUICK_REMINDER.emptyMessage}</Text>
        ) : null}

        {view.showGoals
          ? goals.map((goal) => (
              <View
                accessible
                accessibilityLabel={`Goal: ${goal.label}`}
                key={goal.id}
                style={styles.goalRow}
              >
                <View style={styles.goalIcon}>
                  <MaterialSymbol color="#FFFFFF" name="flag" size={16} />
                </View>
                <Text style={styles.goalLabel}>{goal.label}</Text>
              </View>
            ))
          : null}
      </View>
    </Screen>
  );
}

function PathCard({
  body,
  icon,
  onPress,
  title,
}: {
  body: string;
  icon: MaterialSymbolName;
  onPress: () => void;
  title: string;
}) {
  return (
    <Pressable
      accessible
      accessibilityHint={PATH_CARD_HINT}
      accessibilityLabel={getPathCardLabel(title, body)}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.badge}>
        <MaterialSymbol color={colors.alert} name={icon} size={24} />
      </View>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardBody}>{body}</Text>
      <Text style={styles.arrow}>Continue →</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E4E4",
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    padding: 20,
  },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.6 },
  badge: {
    alignItems: "center",
    backgroundColor: colors.emberTint,
    borderRadius: 999,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  cardTitle: { color: colors.ink, fontSize: 22, fontWeight: "800" },
  cardBody: { color: colors.body, fontSize: 16, lineHeight: 22 },
  // The ember accent only reaches 2.5:1 on white, so accent text uses alert.
  arrow: { color: colors.alert, fontSize: 15, fontWeight: "800" },
  divider: { backgroundColor: "#D7D9D9", height: 1 },
  reminderHeader: { alignItems: "center", flexDirection: "row", gap: 10 },
  reminderHeading: { color: colors.ink, fontSize: 21, fontWeight: "800" },
  statusRow: { alignItems: "center", flexDirection: "row", gap: 8 },
  statusText: { color: colors.body, fontSize: 15, lineHeight: 21 },
  retry: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.alert,
    borderRadius: 12,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 20,
  },
  retryText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  goalRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    minHeight: 44,
  },
  goalIcon: {
    alignItems: "center",
    backgroundColor: colors.ember,
    borderRadius: 8,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  goalLabel: { color: colors.ink, flex: 1, fontSize: 16, lineHeight: 22 },
});
