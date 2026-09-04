import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { ErrorBanner } from "../../../components/ErrorBanner";
import {
  SosButton,
  SosCard,
  SosLoading,
  SosScreen,
  sosTextStyles,
  useSosPath,
} from "../../../components/SosUi";
import { fetchJournal } from "../../../src/data/journal";
import { logSosEvent } from "../../../src/data/sos";
import { fetchTasks } from "../../../src/data/tasks";
import { explainError } from "../../../src/lib/errors";
import { journalStreak, toDayKey } from "../../../src/lib/domain";

type RewardSummary = {
  streak: number;
  unfinishedTasks: number;
};

export default function RewardsScreen() {
  const path = useSosPath();
  const [summary, setSummary] = useState<RewardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [journal, tasks] = await Promise.all([
        fetchJournal(),
        fetchTasks(),
      ]);
      setSummary({
        streak: journalStreak(
          journal.map((entry) => toDayKey(new Date(entry.created_at))),
          toDayKey(new Date()),
        ),
        unfinishedTasks: tasks.filter((task) => !task.done).length,
      });
    } catch (caughtError) {
      setError(explainError(caughtError));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void load();
      void logSosEvent(path, "rewards").catch((caughtError) => {
        if (active) {
          setError(explainError(caughtError));
        }
      });
      return () => {
        active = false;
      };
    }, [load, path]),
  );

  if (!summary && !error) {
    return <SosLoading label="Counting your small wins…" />;
  }

  if (!summary) {
    return (
      <SosScreen eyebrow="SMALL WINS" title="Progress is still progress">
        {error ? <ErrorBanner message={error} /> : null}
        <SosButton label="Try again" onPress={load} />
      </SosScreen>
    );
  }

  return (
    <SosScreen
      eyebrow="SMALL WINS"
      subtitle="You have evidence that you can keep showing up."
      title="Progress is still progress"
    >
      {error ? <ErrorBanner message={error} /> : null}
      <View style={styles.summary}>
        <SosCard>
          <Text style={sosTextStyles.number}>{summary.streak}</Text>
          <Text style={sosTextStyles.strong}>day journal streak</Text>
        </SosCard>
        <SosCard>
          <Text style={sosTextStyles.number}>{summary.unfinishedTasks}</Text>
          <Text style={sosTextStyles.strong}>tasks left today</Text>
        </SosCard>
      </View>
      <SosCard>
        <Text style={sosTextStyles.sectionTitle}>Keep the promise small</Text>
        <Text style={sosTextStyles.body}>
          Finish one task or make one journal entry. One completed choice is
          enough to restart momentum.
        </Text>
      </SosCard>
    </SosScreen>
  );
}

const styles = StyleSheet.create({
  summary: { gap: 12 },
});
