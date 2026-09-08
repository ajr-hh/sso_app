import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
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
  SosButton,
  SosLoading,
  SosScreen,
  useSosPath,
} from "../../../components/SosUi";
import {
  createMilestoneReward,
  fetchMilestoneRewards,
  removeMilestoneReward,
  updateMilestoneReward,
  type MilestoneReward,
} from "../../../src/data/rewards";
import { logSosEvent } from "../../../src/data/sos";
import { explainError } from "../../../src/lib/errors";
import {
  getMilestonePillLabel,
  getMilestoneTileLabel,
  getMilestoneValidationError,
  MILESTONE_FIELD_LIMITS,
  REWARDS_COPY,
} from "../../../src/presentation/rewards";
import { colors } from "../../../src/theme/colors";

type RewardForm = {
  milestone: string;
  reward: string;
  progress_note: string;
};

const emptyForm: RewardForm = {
  milestone: "",
  reward: "",
  progress_note: "",
};

export default function RewardsScreen() {
  const path = useSosPath();
  const [milestones, setMilestones] = useState<MilestoneReward[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<MilestoneReward | null>(null);
  const [form, setForm] = useState<RewardForm>(emptyForm);
  const savingRef = useRef(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setMilestones(await fetchMilestoneRewards());
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

  const closeModal = () => {
    if (savingRef.current) {
      return;
    }
    setModalVisible(false);
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
  };

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setModalVisible(true);
  };

  const openEdit = (item: MilestoneReward) => {
    setEditing(item);
    setForm({
      milestone: item.milestone,
      reward: item.reward,
      progress_note: item.progress_note ?? "",
    });
    setFormError(null);
    setModalVisible(true);
  };

  const save = async () => {
    if (savingRef.current) {
      return;
    }
    const validationError = getMilestoneValidationError(form);
    if (validationError) {
      setFormError(validationError);
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setFormError(null);
    try {
      if (editing) {
        await updateMilestoneReward(editing.id, {
          milestone: form.milestone,
          reward: form.reward,
          progress_note: form.progress_note,
        });
      } else {
        await createMilestoneReward({
          milestone: form.milestone,
          reward: form.reward,
        });
      }
      setModalVisible(false);
      setEditing(null);
      setForm(emptyForm);
      await load();
    } catch (caughtError) {
      setFormError(explainError(caughtError));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const markComplete = async () => {
    if (!editing || savingRef.current) {
      return;
    }
    const validationError = getMilestoneValidationError(form);
    if (validationError) {
      setFormError(validationError);
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setFormError(null);
    try {
      await updateMilestoneReward(editing.id, {
        milestone: form.milestone,
        reward: form.reward,
        progress_note: form.progress_note,
        completed: true,
      });
      setModalVisible(false);
      setEditing(null);
      setForm(emptyForm);
      await load();
    } catch (caughtError) {
      setFormError(explainError(caughtError));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const remove = async (item: MilestoneReward) => {
    if (savingRef.current) {
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setFormError(null);
    try {
      await removeMilestoneReward(item.id);
      setModalVisible(false);
      setEditing(null);
      setForm(emptyForm);
      await load();
    } catch (caughtError) {
      setFormError(explainError(caughtError));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const confirmRemove = () => {
    if (!editing || savingRef.current) {
      return;
    }
    const item = editing;
    Alert.alert(
      REWARDS_COPY.removeTitle,
      REWARDS_COPY.removeBody(item.milestone),
      [
        { text: "Cancel", style: "cancel" },
        {
          text: REWARDS_COPY.remove,
          style: "destructive",
          onPress: () => {
            void remove(item);
          },
        },
      ],
    );
  };

  if (!milestones && !error) {
    return (
      <SosScreen eyebrow="SMALL WINS" showBack title={REWARDS_COPY.title}>
        <SosLoading label={REWARDS_COPY.loading} />
      </SosScreen>
    );
  }

  if (!milestones) {
    return (
      <SosScreen eyebrow="SMALL WINS" showBack title={REWARDS_COPY.title}>
        {error ? <ErrorBanner message={error} /> : null}
        <SosButton label="Try again" onPress={() => void load()} />
      </SosScreen>
    );
  }

  return (
    <>
      <SosScreen
        eyebrow="SMALL WINS"
        showBack
        subtitle={REWARDS_COPY.subtitle}
        title={REWARDS_COPY.title}
      >
        {error ? <ErrorBanner message={error} /> : null}
        {milestones.map((item) => {
          const pill = getMilestonePillLabel(item);
          return (
            <Pressable
              accessibilityLabel={getMilestoneTileLabel(item)}
              accessibilityRole="button"
              key={item.id}
              onPress={() => openEdit(item)}
              style={styles.tile}
            >
              <View style={styles.tileTop}>
                <Text style={styles.milestone}>{item.milestone}</Text>
                <View style={styles.pill}>
                  {item.completed ? (
                    <MaterialSymbol
                      color={colors.body}
                      name="check_circle"
                      size={14}
                    />
                  ) : null}
                  <Text style={styles.pillText}>{pill}</Text>
                </View>
              </View>
              <Text style={styles.reward}>{item.reward}</Text>
            </Pressable>
          );
        })}
        <Pressable
          accessibilityRole="button"
          onPress={openAdd}
          style={styles.addButton}
        >
          <MaterialSymbol name="add" size={22} />
          <Text style={styles.addButtonText}>{REWARDS_COPY.add}</Text>
        </Pressable>
        <Text style={styles.privacy}>{REWARDS_COPY.privacy}</Text>
      </SosScreen>

      <Modal
        animationType="slide"
        onRequestClose={closeModal}
        transparent
        visible={modalVisible}
      >
        <View style={styles.modalRoot}>
          <Pressable
            accessibilityLabel="Close milestone form"
            accessibilityRole="button"
            disabled={saving}
            onPress={closeModal}
            style={StyleSheet.absoluteFill}
          >
            <View style={styles.backdrop} />
          </Pressable>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            pointerEvents="box-none"
            style={styles.keyboardView}
          >
            <View
              accessibilityViewIsModal
              onAccessibilityEscape={closeModal}
              style={styles.sheet}
            >
              <ScrollView
                contentContainerStyle={styles.sheetContent}
                keyboardShouldPersistTaps="handled"
              >
                <Text accessibilityRole="header" style={styles.sheetTitle}>
                  {editing ? REWARDS_COPY.editTitle : REWARDS_COPY.addTitle}
                </Text>
                {formError ? <ErrorBanner message={formError} /> : null}
                <View style={styles.field}>
                  <Text accessible={false} style={styles.label}>
                    {REWARDS_COPY.milestoneLabel}
                  </Text>
                  <TextInput
                    accessibilityLabel={REWARDS_COPY.milestoneLabel}
                    editable={!saving}
                    maxLength={MILESTONE_FIELD_LIMITS.milestone}
                    onChangeText={(milestone) =>
                      setForm((current) => ({ ...current, milestone }))
                    }
                    style={styles.input}
                    value={form.milestone}
                  />
                </View>
                <View style={styles.field}>
                  <Text accessible={false} style={styles.label}>
                    {REWARDS_COPY.rewardLabel}
                  </Text>
                  <TextInput
                    accessibilityLabel={REWARDS_COPY.rewardLabel}
                    editable={!saving}
                    maxLength={MILESTONE_FIELD_LIMITS.reward}
                    onChangeText={(reward) =>
                      setForm((current) => ({ ...current, reward }))
                    }
                    style={styles.input}
                    value={form.reward}
                  />
                </View>
                {editing ? (
                  <View style={styles.field}>
                    <Text accessible={false} style={styles.label}>
                      {REWARDS_COPY.progressLabel}
                    </Text>
                    <TextInput
                      accessibilityLabel={REWARDS_COPY.progressLabel}
                      editable={!saving}
                      maxLength={MILESTONE_FIELD_LIMITS.progress_note}
                      onChangeText={(progress_note) =>
                        setForm((current) => ({ ...current, progress_note }))
                      }
                      style={styles.input}
                      value={form.progress_note}
                    />
                  </View>
                ) : null}
                <View style={styles.actions}>
                  <Pressable
                    accessibilityRole="button"
                    disabled={saving}
                    onPress={closeModal}
                    style={[styles.cancelButton, saving && styles.disabled]}
                  >
                    <Text style={styles.cancelText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ busy: saving }}
                    disabled={saving}
                    onPress={() => void save()}
                    style={[styles.saveButton, saving && styles.disabled]}
                  >
                    <Text style={styles.saveText}>
                      {saving ? "Saving…" : REWARDS_COPY.save}
                    </Text>
                  </Pressable>
                </View>
                {editing ? (
                  <View style={styles.editActions}>
                    {editing.completed ? null : (
                      <Pressable
                        accessibilityRole="button"
                        disabled={saving}
                        onPress={() => void markComplete()}
                        style={[styles.completeButton, saving && styles.disabled]}
                      >
                        <MaterialSymbol
                          color={colors.ink}
                          name="check_circle"
                          size={18}
                        />
                        <Text style={styles.completeText}>
                          {REWARDS_COPY.markComplete}
                        </Text>
                      </Pressable>
                    )}
                    <Pressable
                      accessibilityRole="button"
                      disabled={saving}
                      onPress={confirmRemove}
                      style={[styles.removeButton, saving && styles.disabled]}
                    >
                      <Text style={styles.removeText}>{REWARDS_COPY.remove}</Text>
                    </Pressable>
                  </View>
                ) : null}
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  tile: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    gap: 10,
    padding: 18,
  },
  tileTop: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  milestone: {
    color: colors.ink,
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
  },
  pill: {
    alignItems: "center",
    backgroundColor: "#E8EBEB",
    borderRadius: 999,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pillText: {
    color: colors.body,
    fontSize: 12,
    fontWeight: "700",
  },
  reward: {
    color: colors.body,
    fontSize: 15,
    lineHeight: 21,
  },
  addButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#C8CCCC",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    minHeight: 54,
    paddingHorizontal: 16,
  },
  addButtonText: { color: colors.ink, fontSize: 16, fontWeight: "800" },
  privacy: {
    color: colors.body,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  modalRoot: { flex: 1, justifyContent: "flex-end" },
  backdrop: { backgroundColor: "rgba(20, 27, 29, 0.55)", flex: 1 },
  keyboardView: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
    overflow: "hidden",
  },
  sheetContent: { gap: 16, padding: 24, paddingBottom: 36 },
  sheetTitle: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: "800",
  },
  field: { gap: 7 },
  label: { color: colors.ink, fontSize: 14, fontWeight: "700" },
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
  actions: { flexDirection: "row", gap: 12 },
  cancelButton: {
    alignItems: "center",
    borderColor: "#C8CCCC",
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 52,
  },
  cancelText: { color: colors.ink, fontSize: 16, fontWeight: "800" },
  saveButton: {
    alignItems: "center",
    backgroundColor: colors.ember,
    borderRadius: 12,
    flex: 1.4,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 14,
  },
  saveText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  editActions: { gap: 10 },
  completeButton: {
    alignItems: "center",
    backgroundColor: colors.emberTint,
    borderRadius: 12,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 50,
  },
  completeText: { color: colors.ink, fontSize: 16, fontWeight: "800" },
  removeButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  removeText: { color: colors.alert, fontSize: 14, fontWeight: "800" },
  disabled: { opacity: 0.45 },
});
