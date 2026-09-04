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
  addTask,
  deleteTask,
  fetchTasks,
  toggleTask,
  updateTask,
  type DailyTask,
} from "../../src/data/tasks";
import { explainError } from "../../src/lib/errors";
import { createPendingSubmissions } from "../../src/lib/pendingSubmissions";
import {
  beginLabelChange,
  forgetLabelIntention,
  getIntendedLabel,
  restoreLabel,
  settleLabelChange,
  type LabelIntentions,
} from "../../src/presentation/labels";
import {
  beginTaskDoneChange,
  getTaskStatusMessage,
  settleTaskDoneChange,
  type TaskDoneIntentions,
} from "../../src/presentation/tasks";
import { colors } from "../../src/theme/colors";

type TaskDraft = DailyTask & { savedLabel: string };

function toTaskDrafts(tasks: DailyTask[]): TaskDraft[] {
  return tasks.map((task) => ({ ...task, savedLabel: task.label }));
}

export default function TasksScreen() {
  const router = useRouter();
  const actionQueue = useRef<Promise<void>>(Promise.resolve());
  const deletedTaskIds = useRef(new Set<string>());
  const intendedTaskDone = useRef<TaskDoneIntentions>(new Map());
  const intendedTaskLabels = useRef<LabelIntentions>(new Map());
  const pendingAdds = useRef(createPendingSubmissions());
  const statusSequence = useRef(0);
  const [tasks, setTasks] = useState<TaskDraft[]>([]);
  const [newTask, setNewTask] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<{
    message: string;
    sequence: number;
  } | null>(null);

  const reportStatus = useCallback((message: string) => {
    setError(null);
    statusSequence.current += 1;
    setStatus({ message, sequence: statusSequence.current });
    if (Platform.OS === "ios") {
      AccessibilityInfo.announceForAccessibilityWithOptions(message, {
        queue: true,
      });
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const nextTasks = await fetchTasks();
      intendedTaskLabels.current = new Map();
      intendedTaskDone.current = new Map();
      setTasks(toTaskDrafts(nextTasks));
    } catch (caughtError) {
      setTasks([]);
      setError(explainError(caughtError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial loading state is already true; the async load owns subsequent updates.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const runTaskAction = useCallback(async (action: () => Promise<void>) => {
    const run = async () => {
      try {
        await action();
        setError(null);
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
        <Text style={styles.body}>Loading your tasks…</Text>
      </View>
    );
  }

  if (error && tasks.length === 0) {
    return (
      <View style={styles.centered}>
        <ErrorBanner message={error} />
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
          <Text style={styles.eyebrow}>TODAY</Text>
          <Text accessibilityRole="header" style={styles.title}>
            My daily tasks
          </Text>
          <Text style={styles.body}>
            Check them off as you go, or edit the list for today.
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
          {tasks.map((task) => (
            <View key={task.id} style={styles.taskRow}>
              <Pressable
                accessibilityLabel={`${task.done ? "Mark incomplete" : "Mark complete"}: ${task.label}`}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: task.done }}
                onPress={() => {
                  if (deletedTaskIds.current.has(task.id)) return;
                  const started = beginTaskDoneChange(
                    intendedTaskDone.current,
                    task.id,
                    task.done,
                  );
                  intendedTaskDone.current = started.intentions;
                  setTasks((current) =>
                    current.map((item) =>
                      item.id === task.id
                        ? { ...item, done: started.change.target }
                        : item,
                    ),
                  );
                  Keyboard.dismiss();
                  void runTaskAction(async () => {
                    try {
                      await toggleTask(task.id, started.change.target);
                      const settled = settleTaskDoneChange(
                        intendedTaskDone.current,
                        started.change,
                        true,
                      );
                      intendedTaskDone.current = settled.intentions;
                    } catch (caughtError) {
                      const settled = settleTaskDoneChange(
                        intendedTaskDone.current,
                        started.change,
                        false,
                      );
                      intendedTaskDone.current = settled.intentions;
                      if (settled.rollbackDone !== undefined) {
                        const rollbackDone = settled.rollbackDone;
                        setTasks((current) =>
                          current.map((item) =>
                            item.id === task.id
                              ? { ...item, done: rollbackDone }
                              : item,
                          ),
                        );
                      }
                      throw caughtError;
                    }
                  });
                }}
                style={[styles.checkbox, task.done && styles.checkboxDone]}
              >
                <Text style={styles.checkmark}>{task.done ? "✓" : ""}</Text>
              </Pressable>
              <TextInput
                accessibilityLabel="Daily task"
                onChangeText={(value) => {
                  if (deletedTaskIds.current.has(task.id)) return;
                  setTasks((current) =>
                    current.map((item) =>
                      item.id === task.id ? { ...item, label: value } : item,
                    ),
                  );
                }}
                onEndEditing={(event) => {
                  if (deletedTaskIds.current.has(task.id)) return;
                  const draftLabel = event.nativeEvent.text;
                  const intendedLabel = getIntendedLabel(
                    intendedTaskLabels.current,
                    task.id,
                    task.savedLabel,
                  );
                  const label = restoreLabel(draftLabel, intendedLabel);
                  if (!draftLabel.trim() || label === intendedLabel) {
                    setTasks((current) =>
                      current.map((item) =>
                        item.id === task.id ? { ...item, label } : item,
                      ),
                    );
                    return;
                  }
                  const started = beginLabelChange(
                    intendedTaskLabels.current,
                    task.id,
                    task.savedLabel,
                    label,
                  );
                  intendedTaskLabels.current = started.intentions;
                  void runTaskAction(async () => {
                    try {
                      await updateTask(task.id, label);
                      const settled = settleLabelChange(
                        intendedTaskLabels.current,
                        started.change,
                        true,
                      );
                      intendedTaskLabels.current = settled.intentions;
                      setTasks((current) =>
                        current.map((item) =>
                          item.id === task.id
                            ? {
                                ...item,
                                label:
                                  item.label === draftLabel ? label : item.label,
                                savedLabel: label,
                              }
                            : item,
                        ),
                      );
                      reportStatus(getTaskStatusMessage("updated", label));
                    } catch (caughtError) {
                      const settled = settleLabelChange(
                        intendedTaskLabels.current,
                        started.change,
                        false,
                      );
                      intendedTaskLabels.current = settled.intentions;
                      if (settled.rollbackLabel !== undefined) {
                        const rollbackLabel = settled.rollbackLabel;
                        setTasks((current) =>
                          current.map((item) =>
                            item.id === task.id && item.label === draftLabel
                              ? { ...item, label: rollbackLabel }
                              : item,
                          ),
                        );
                      }
                      throw caughtError;
                    }
                  });
                }}
                placeholderTextColor={colors.body}
                style={[styles.input, styles.taskInput, task.done && styles.taskDone]}
                value={task.label}
              />
              <Pressable
                accessibilityLabel={`Delete task: ${task.label}`}
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => {
                  if (deletedTaskIds.current.has(task.id)) return;
                  deletedTaskIds.current.add(task.id);
                  Keyboard.dismiss();
                  const label =
                    task.label.trim() ||
                    getIntendedLabel(
                      intendedTaskLabels.current,
                      task.id,
                      task.savedLabel,
                    ) ||
                    "Daily task";
                  void runTaskAction(async () => {
                    try {
                      await deleteTask(task.id);
                      setTasks((current) =>
                        current.filter((item) => item.id !== task.id),
                      );
                      intendedTaskLabels.current = forgetLabelIntention(
                        intendedTaskLabels.current,
                        task.id,
                      );
                      intendedTaskDone.current = new Map(
                        [...intendedTaskDone.current].filter(
                          ([id]) => id !== task.id,
                        ),
                      );
                      deletedTaskIds.current.delete(task.id);
                      reportStatus(getTaskStatusMessage("deleted", label));
                    } catch (caughtError) {
                      deletedTaskIds.current.delete(task.id);
                      throw caughtError;
                    }
                  });
                }}
              >
                <Text style={styles.removeText}>Delete</Text>
              </Pressable>
            </View>
          ))}
          <AddRow
            disabled={!newTask.trim()}
            onAdd={() => {
              Keyboard.dismiss();
              const label = newTask.trim();
              if (!label) return;
              // A second tap or Return before the queued add resolves would submit
              // the same text twice, because the field only clears on success.
              if (!pendingAdds.current.claim(label)) return;
              void runTaskAction(async () => {
                try {
                  const created = await addTask(label);
                  setTasks((current) => [
                    ...current,
                    { ...created, savedLabel: created.label },
                  ]);
                  setNewTask((current) =>
                    current.trim() === label ? "" : current,
                  );
                  reportStatus(getTaskStatusMessage("added", created.label));
                } finally {
                  pendingAdds.current.release(label);
                }
              });
            }}
            onChange={setNewTask}
            placeholder="Add a daily task"
            value={newTask}
          />
        </View>
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
        accessibilityLabel="Daily task"
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
  taskInput: { flex: 1, minHeight: 44 },
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
  taskRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 11,
    minHeight: 40,
  },
  checkbox: {
    alignItems: "center",
    borderColor: "#9EA5A5",
    borderRadius: 6,
    borderWidth: 2,
    height: 25,
    justifyContent: "center",
    width: 25,
  },
  checkboxDone: { backgroundColor: colors.ember, borderColor: colors.ember },
  checkmark: { color: "#FFFFFF", fontSize: 16, fontWeight: "900" },
  taskDone: { color: colors.body, textDecorationLine: "line-through" },
});
