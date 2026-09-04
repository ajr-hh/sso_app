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
import {
  addTask,
  deleteTask,
  fetchTasks,
  toggleTask,
  updateTask,
  type DailyTask,
} from "../../src/data/tasks";
import { explainError } from "../../src/lib/errors";
import { colors } from "../../src/theme/colors";

export default function TasksScreen() {
  const router = useRouter();
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [newTask, setNewTask] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setTasks(await fetchTasks());
    } catch (caughtError) {
      setTasks([]);
      setError(explainError(caughtError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const runTaskAction = useCallback(async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      setTasks(await fetchTasks());
    } catch (caughtError) {
      setError(explainError(caughtError));
    } finally {
      setBusy(false);
    }
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

        <View style={styles.card}>
          {tasks.map((task) => (
            <View key={task.id} style={styles.taskRow}>
              <Pressable
                accessibilityLabel={`${task.done ? "Mark incomplete" : "Mark complete"}: ${task.label}`}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: task.done }}
                disabled={busy}
                onPress={() =>
                  runTaskAction(() => toggleTask(task.id, !task.done))
                }
                style={[styles.checkbox, task.done && styles.checkboxDone]}
              >
                <Text style={styles.checkmark}>{task.done ? "✓" : ""}</Text>
              </Pressable>
              <TextInput
                accessibilityLabel={`Task: ${task.label}`}
                defaultValue={task.label}
                editable={!busy}
                key={`${task.id}-${task.label}`}
                onEndEditing={(event) => {
                  const label = event.nativeEvent.text.trim();
                  if (!label || label === task.label) return;
                  void runTaskAction(() => updateTask(task.id, label));
                }}
                placeholderTextColor={colors.body}
                style={[styles.input, styles.taskInput, task.done && styles.taskDone]}
              />
              <Pressable
                accessibilityLabel={`Delete task: ${task.label}`}
                accessibilityRole="button"
                disabled={busy}
                hitSlop={8}
                onPress={() => runTaskAction(() => deleteTask(task.id))}
              >
                <Text style={styles.removeText}>Delete</Text>
              </Pressable>
            </View>
          ))}
          <AddRow
            disabled={!newTask.trim() || busy}
            onAdd={() =>
              runTaskAction(async () => {
                const label = newTask.trim();
                if (!label) return;
                await addTask(label);
                setNewTask("");
              })
            }
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
