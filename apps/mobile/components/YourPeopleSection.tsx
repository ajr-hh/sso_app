import { useRef, useState } from "react";
import {
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

import type {
  AccountabilityContact,
  CreateAccountabilityContactInput,
} from "../src/data/accountabilityContacts";
import { explainError } from "../src/lib/errors";
import {
  getAccountabilityContactValidationError,
  normalizeAccountabilityContact,
  RELATIONSHIP_OPTIONS,
  type AccountabilityContactInput,
} from "../src/presentation/accountabilityContacts";
import { colors } from "../src/theme/colors";
import { ErrorBanner } from "./ErrorBanner";
import { MaterialSymbol } from "./MaterialSymbol";

const EMPTY_FORM: AccountabilityContactInput = {
  name: "",
  phone: "",
  email: "",
  relationship: null,
};

export type YourPeopleSectionProps = {
  contacts: readonly AccountabilityContact[];
  loading: boolean;
  loadError: string | null;
  modalVisible: boolean;
  status: string | null;
  onCreate: (
    input: CreateAccountabilityContactInput,
  ) => Promise<AccountabilityContact>;
  onModalVisibleChange: (visible: boolean) => void;
  onRemove: (contact: AccountabilityContact) => Promise<void>;
  onRetry: () => void;
};

export function YourPeopleSection({
  contacts,
  loading,
  loadError,
  modalVisible,
  status,
  onCreate,
  onModalVisibleChange,
  onRemove,
  onRetry,
}: YourPeopleSectionProps) {
  const [form, setForm] = useState<AccountabilityContactInput>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [tileError, setTileError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [removingIds, setRemovingIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const savingRef = useRef(false);
  const removingIdsRef = useRef<ReadonlySet<string>>(new Set());
  const nameRef = useRef<TextInput>(null);

  const closeModal = () => {
    if (!savingRef.current) {
      setFormError(null);
      onModalVisibleChange(false);
    }
  };

  const saveContact = async () => {
    if (savingRef.current) {
      return;
    }

    const validationError = getAccountabilityContactValidationError(form);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    const normalized = normalizeAccountabilityContact(form);
    if (normalized.relationship === null) {
      return;
    }

    savingRef.current = true;
    setSaving(true);
    setFormError(null);
    try {
      await onCreate({
        name: normalized.name,
        phone: normalized.phone,
        email: normalized.email,
        relationship: normalized.relationship,
      });
      setForm(EMPTY_FORM);
      onModalVisibleChange(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : explainError(error));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const confirmRemove = (contact: AccountabilityContact) => {
    Alert.alert(
      "Remove loved one?",
      `Remove ${contact.name} from Your people?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            if (removingIdsRef.current.has(contact.id)) {
              return;
            }
            const nextRemovingIds = new Set(removingIdsRef.current);
            nextRemovingIds.add(contact.id);
            removingIdsRef.current = nextRemovingIds;
            setRemovingIds(nextRemovingIds);
            setTileError(null);
            void onRemove(contact)
              .catch((error: unknown) => {
                setTileError(
                  error instanceof Error ? error.message : explainError(error),
                );
              })
              .finally(() => {
                const remainingIds = new Set(removingIdsRef.current);
                remainingIds.delete(contact.id);
                removingIdsRef.current = remainingIds;
                setRemovingIds(remainingIds);
              });
          },
        },
      ],
    );
  };

  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>
        Your people
      </Text>
      <Text style={styles.supporting}>
        Accountability partners SOS can reach on your behalf.
      </Text>

      {loadError ? (
        <View style={styles.feedback}>
          <ErrorBanner message={loadError} />
          <Pressable
            accessibilityRole="button"
            onPress={onRetry}
            style={styles.retryButton}
          >
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : null}
      {tileError ? <ErrorBanner message={tileError} /> : null}
      {status ? (
        <Text accessibilityLiveRegion="polite" style={styles.status}>
          {status}
        </Text>
      ) : null}
      {loading ? (
        <View accessibilityLabel="Loading your people" style={styles.loading}>
          <ActivityIndicator color={colors.ember} />
        </View>
      ) : null}

      {contacts.map((contact) => {
        const relationship =
          RELATIONSHIP_OPTIONS.find(
            (option) => option.value === contact.relationship,
          )?.label ?? contact.relationship;
        const removing = removingIds.has(contact.id);

        return (
          <View key={contact.id} style={styles.contact}>
            <View style={styles.contactDetails}>
              <Text style={styles.contactName}>{contact.name}</Text>
              <Text style={styles.contactMeta}>{relationship}</Text>
              <Text style={styles.contactMeta}>{contact.phone}</Text>
              <Text style={styles.contactMeta}>{contact.email}</Text>
            </View>
            <Pressable
              accessibilityLabel={`Remove ${contact.name}`}
              accessibilityRole="button"
              accessibilityState={{ busy: removing, disabled: removing }}
              disabled={removing}
              onPress={() => confirmRemove(contact)}
              style={[styles.removeButton, removing && styles.disabled]}
            >
              <Text style={styles.removeText}>
                {removing ? "Removing…" : "Remove"}
              </Text>
            </Pressable>
          </View>
        );
      })}

      <Pressable
        accessibilityLabel="Add a loved one to Your people"
        accessibilityRole="button"
        onPress={() => {
          setFormError(null);
          onModalVisibleChange(true);
        }}
        style={styles.addButton}
      >
        <MaterialSymbol name="person_add" size={22} />
        <Text style={styles.addButtonText}>Add a loved one</Text>
      </Pressable>

      <Modal
        animationType="slide"
        onRequestClose={closeModal}
        onShow={() => nameRef.current?.focus()}
        transparent
        visible={modalVisible}
      >
        <View style={styles.modalRoot}>
          <Pressable
            accessibilityLabel="Close add loved one form"
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
                  Add a loved one
                </Text>
                {formError ? <ErrorBanner message={formError} /> : null}

                <Field label="Name" required>
                  <TextInput
                    accessibilityHint="Required"
                    accessibilityLabel="Name"
                    autoCapitalize="words"
                    autoComplete="name"
                    editable={!saving}
                    onChangeText={(name) =>
                      setForm((current) => ({ ...current, name }))
                    }
                    ref={nameRef}
                    style={styles.input}
                    value={form.name}
                  />
                </Field>
                <Field label="Phone number" required>
                  <TextInput
                    accessibilityHint="Required"
                    accessibilityLabel="Phone number"
                    autoComplete="tel"
                    editable={!saving}
                    inputMode="tel"
                    onChangeText={(phone) =>
                      setForm((current) => ({ ...current, phone }))
                    }
                    style={styles.input}
                    value={form.phone}
                  />
                </Field>
                <Field label="Email" required>
                  <TextInput
                    accessibilityHint="Required"
                    accessibilityLabel="Email"
                    autoCapitalize="none"
                    autoComplete="email"
                    autoCorrect={false}
                    editable={!saving}
                    inputMode="email"
                    onChangeText={(email) =>
                      setForm((current) => ({ ...current, email }))
                    }
                    style={styles.input}
                    value={form.email}
                  />
                </Field>

                <View style={styles.field}>
                  <Text style={styles.label}>Relationship *</Text>
                  <View
                    accessibilityHint="Required"
                    accessibilityLabel="Relationship"
                    accessibilityRole="radiogroup"
                    style={styles.relationships}
                  >
                    {RELATIONSHIP_OPTIONS.map((option) => {
                      const selected = form.relationship === option.value;
                      return (
                        <Pressable
                          accessibilityRole="radio"
                          accessibilityState={{ selected }}
                          disabled={saving}
                          key={option.value}
                          onPress={() =>
                            setForm((current) => ({
                              ...current,
                              relationship: option.value,
                            }))
                          }
                          style={[
                            styles.relationship,
                            selected && styles.relationshipSelected,
                          ]}
                        >
                          <Text style={styles.relationshipText}>
                            {option.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

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
                    onPress={() => void saveContact()}
                    style={[styles.saveButton, saving && styles.disabled]}
                  >
                    <Text style={styles.saveText}>
                      {saving ? "Saving…" : "Save loved one"}
                    </Text>
                  </Pressable>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

function Field({
  children,
  label,
  required = false,
}: {
  children: React.ReactNode;
  label: string;
  required?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text accessible={false} style={styles.label}>
        {label}
        {required ? " *" : ""}
      </Text>
      {children}
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
  sectionTitle: {
    color: colors.ink,
    fontSize: 21,
    fontWeight: "800",
  },
  supporting: {
    color: colors.body,
    fontSize: 15,
    lineHeight: 21,
  },
  feedback: { gap: 10 },
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
  retryText: { color: colors.ink, fontSize: 15, fontWeight: "800" },
  status: { color: "#27633E", fontSize: 15, fontWeight: "700" },
  loading: { alignItems: "center", minHeight: 48, justifyContent: "center" },
  contact: {
    alignItems: "center",
    borderColor: "#D7D9D9",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 14,
  },
  contactDetails: { flex: 1, gap: 2 },
  contactName: { color: colors.ink, fontSize: 16, fontWeight: "800" },
  contactMeta: { color: colors.body, fontSize: 14, lineHeight: 19 },
  removeButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 8,
  },
  removeText: { color: colors.alert, fontSize: 14, fontWeight: "800" },
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
  disabled: { opacity: 0.45 },
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
  relationships: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  relationship: {
    borderColor: "#C8CCCC",
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  relationshipSelected: {
    backgroundColor: colors.emberTint,
    borderColor: colors.ember,
  },
  relationshipText: { color: colors.ink, fontSize: 15, fontWeight: "700" },
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
});
