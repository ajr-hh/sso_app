import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ErrorBanner } from "../../../components/ErrorBanner";
import { MaterialSymbol } from "../../../components/MaterialSymbol";
import { fetchGoals, type Goal } from "../../../src/data/goals";
import { fetchJournal, type JournalEntry } from "../../../src/data/journal";
import { fetchProfile } from "../../../src/data/profile";
import {
  fetchTasks,
  toggleTask,
  type DailyTask,
} from "../../../src/data/tasks";
import { journalStreak, toDayKey } from "../../../src/lib/domain";
import { explainError } from "../../../src/lib/errors";
import { colors } from "../../../src/theme/colors";
import type { Profile } from "../../../src/types";

type HomeData = {
  profile: Profile;
  goals: Goal[];
  tasks: DailyTask[];
  journal: JournalEntry[];
};

export default function HomeScreen() {
  const router = useRouter();
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [togglingTaskId, setTogglingTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [profile, goals, tasks, journal] = await Promise.all([
        fetchProfile(),
        fetchGoals(),
        fetchTasks(),
        fetchJournal(),
      ]);
      setData({ profile, goals, tasks, journal });
    } catch (caughtError) {
      setError(explainError(caughtError));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (loading && !data) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.ember} size="large" />
        <Text style={styles.body}>Loading your day…</Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.centered}>
        {error ? <ErrorBanner message={error} /> : null}
        <Button label="Try again" onPress={load} />
      </View>
    );
  }

  const streak = journalStreak(
    data.journal.map((entry) => toDayKey(new Date(entry.created_at))),
    toDayKey(new Date()),
  );
  const name = data.profile.display_name?.trim() || "there";

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <View style={styles.heading}>
        <Text style={styles.eyebrow}>TODAY</Text>
        <Text style={styles.title}>Hey, {name}</Text>
        <Text style={styles.body}>Keep showing up for yourself.</Text>
      </View>

      {error ? <ErrorBanner message={error} /> : null}
      {loading ? <ActivityIndicator color={colors.ember} /> : null}

      <View style={styles.streakCard}>
        <Text style={styles.streakNumber}>{streak}</Text>
        <View style={styles.streakCopy}>
          <Text style={styles.streakTitle}>day journal streak</Text>
          <Text style={styles.streakBody}>
            {streak > 0
              ? "You checked in today. Keep it going."
              : "A quick check-in starts today’s streak."}
          </Text>
        </View>
      </View>

      <Section
        onEdit={() => router.navigate("/(app)/(tabs)/profile")}
        title="My daily tasks"
      >
        {data.tasks.length === 0 ? (
          <Text style={styles.body}>No tasks planned for today.</Text>
        ) : (
          data.tasks.map((task) => (
            <Pressable
              accessibilityLabel={`${task.done ? "Mark incomplete" : "Mark complete"}: ${task.label}`}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: task.done }}
              disabled={togglingTaskId !== null}
              key={task.id}
              onPress={async () => {
                setTogglingTaskId(task.id);
                setError(null);
                try {
                  await toggleTask(task.id, !task.done);
                  const tasks = await fetchTasks();
                  setData((current) =>
                    current ? { ...current, tasks } : current,
                  );
                } catch (caughtError) {
                  setError(explainError(caughtError));
                } finally {
                  setTogglingTaskId(null);
                }
              }}
              style={styles.taskRow}
            >
              <View style={[styles.checkbox, task.done && styles.checkboxDone]}>
                <Text style={styles.checkmark}>{task.done ? "✓" : ""}</Text>
              </View>
              <Text style={[styles.taskLabel, task.done && styles.taskDone]}>
                {task.label}
              </Text>
              {togglingTaskId === task.id ? (
                <ActivityIndicator color={colors.ember} size="small" />
              ) : null}
            </Pressable>
          ))
        )}
      </Section>

      <Section
        onEdit={() => router.navigate("/(app)/(tabs)/profile")}
        title="My goals"
      >
        {data.goals.length === 0 ? (
          <Text style={styles.body}>Add goals from your profile.</Text>
        ) : (
          data.goals.map((goal) => (
            <View key={goal.id} style={styles.goalRow}>
              <View style={styles.goalIcon}>
                <MaterialSymbol color="#FFFFFF" name="flag" size={16} />
              </View>
              <Text style={styles.goalLabel}>{goal.label}</Text>
            </View>
          ))
        )}
      </Section>

      <Pressable
        accessibilityHint="Opens immediate support options"
        accessibilityLabel="Open SOS support"
        accessibilityRole="button"
        onPress={() => router.push("/(app)/sos")}
        style={({ pressed }) => [
          styles.sosCard,
          pressed && styles.sosCardPressed,
        ]}
      >
        <Text style={styles.sosTitle}>
          Feeling shaky, or something coming up?
        </Text>
        <Text style={styles.body}>
          Tap the SOS button below — day or night.
        </Text>
      </Pressable>
    </ScrollView>
  );
}

