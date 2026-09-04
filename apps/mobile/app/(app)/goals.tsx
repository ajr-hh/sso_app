import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Keyboard,
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
import {
  addGoal,
  deleteGoal,
  fetchGoals,
  updateGoal,
  type Goal,
} from "../../src/data/goals";
import { explainError } from "../../src/lib/errors";
import { createPendingSubmissions } from "../../src/lib/pendingSubmissions";
import {
  getGoalStatusMessage,
  shouldAnnounceGoalStatus,
  shouldShowGoalsInitialLoadFailure,
} from "../../src/presentation/goals";
import {
  beginLabelChange,
  forgetLabelIntention,
  getIntendedLabel,
  restoreLabel,
  settleLabelChange,
  type LabelIntentions,
} from "../../src/presentation/labels";
import { colors } from "../../src/theme/colors";

type GoalDraft = Goal & { savedLabel: string };

function toGoalDrafts(goals: Goal[]): GoalDraft[] {
  return goals.map((goal) => ({ ...goal, savedLabel: goal.label }));
}

export default function GoalsScreen() {
  const router = useRouter();
  const actionQueue = useRef<Promise<void>>(Promise.resolve());
  const intendedGoalLabels = useRef<LabelIntentions>(new Map());
  const removedGoalIds = useRef(new Set<string>());
  const pendingAdds = useRef(createPendingSubmissions());
  const statusSequence = useRef(0);
  const [goalDrafts, setGoalDrafts] = useState<GoalDraft[]>([]);
  const [newGoal, setNewGoal] = useState("");
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<{
    message: string;
    sequence: number;
  } | null>(null);

  const reportStatus = useCallback((message: string) => {
    setError(null);
    statusSequence.current += 1;
    setStatus({ message, sequence: statusSequence.current });
    if (shouldAnnounceGoalStatus(Platform.OS)) {
      AccessibilityInfo.announceForAccessibilityWithOptions(message, {
        queue: true,
      });
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setError(null);
    setStatus(null);
    try {
      const nextGoals = await fetchGoals();
      intendedGoalLabels.current = new Map();
      setGoalDrafts(toGoalDrafts(nextGoals));
      setHasLoaded(true);
    } catch (caughtError) {
      setGoalDrafts([]);
      setLoadError(explainError(caughtError));
    } finally {
      setLoading(false);
    }
  }, [setGoalDrafts]);

  useEffect(() => {
    // Initial loading state is already true; the async load owns subsequent updates.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const runGoalAction = useCallback(async (action: () => Promise<void>) => {
    const run = async () => {
      try {
        await action();
      } catch (caughtError) {
        setStatus(null);
        setError(explainError(caughtError));
      }
    };
    actionQueue.current = actionQueue.current.then(run, run);
    await actionQueue.current;
  }, []);

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
        <Text
          accessibilityLabel={
            Platform.OS === "android" && status
              ? `${status.message} Status ${status.sequence}.`
              : undefined
          }
          accessibilityLiveRegion={
            Platform.OS === "android" ? "polite" : undefined
          }
          style={styles.status}
        >
          {status?.message ?? ""}
        </Text>

        <View style={styles.card}>
          {goalDrafts.map((goal) => (
            <View key={goal.id} style={styles.row}>
              <TextInput
                accessibilityLabel="Goal"
                onChangeText={(value) => {
                  setGoalDrafts((current) =>
                    current.map((item) =>
                      item.id === goal.id ? { ...item, label: value } : item,
                    ),
                  );
                }}
                onEndEditing={(event) => {
                  if (removedGoalIds.current.has(goal.id)) return;
                  const draftLabel = event.nativeEvent.text;
                  const intendedLabel = getIntendedLabel(
                    intendedGoalLabels.current,
                    goal.id,
                    goal.savedLabel,
                  );
                  const label = restoreLabel(draftLabel, intendedLabel);
                  if (!draftLabel.trim() || label === intendedLabel) {
                    setGoalDrafts((current) =>
                      current.map((item) =>
                        item.id === goal.id ? { ...item, label } : item,
                      ),
                    );
                    return;
                  }
                  const started = beginLabelChange(
                    intendedGoalLabels.current,
                    goal.id,
                    goal.savedLabel,
                    label,
                  );
                  intendedGoalLabels.current = started.intentions;
                  void runGoalAction(async () => {
                    try {
                      await updateGoal(goal.id, label);
                      const settled = settleLabelChange(
                        intendedGoalLabels.current,
                        started.change,
                        true,
                      );
                      intendedGoalLabels.current = settled.intentions;
                      setGoalDrafts((current) =>
                        current.map((item) =>
                          item.id === goal.id
                            ? {
                                ...item,
                                label:
                                  item.label === draftLabel ? label : item.label,
                                savedLabel: label,
                              }
                            : item,
                        ),
                      );
                      reportStatus(getGoalStatusMessage("updated", label));
                    } catch (caughtError) {
                      const settled = settleLabelChange(
                        intendedGoalLabels.current,
                        started.change,
                        false,
                      );
                      intendedGoalLabels.current = settled.intentions;
                      if (settled.rollbackLabel !== undefined) {
                        const rollbackLabel = settled.rollbackLabel;
                        setGoalDrafts((current) =>
                          current.map((item) =>
                            item.id === goal.id && item.label === draftLabel
                              ? { ...item, label: rollbackLabel }
                              : item,
                          ),
                        );
                      }
                      throw caughtError;
                    }
                  });
                }}
                placeholder="Enter a goal"
                placeholderTextColor={colors.body}
                style={[styles.input, styles.rowInput]}
                value={goal.label}
              />
              <Pressable
                accessibilityLabel={`Remove goal: ${goal.label.trim() || goal.savedLabel}`}
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => {
                  if (removedGoalIds.current.has(goal.id)) return;
                  removedGoalIds.current.add(goal.id);
                  Keyboard.dismiss();
                  const label = goal.label.trim() || goal.savedLabel;
                  void runGoalAction(async () => {
                    try {
                      await deleteGoal(goal.id);
                      setGoalDrafts((current) =>
                        current.filter((item) => item.id !== goal.id),
                      );
                      intendedGoalLabels.current = forgetLabelIntention(
                        intendedGoalLabels.current,
                        goal.id,
                      );
                      removedGoalIds.current.delete(goal.id);
                      reportStatus(getGoalStatusMessage("removed", label));
                    } catch (caughtError) {
                      removedGoalIds.current.delete(goal.id);
                      throw caughtError;
                    }
                  });
                }}
              >
                <Text style={styles.removeText}>Remove</Text>
              </Pressable>
            </View>
          ))}
          <AddRow
            accessibilityLabel={`Add goal: ${newGoal.trim() || "enter goal text"}`}
            disabled={!newGoal.trim()}
            onAdd={() => {
              Keyboard.dismiss();
              const label = newGoal.trim();
              if (!label) return;
              // A second tap or Return before the queued add resolves would submit
              // the same text twice, because the field only clears on success.
              if (!pendingAdds.current.claim(label)) return;
              void runGoalAction(async () => {
                try {
                  const created = await addGoal(label);
                  setGoalDrafts((current) => [
                    ...current,
                    { ...created, savedLabel: created.label },
                  ]);
                  setNewGoal((current) =>
                    current.trim() === label ? "" : current,
                  );
                  reportStatus(getGoalStatusMessage("added", created.label));
                } finally {
                  pendingAdds.current.release(label);
                }
              });
            }}
            onChange={setNewGoal}
            placeholder="Add a goal"
            value={newGoal}
          />
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function AddRow({
  accessibilityLabel,
  disabled,
  onAdd,
  onChange,
  placeholder,
  value,
}: {
  accessibilityLabel: string;
  disabled: boolean;
  onAdd: () => void;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <View style={styles.row}>
      <TextInput
        accessibilityLabel="Goal"
        onChangeText={onChange}
        onSubmitEditing={onAdd}
        placeholder={placeholder}
        placeholderTextColor={colors.body}
        style={[styles.input, styles.rowInput]}
        value={value}
      />
      <Button
        accessibilityLabel={accessibilityLabel}
        disabled={disabled}
        label="Add"
        onPress={onAdd}
      />
    </View>
  );
}

function Button({
  accessibilityLabel,
  disabled = false,
  label,
  onPress,
}: {
  accessibilityLabel?: string;
  disabled?: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
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
  status: { color: colors.body, fontSize: 15, lineHeight: 21 },
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
