import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
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

import type { Craving } from "../src/data/cravings";
import { explainError } from "../src/lib/errors";
import {
  getCravingLabelValidationError,
  normalizeCravingLabel,
} from "../src/presentation/cravings";
import { colors } from "../src/theme/colors";
import { ErrorBanner } from "./ErrorBanner";
import { MaterialSymbol } from "./MaterialSymbol";

export type AddCravingFlyoutProps = {
  existingLabels: readonly string[];
  onClose: () => void;
  onCreate: (label: string) => Promise<Craving>;
  visible: boolean;
};

export function AddCravingFlyout({
  existingLabels,
  onClose,
  onCreate,
  visible,
}: AddCravingFlyoutProps) {
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const inputRef = useRef<TextInput>(null);

  const close = () => {
    if (savingRef.current) return;
    setLabel("");
    setError(null);
    onClose();
  };

  const save = async () => {
    if (savingRef.current) return;
    const validationError = getCravingLabelValidationError(
      label,
      existingLabels.map((item) => item.toLowerCase()),
    );
    if (validationError) {
      setError(validationError);
      return;
    }

    const normalized = normalizeCravingLabel(label);
    savingRef.current = true;
    setSaving(true);
    setError(null);
    try {
      await onCreate(normalized);
      setLabel("");
      onClose();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : explainError(caughtError),
      );
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={close}
      onShow={() => inputRef.current?.focus()}
      transparent
      visible={visible}
    >
      <View style={styles.modalRoot}>
        <Pressable
          accessibilityLabel="Close add craving form"
          accessibilityRole="button"
          disabled={saving}
          onPress={close}
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
            onAccessibilityEscape={close}
            style={styles.sheet}
          >
            <ScrollView
              contentContainerStyle={styles.sheetContent}
              keyboardShouldPersistTaps="handled"
            >
              <Text accessibilityRole="header" style={styles.sheetTitle}>
                Add a craving
              </Text>
              {error ? <ErrorBanner message={error} /> : null}
              <Text style={styles.label}>Craving name *</Text>
              <TextInput
                accessibilityHint="Required"
                accessibilityLabel="Craving name"
                autoCapitalize="sentences"
                editable={!saving}
                maxLength={60}
                onChangeText={setLabel}
                ref={inputRef}
                style={styles.input}
                value={label}
              />
              <View style={styles.actions}>
                <Pressable
                  accessibilityRole="button"
                  disabled={saving}
                  onPress={close}
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
                    {saving ? "Adding…" : "Add craving"}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

export type UsualCravingsSectionProps = {
  cravings: readonly Craving[];
  loading: boolean;
  loadError: string | null;
  status: string | null;
  onCreate: (label: string) => Promise<Craving>;
  onRemove: (craving: Craving) => Promise<void>;
  onRetry: () => void;
};

export function UsualCravingsSection({
  cravings,
  loading,
  loadError,
  status,
  onCreate,
  onRemove,
  onRetry,
}: UsualCravingsSectionProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [tileError, setTileError] = useState<string | null>(null);
  const [removingIds, setRemovingIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const removingIdsRef = useRef<ReadonlySet<string>>(new Set());

  useEffect(() => {
    if (status && Platform.OS === "ios") {
      AccessibilityInfo.announceForAccessibility(status);
    }
  }, [status]);

  const confirmRemove = (craving: Craving) => {
    Alert.alert(
      "Remove craving?",
      `Remove ${craving.label} from your usual cravings?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            if (removingIdsRef.current.has(craving.id)) return;
            const next = new Set(removingIdsRef.current);
            next.add(craving.id);
            removingIdsRef.current = next;
            setRemovingIds(next);
            setTileError(null);
            void onRemove(craving)
              .catch((caughtError: unknown) =>
                setTileError(
                  caughtError instanceof Error
                    ? caughtError.message
                    : explainError(caughtError),
                ),
              )
              .finally(() => {
                const remaining = new Set(removingIdsRef.current);
                remaining.delete(craving.id);
                removingIdsRef.current = remaining;
                setRemovingIds(remaining);
              });
          },
        },
      ],
    );
  };

  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.title}>
        Usual cravings
      </Text>
      <Text style={styles.supporting}>
        Add the foods you most often want to swap.
      </Text>
      {loadError ? (
        <View style={styles.feedback}>
          <ErrorBanner message={loadError} />
          <Pressable
            accessibilityRole="button"
            onPress={onRetry}
            style={styles.retryButton}
          >
            <Text style={styles.secondaryText}>Try again</Text>
          </Pressable>
        </View>
      ) : null}
      {tileError ? <ErrorBanner message={tileError} /> : null}
      {status ? (
        <Text
          accessibilityLiveRegion={
            Platform.OS === "android" ? "polite" : undefined
          }
          style={styles.status}
        >
          {status}
        </Text>
      ) : null}
      {loading ? (
        <View accessibilityLabel="Loading usual cravings" style={styles.loading}>
          <ActivityIndicator color={colors.ember} />
        </View>
      ) : null}
      {cravings.map((craving) => {
        const removing = removingIds.has(craving.id);
        return (
          <View key={craving.id} style={styles.craving}>
            <Text style={styles.cravingText}>{craving.label}</Text>
            <Pressable
              accessibilityLabel={`Remove ${craving.label}`}
              accessibilityRole="button"
              accessibilityState={{ busy: removing, disabled: removing }}
              disabled={removing}
              onPress={() => confirmRemove(craving)}
              style={styles.remove}
            >
              <Text style={styles.removeText}>
                {removing ? "Removing…" : "Remove"}
              </Text>
            </Pressable>
          </View>
        );
      })}
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          setTileError(null);
          setModalVisible(true);
        }}
        style={styles.addButton}
      >
        <MaterialSymbol name="nutrition" size={22} />
        <Text style={styles.addText}>Add a craving</Text>
      </Pressable>
      <AddCravingFlyout
        existingLabels={cravings.map(({ label }) => label)}
        onClose={() => setModalVisible(false)}
        onCreate={onCreate}
        visible={modalVisible}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    gap: 14,
    padding: 18,
  },
  title: { color: colors.ink, fontSize: 21, fontWeight: "800" },
  supporting: { color: colors.body, fontSize: 15, lineHeight: 21 },
  feedback: { gap: 10 },
  status: { color: "#27633E", fontSize: 15, fontWeight: "700" },
  loading: { alignItems: "center", minHeight: 48, justifyContent: "center" },
  retryButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderColor: colors.ink,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 16,
  },
  craving: {
    alignItems: "center",
    borderColor: "#D7D9D9",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    paddingHorizontal: 14,
  },
  cravingText: { color: colors.ink, flex: 1, fontSize: 16, fontWeight: "700" },
  remove: { justifyContent: "center", minHeight: 48, paddingHorizontal: 8 },
  removeText: { color: colors.alert, fontSize: 14, fontWeight: "800" },
  addButton: {
    alignItems: "center",
    borderColor: "#C8CCCC",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    minHeight: 54,
  },
  addText: { color: colors.ink, fontSize: 16, fontWeight: "800" },
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
  sheetTitle: { color: colors.ink, fontSize: 24, fontWeight: "800" },
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
  },
  saveText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  secondaryText: { color: colors.ink, fontSize: 15, fontWeight: "800" },
  disabled: { opacity: 0.45 },
});
