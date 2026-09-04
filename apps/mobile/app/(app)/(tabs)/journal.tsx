import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { ErrorBanner } from "../../../components/ErrorBanner";
import { MaterialSymbol } from "../../../components/MaterialSymbol";
import {
  addJournalEntry,
  deleteJournalEntry,
  fetchJournal,
  type JournalEntry,
  type JournalSentiment,
  updateJournalEntry,
} from "../../../src/data/journal";
import { explainError } from "../../../src/lib/errors";
import {
  describeJournalEntry,
  getJournalDeleteConfirmation,
  getJournalEditAnnouncement,
  getJournalEntryActionLabel,
  getJournalSentimentIcon,
  getJournalStatusMessage,
  normalizeJournalSentiment,
} from "../../../src/presentation/journal";
import { colors } from "../../../src/theme/colors";

const MOODS = ["Good day", "Tough day", "Mixed"] as const;

export default function JournalScreen() {
  const scrollRef = useRef<ScrollView>(null);
  const bodyInputRef = useRef<TextInput>(null);
  const formY = useRef(0);
  // Bumped whenever the composer is retargeted, so a slow save never clears a newer draft.
  const composerToken = useRef(0);
  const [entries, setEntries] = useState<JournalEntry[] | null>(null);
  const [mood, setMood] = useState<JournalSentiment | "">("");
  const [body, setBody] = useState("");
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const announce = useCallback((message: string) => {
    AccessibilityInfo.announceForAccessibility(message);
  }, []);

  const reportError = useCallback(
    (caughtError: unknown) => {
      const message = explainError(caughtError);
      setStatus(null);
      setError(message);
      announce(message);
    },
    [announce],
  );

  const reportStatus = useCallback(
    (message: string) => {
      setStatus(message);
      announce(message);
    },
    [announce],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setEntries(await fetchJournal());
    } catch (caughtError) {
      reportError(caughtError);
    } finally {
      setLoading(false);
    }
  }, [reportError]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const resetComposer = useCallback(() => {
    composerToken.current += 1;
    setMood("");
    setBody("");
    setEditingEntryId(null);
  }, []);

  const beginEdit = useCallback(
    (entry: JournalEntry) => {
      composerToken.current += 1;
      setMood(normalizeJournalSentiment(entry.mood));
      setBody(entry.body);
      setEditingEntryId(entry.id);
      setStatus(null);
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({
          animated: true,
          y: Math.max(formY.current - 16, 0),
        });
        bodyInputRef.current?.focus();
        announce(getJournalEditAnnouncement(entry));
      });
    },
    [announce],
  );

  const confirmDelete = useCallback(
    (entry: JournalEntry) => {
      const confirmation = getJournalDeleteConfirmation(entry);

      Alert.alert(confirmation.title, confirmation.message, [
        { style: "cancel", text: "Cancel" },
        {
          style: "destructive",
          text: "Delete",
          onPress: () => {
            void (async () => {
              setDeletingEntryId(entry.id);
              setError(null);
              try {
                await deleteJournalEntry(entry.id);
                setEntries(await fetchJournal());
                if (editingEntryId === entry.id) {
                  resetComposer();
                }
                reportStatus(getJournalStatusMessage("deleted"));
              } catch (caughtError) {
                reportError(caughtError);
              } finally {
                setDeletingEntryId(null);
              }
            })();
          },
        },
      ]);
    },
    [editingEntryId, reportError, reportStatus, resetComposer],
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

  const busy = saving || deletingEntryId !== null;

  return (
    <KeyboardAvoidingView
      // Android already resizes the window (softwareKeyboardLayoutMode defaults to "resize"),
      // so only iOS needs an inset here.
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.flex}
    >
      <ScrollView
        contentContainerStyle={styles.screen}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        ref={scrollRef}
      >
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>DAILY CHECK-IN</Text>
          <Text style={styles.title}>Activity</Text>
          <Text style={styles.body}>
            Two minutes. How did today actually go?
          </Text>
        </View>

        {error ? <ErrorBanner message={error} /> : null}
        {status ? (
          <Text
            accessibilityLiveRegion="polite"
            role="status"
            style={styles.status}
          >
            {status}
          </Text>
        ) : null}
        {loading ? <ActivityIndicator color={colors.ember} /> : null}

        <View
          onLayout={(event) => {
            formY.current = event.nativeEvent.layout.y;
          }}
          style={styles.card}
        >
          <View
            accessibilityLabel="Today's sentiment"
            accessibilityRole="radiogroup"
            style={styles.moods}
          >
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
            placeholder="What happened today? What do you want to remember? How are you feeling? What are you proud of today?"
            ref={bodyInputRef}
            style={styles.input}
            textAlignVertical="top"
            value={body}
          />
          <Button
            disabled={!mood || !body.trim() || saving}
            label={
              saving
                ? editingEntryId
                  ? "Updating…"
                  : "Saving…"
                : editingEntryId
                  ? "Update check-in"
                  : "Save check-in"
            }
            onPress={async () => {
              if (!mood) {
                return;
              }
              const submittedEntryId = editingEntryId;
              const submittedToken = composerToken.current;
              setSaving(true);
              setError(null);
              try {
                if (submittedEntryId) {
                  await updateJournalEntry(submittedEntryId, mood, body.trim());
                } else {
                  await addJournalEntry(mood, body.trim());
                }
                setEntries(await fetchJournal());
                if (composerToken.current === submittedToken) {
                  resetComposer();
                }
                reportStatus(
                  getJournalStatusMessage(
                    submittedEntryId ? "updated" : "created",
                  ),
                );
              } catch (caughtError) {
                reportError(caughtError);
              } finally {
                setSaving(false);
              }
            }}
          />
          {editingEntryId ? (
            <Pressable
              accessibilityRole="button"
              disabled={saving}
              onPress={resetComposer}
              style={({ pressed }) => [
                styles.cancelButton,
                pressed && styles.actionPressed,
              ]}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.listHeading}>
          <Text style={styles.sectionTitle}>Your entries</Text>
          <Text style={styles.entryCount}>{entries.length}</Text>
        </View>
        {entries.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.body}>
              Your first check-in will appear here.
            </Text>
          </View>
        ) : (
          entries.map((entry) => (
            <View key={entry.id} style={[styles.card, styles.entryCard]}>
              <View style={styles.entryIcon}>
                <MaterialSymbol
                  color={colors.ember}
                  name={getJournalSentimentIcon(entry.mood)}
                  size={28}
                />
              </View>
              <View style={styles.entryContent}>
                <Text style={styles.entryBody}>{entry.body}</Text>
                <View style={styles.entryFooter}>
                  <View style={styles.entryActions}>
                    <Pressable
                      accessibilityLabel={getJournalEntryActionLabel(
                        "Edit",
                        entry,
                      )}
                      accessibilityRole="button"
                      disabled={busy}
                      onPress={() => beginEdit(entry)}
                      style={({ pressed }) => [
                        styles.entryAction,
                        busy && styles.disabled,
                        pressed && styles.actionPressed,
                      ]}
                    >
                      <MaterialSymbol
                        color={colors.ink}
                        name="edit"
                        size={18}
                      />
                      <Text style={styles.entryActionText}>Edit</Text>
                    </Pressable>
                    <Pressable
                      accessibilityLabel={getJournalEntryActionLabel(
                        "Delete",
                        entry,
                      )}
                      accessibilityRole="button"
                      disabled={busy}
                      onPress={() => confirmDelete(entry)}
                      style={({ pressed }) => [
                        styles.entryAction,
                        busy && styles.disabled,
                        pressed && styles.actionPressed,
                      ]}
                    >
                      {deletingEntryId === entry.id ? (
                        <ActivityIndicator color={colors.alert} size="small" />
                      ) : (
                        <MaterialSymbol
                          color={colors.alert}
                          name="delete"
                          size={18}
                        />
                      )}
                      <Text style={styles.deleteActionText}>Delete</Text>
                    </Pressable>
                  </View>
                  <Text style={styles.entryMeta}>
                    {describeJournalEntry(entry)}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </KeyboardAvoidingView>
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
  flex: { backgroundColor: colors.canvas, flex: 1 },
  screen: { backgroundColor: colors.canvas, gap: 16, padding: 24, paddingBottom: 48 },
  status: { color: colors.ink, fontSize: 15, fontWeight: "700" },
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
  cancelButton: { alignItems: "center", justifyContent: "center", minHeight: 44 },
  cancelButtonText: { color: colors.ink, fontSize: 15, fontWeight: "800" },
  disabled: { opacity: 0.45 },
  listHeading: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  entryCount: { backgroundColor: colors.emberTint, borderRadius: 999, color: colors.ink, fontSize: 14, fontWeight: "800", minWidth: 30, padding: 6, textAlign: "center" },
  entryCard: { alignItems: "flex-start", flexDirection: "row", gap: 12 },
  entryIcon: { alignItems: "center", backgroundColor: colors.emberTint, borderRadius: 22, height: 44, justifyContent: "center", width: 44 },
  entryContent: { flex: 1, gap: 14 },
  entryBody: { color: colors.ink, fontSize: 16, lineHeight: 23 },
  entryFooter: { alignItems: "flex-end", gap: 10 },
  entryActions: { alignItems: "center", flexDirection: "row", gap: 12 },
  entryAction: { alignItems: "center", flexDirection: "row", gap: 5, justifyContent: "center", minHeight: 44, minWidth: 44, paddingHorizontal: 8 },
  entryActionText: { color: colors.ink, fontSize: 13, fontWeight: "800" },
  deleteActionText: { color: colors.alert, fontSize: 13, fontWeight: "800" },
  actionPressed: { opacity: 0.55 },
  entryMeta: { color: colors.body, fontSize: 12, textAlign: "right" },
});
