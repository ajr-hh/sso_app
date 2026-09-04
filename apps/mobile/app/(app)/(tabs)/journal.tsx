import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { ErrorBanner } from "../../../components/ErrorBanner";
import {
  addJournalEntry,
  fetchJournal,
  type JournalEntry,
} from "../../../src/data/journal";
import { explainError } from "../../../src/lib/errors";
import { colors } from "../../../src/theme/colors";

const MOODS = ["Steady", "Proud", "Struggling", "Hopeful"] as const;

export default function JournalScreen() {
  const [entries, setEntries] = useState<JournalEntry[] | null>(null);
  const [mood, setMood] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setEntries(await fetchJournal());
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

  if (loading && !entries) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.ember} size="large" />
        <Text style={styles.body}>Loading your journal…</Text>
      </View>
    );
  }

  if (!entries) {
    return (
      <View style={styles.centered}>
        {error ? <ErrorBanner message={error} /> : null}
        <Button label="Try again" onPress={load} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
      <View style={styles.heading}>
        <Text style={styles.eyebrow}>DAILY CHECK-IN</Text>
        <Text style={styles.title}>Activity</Text>
        <Text style={styles.body}>Name how today feels and capture what matters.</Text>
      </View>

      {error ? <ErrorBanner message={error} /> : null}
      {loading ? <ActivityIndicator color={colors.ember} /> : null}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>How are you feeling?</Text>
        <View style={styles.moods}>
          {MOODS.map((option) => (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected: mood === option }}
              key={option}
              onPress={() => setMood(option)}
              style={[styles.mood, mood === option && styles.moodSelected]}
            >
              <Text style={styles.moodText}>{option}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          accessibilityLabel="Journal entry"
          multiline
          onChangeText={setBody}
          placeholder="What happened today? What do you want to remember?"
          style={styles.input}
          textAlignVertical="top"
          value={body}
        />
        <Button
          disabled={!mood || !body.trim() || saving}
          label={saving ? "Saving…" : "Save check-in"}
          onPress={async () => {
            setSaving(true);
            setError(null);
            try {
              await addJournalEntry(mood, body.trim());
              setMood("");
              setBody("");
              setEntries(await fetchJournal());
            } catch (caughtError) {
              setError(explainError(caughtError));
            } finally {
              setSaving(false);
            }
          }}
        />
      </View>

      <View style={styles.listHeading}>
        <Text style={styles.sectionTitle}>Your entries</Text>
        <Text style={styles.entryCount}>{entries.length}</Text>
      </View>
      {entries.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.body}>Your first check-in will appear here.</Text>
        </View>
      ) : (
        entries.map((entry) => (
          <View key={entry.id} style={styles.card}>
            <View style={styles.entryHeading}>
              <Text style={styles.entryMood}>{entry.mood || "Check-in"}</Text>
              <Text style={styles.entryDate}>
                {new Date(entry.created_at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </Text>
            </View>
            <Text style={styles.entryBody}>{entry.body}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

function Button({ disabled = false, label, onPress }: { disabled?: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, disabled && styles.disabled]}
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
  card: { backgroundColor: "#FFFFFF", borderRadius: 16, gap: 14, padding: 18 },
  sectionTitle: { color: colors.ink, fontSize: 21, fontWeight: "800" },
  moods: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  mood: { borderColor: "#C8CCCC", borderRadius: 999, borderWidth: 1, paddingHorizontal: 13, paddingVertical: 10 },
  moodSelected: { backgroundColor: colors.emberTint, borderColor: colors.ember },
  moodText: { color: colors.ink, fontSize: 15, fontWeight: "700" },
  input: { backgroundColor: colors.canvas, borderColor: "#D7D9D9", borderRadius: 12, borderWidth: 1, color: colors.ink, fontSize: 16, minHeight: 128, padding: 14 },
  button: { alignItems: "center", backgroundColor: colors.ember, borderRadius: 12, justifyContent: "center", minHeight: 50, paddingHorizontal: 18 },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  disabled: { opacity: 0.45 },
  listHeading: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  entryCount: { backgroundColor: colors.emberTint, borderRadius: 999, color: colors.ink, fontSize: 14, fontWeight: "800", minWidth: 30, padding: 6, textAlign: "center" },
  entryHeading: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  entryMood: { color: colors.ember, fontSize: 15, fontWeight: "800" },
  entryDate: { color: colors.body, fontSize: 13 },
  entryBody: { color: colors.ink, fontSize: 16, lineHeight: 23 },
});
