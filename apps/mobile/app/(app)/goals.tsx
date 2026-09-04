import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { BackControl } from "../../components/BackControl";
import { ErrorBanner } from "../../components/ErrorBanner";
import { fetchGoals, saveGoals } from "../../src/data/goals";
import { explainError } from "../../src/lib/errors";
import { newId } from "../../src/lib/ids";
import { shouldShowGoalsInitialLoadFailure } from "../../src/presentation/goals";
import { colors } from "../../src/theme/colors";

export default function GoalsScreen() {
  const router = useRouter();
  const [goalDrafts, setGoalDrafts] = useState<
    { id: string; label: string }[]
  >([]);
  const [newGoal, setNewGoal] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setError(null);
    try {
      const nextGoals = await fetchGoals();
      setGoalDrafts(
        nextGoals.map(({ id, label }) => ({
          id,
          label,
        })),
      );
      setHasLoaded(true);
    } catch (caughtError) {
      setGoalDrafts([]);
      setLoadError(explainError(caughtError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.ember} size="large" />
        <Text style={styles.body}>Loading your goals…</Text>
      </View>
    );
  }

  if (shouldShowGoalsInitialLoadFailure(hasLoaded, loadError)) {
    return (
      <View style={styles.centered}>
        <ErrorBanner message={loadError!} />
        <Button label="Try again" onPress={load} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.flex}
    >
      <ScrollView
        contentContainerStyle={styles.screen}
        keyboardShouldPersistTaps="handled"
      >
        <BackControl onPress={() => router.back()} />
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>YOUR SUPPORT PLAN</Text>
          <Text accessibilityRole="header" style={styles.title}>
            My goals
          </Text>
          <Text style={styles.body}>
            Keep these visible so SOS can remind you what you are working toward.
          </Text>
        </View>

        {error ? <ErrorBanner message={error} /> : null}
        {saved ? (
          <Text accessibilityLiveRegion="polite" style={styles.saved}>
            Goals saved.
          </Text>
        ) : null}

        <View style={styles.card}>
          {goalDrafts.map((goal, index) => (
            <View key={goal.id} style={styles.row}>
              <TextInput
                accessibilityLabel={`Goal ${index + 1}`}
                editable={!busy}
                onChangeText={(value) => {
                  setGoalDrafts((current) =>
                    current.map((item) =>
                      item.id === goal.id ? { ...item, label: value } : item,
                    ),
                  );
                  setSaved(false);
                }}
                placeholder="Enter a goal"
                placeholderTextColor={colors.body}
                style={[styles.input, styles.rowInput]}
                value={goal.label}
              />
              <Pressable
                accessibilityLabel={`Remove goal ${index + 1}`}
                accessibilityRole="button"
                disabled={busy}
                hitSlop={8}
                onPress={() => {
                  setGoalDrafts((current) =>
                    current.filter((item) => item.id !== goal.id),
                  );
                  setSaved(false);
                }}
              >
                <Text style={styles.removeText}>Remove</Text>
              </Pressable>
            </View>
          ))}
          <AddRow
            disabled={!newGoal.trim() || busy}
            onAdd={() => {
              const label = newGoal.trim();
              if (!label) return;
              setGoalDrafts((current) => [
                ...current,
                { id: newId(), label },
              ]);
              setNewGoal("");
              setSaved(false);
            }}
            onChange={setNewGoal}
            placeholder="Add a goal"
            value={newGoal}
          />
        </View>

        <Button
          disabled={busy}
          label={busy ? "Saving…" : "Save goals"}
          onPress={async () => {
            setBusy(true);
            setError(null);
            try {
              await saveGoals(
                goalDrafts
                  .map(({ id, label }) => ({ id, label: label.trim() }))
                  .filter(({ label }) => Boolean(label)),
              );
              const nextGoals = await fetchGoals();
              setGoalDrafts(
                nextGoals.map(({ id, label }) => ({
                  id,
                  label,
                })),
              );
              setSaved(true);
            } catch (caughtError) {
              setError(explainError(caughtError));
            } finally {
              setBusy(false);
            }
          }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function AddRow({
  disabled,
  onAdd,
  onChange,
  placeholder,
  value,
}: {
  disabled: boolean;
  onAdd: () => void;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <View style={styles.row}>
      <TextInput
        accessibilityLabel={placeholder}
        onChangeText={onChange}
        onSubmitEditing={onAdd}
        placeholder={placeholder}
        placeholderTextColor={colors.body}
        style={[styles.input, styles.rowInput]}
        value={value}
      />
      <Button disabled={disabled} label="Add" onPress={onAdd} />
    </View>
  );
}

function Button({
  disabled = false,
  label,
  onPress,
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
}) {
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
  flex: { backgroundColor: colors.canvas, flex: 1 },
  screen: {
    backgroundColor: colors.canvas,
    gap: 16,
    padding: 24,
    paddingBottom: 96,
  },
  centered: {
    alignItems: "center",
    backgroundColor: colors.canvas,
    flex: 1,
    gap: 16,
    justifyContent: "center",
    padding: 24,
  },
  heading: { gap: 5 },
  eyebrow: {
    color: colors.ember,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  title: { color: colors.ink, fontSize: 36, fontWeight: "800" },
  body: { color: colors.body, fontSize: 16, lineHeight: 22 },
  saved: { color: "#27633E", fontSize: 15, fontWeight: "700" },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    gap: 14,
    padding: 18,
  },
  row: { alignItems: "center", flexDirection: "row", gap: 9 },
  rowInput: { flex: 1 },
  input: {
    backgroundColor: colors.canvas,
    borderColor: "#D7D9D9",
    borderRadius: 12,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 16,
    minHeight: 50,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  removeText: { color: "#A43B2A", fontSize: 13, fontWeight: "700" },
  button: {
    alignItems: "center",
    backgroundColor: colors.ember,
    borderRadius: 12,
    justifyContent: "center",
    minHeight: 50,
    paddingHorizontal: 16,
  },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  disabled: { opacity: 0.45 },
});