function Section({
  children,
  onEdit,
  title,
}: {
  children: React.ReactNode;
  onEdit?: () => void;
  title: string;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>
          {title}
        </Text>
        {onEdit ? (
          <Pressable
            accessibilityLabel={`Edit ${title}`}
            accessibilityRole="button"
            hitSlop={8}
            onPress={onEdit}
            style={({ pressed }) => [
              styles.editButton,
              pressed && styles.editButtonPressed,
            ]}
          >
            <MaterialSymbol color={colors.ink} name="edit" size={18} />
            <Text style={styles.editText}>Edit</Text>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function Button({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={styles.button}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.canvas, gap: 16, padding: 24, paddingBottom: 48 },
  centered: { alignItems: "center", backgroundColor: colors.canvas, flex: 1, gap: 16, justifyContent: "center", padding: 24 },
  heading: { gap: 5 },
  eyebrow: { color: colors.ember, fontSize: 13, fontWeight: "800", letterSpacing: 1.5 },
  title: { color: colors.ink, fontSize: 36, fontWeight: "800" },
  body: { color: colors.body, fontSize: 16, lineHeight: 22 },
  streakCard: { alignItems: "center", backgroundColor: colors.ink, borderRadius: 18, flexDirection: "row", gap: 16, padding: 20 },
  streakNumber: { color: colors.ember, fontSize: 48, fontWeight: "900", minWidth: 46, textAlign: "center" },
  streakCopy: { flex: 1, gap: 4 },
  streakTitle: { color: "#FFFFFF", fontSize: 20, fontWeight: "800" },
  streakBody: { color: "#D8DCDC", fontSize: 15, lineHeight: 20 },
  section: { backgroundColor: "#FFFFFF", borderRadius: 16, gap: 14, padding: 18 },
  sectionHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  sectionTitle: { color: colors.ink, fontSize: 21, fontWeight: "800" },
  editButton: { alignItems: "center", flexDirection: "row", gap: 4, minHeight: 32, paddingHorizontal: 4 },
  editButtonPressed: { opacity: 0.6 },
  editText: { color: colors.ink, fontSize: 14, fontWeight: "800" },
  taskRow: { alignItems: "center", flexDirection: "row", gap: 11, minHeight: 40 },
  checkbox: { alignItems: "center", borderColor: "#9EA5A5", borderRadius: 6, borderWidth: 2, height: 25, justifyContent: "center", width: 25 },
  checkboxDone: { backgroundColor: colors.ember, borderColor: colors.ember },
  checkmark: { color: "#FFFFFF", fontSize: 16, fontWeight: "900" },
  taskLabel: { color: colors.ink, flex: 1, fontSize: 16 },
  taskDone: { color: colors.body, textDecorationLine: "line-through" },
  goalRow: { alignItems: "center", flexDirection: "row", gap: 10 },
  goalIcon: { alignItems: "center", backgroundColor: colors.ember, borderRadius: 8, height: 28, justifyContent: "center", width: 28 },
  goalLabel: { color: colors.ink, flex: 1, fontSize: 16, lineHeight: 22 },
  sosCard: { backgroundColor: colors.emberTint, borderRadius: 16, gap: 12, padding: 18 },
  sosCardPressed: { opacity: 0.75 },
  sosTitle: { color: colors.ink, fontSize: 23, fontWeight: "800" },
  button: { alignItems: "center", alignSelf: "flex-start", backgroundColor: colors.ember, borderRadius: 12, justifyContent: "center", minHeight: 48, paddingHorizontal: 20 },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
});
