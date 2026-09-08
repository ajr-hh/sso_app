import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import {
  Image,
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { ReinforcementPhoto } from "../src/data/photos";
import type { SosPath } from "../src/data/sos";
import { explainError } from "../src/lib/errors";
import {
  getPhotoCaptionValidationError,
  MAX_WHY_PHOTOS,
  WHY_COPY,
} from "../src/presentation/why";
import { colors } from "../src/theme/colors";
import { ErrorBanner } from "./ErrorBanner";
import { SosButton } from "./SosUi";

type DraftPhoto = { uri: string; width: number };

export function WhyPhotoComposer({
  busy,
  onSave,
}: {
  busy: boolean;
  onSave: (input: { caption: string; uri: string; width: number }) => Promise<void>;
  path: SosPath;
}) {
  const [draft, setDraft] = useState<DraftPhoto | null>(null);
  const [caption, setCaption] = useState("");
  const [error, setError] = useState<string | null>(null);

  const receivePhoto = (result: ImagePicker.ImagePickerResult) => {
    if (!result.canceled && result.assets[0]) {
      setDraft({
        uri: result.assets[0].uri,
        width: result.assets[0].width,
      });
      setError(null);
    }
  };

  const choosePhoto = async () => {
    setError(null);
    try {
      receivePhoto(
        await ImagePicker.launchImageLibraryAsync({
          allowsEditing: false,
          mediaTypes: ["images"],
          quality: 1,
        }),
      );
    } catch (caughtError) {
      setError(explainError(caughtError));
    }
  };

  const takePhoto = async () => {
    setError(null);
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setError("Camera permission is required to take a photo.");
        return;
      }
      receivePhoto(
        await ImagePicker.launchCameraAsync({
          allowsEditing: false,
          mediaTypes: ["images"],
          quality: 1,
        }),
      );
    } catch (caughtError) {
      setError(explainError(caughtError));
    }
  };

  const save = async () => {
    if (!draft) {
      setError("Choose or take a photo before saving.");
      return;
    }
    const validationError = getPhotoCaptionValidationError(caption);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    Keyboard.dismiss();
    try {
      await onSave({
        caption: caption.trim(),
        uri: draft.uri,
        width: draft.width,
      });
      setDraft(null);
      setCaption("");
    } catch (caughtError) {
      setError(explainError(caughtError));
    }
  };

  return (
    <View style={styles.card}>
      {error ? <ErrorBanner message={error} /> : null}
      <View style={styles.row}>
        <SosButton
          disabled={busy}
          label={WHY_COPY.takePhoto}
          onPress={() => void takePhoto()}
        />
        <SosButton
          disabled={busy}
          label={WHY_COPY.choosePhoto}
          onPress={() => void choosePhoto()}
        />
      </View>
      {draft ? (
        <Image
          accessibilityLabel="Selected why photo"
          source={{ uri: draft.uri }}
          style={styles.image}
        />
      ) : null}
      <Text style={styles.label}>{WHY_COPY.captionLabel}</Text>
      <TextInput
        accessibilityLabel={WHY_COPY.captionLabel}
        editable={!busy}
        maxLength={140}
        onChangeText={setCaption}
        onSubmitEditing={() => Keyboard.dismiss()}
        placeholder="What does this remind you of?"
        returnKeyType="done"
        style={styles.input}
        submitBehavior="blurAndSubmit"
        value={caption}
      />
      <SosButton
        disabled={!draft || busy}
        label={busy ? WHY_COPY.savingPhoto : WHY_COPY.savePhoto}
        onPress={() => void save()}
      />
    </View>
  );
}

export function WhyPhotosFlyout({
  onClose,
  onRemove,
  onSave,
  onUpdateCaption,
  path,
  photos,
  saving,
  visible,
}: {
  onClose: () => void;
  onRemove: (photo: ReinforcementPhoto) => Promise<void>;
  onSave: (input: { caption: string; uri: string; width: number }) => Promise<void>;
  onUpdateCaption: (photo: ReinforcementPhoto, caption: string) => Promise<void>;
  path: SosPath;
  photos: readonly ReinforcementPhoto[];
  saving: boolean;
  visible: boolean;
}) {
  const insets = useSafeAreaInsets();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  if (!visible) {
    return null;
  }

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalRoot}
      >
        <Pressable
          accessibilityLabel="Close photo settings"
          accessibilityRole="button"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        >
          <View style={styles.backdrop} />
        </Pressable>
        <View accessibilityViewIsModal style={styles.sheet}>
          <ScrollView
            automaticallyAdjustKeyboardInsets
            contentContainerStyle={[
              styles.sheetContent,
              { paddingBottom: 36 + insets.bottom },
            ]}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="always"
          >
            <Text accessibilityRole="header" style={styles.sheetTitle}>
              {WHY_COPY.settingsTitle}
            </Text>
            {error ? <ErrorBanner message={error} /> : null}
            {photos.map((photo) => {
              const caption = drafts[photo.id] ?? photo.caption ?? "";
              return (
                <View key={photo.id} style={styles.card}>
                  <Image
                    accessibilityLabel={photo.caption || "Why photo"}
                    source={{ uri: photo.signed_url }}
                    style={styles.image}
                  />
                  <TextInput
                    accessibilityLabel={`Caption for ${photo.caption || "photo"}`}
                    editable={!saving}
                    onChangeText={(value) =>
                      setDrafts((current) => ({ ...current, [photo.id]: value }))
                    }
                    onSubmitEditing={() => Keyboard.dismiss()}
                    returnKeyType="done"
                    style={styles.input}
                    submitBehavior="blurAndSubmit"
                    value={caption}
                  />
                  <View style={styles.row}>
                    <SosButton
                      disabled={saving}
                      label="Save caption"
                      onPress={() => {
                        void onUpdateCaption(photo, caption).catch((caught) => {
                          setError(explainError(caught));
                        });
                      }}
                    />
                    <SosButton
                      disabled={saving}
                      label="Remove"
                      onPress={() => {
                        void onRemove(photo).catch((caught) => {
                          setError(explainError(caught));
                        });
                      }}
                    />
                  </View>
                </View>
              );
            })}
            {photos.length < MAX_WHY_PHOTOS ? (
              <WhyPhotoComposer busy={saving} onSave={onSave} path={path} />
            ) : null}
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={styles.doneButton}
            >
              <Text style={styles.doneText}>Done</Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  modalRoot: { flex: 1, justifyContent: "flex-end" },
  backdrop: { backgroundColor: "rgba(20, 27, 29, 0.55)", flex: 1 },
  sheet: {
    backgroundColor: colors.canvas,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "92%",
    overflow: "hidden",
  },
  sheetContent: { gap: 16, padding: 24 },
  sheetTitle: { color: colors.ink, fontSize: 24, fontWeight: "800" },
  card: { backgroundColor: "#FFFFFF", borderRadius: 16, gap: 12, padding: 16 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  image: {
    aspectRatio: 4 / 3,
    backgroundColor: colors.canvas,
    borderRadius: 12,
    width: "100%",
  },
  label: { color: colors.ink, fontSize: 15, fontWeight: "800" },
  input: {
    backgroundColor: colors.canvas,
    borderColor: "#D7D9D9",
    borderRadius: 12,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 16,
    minHeight: 72,
    padding: 14,
  },
  doneButton: {
    alignItems: "center",
    borderColor: "#C8CCCC",
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 52,
  },
  doneText: { color: colors.ink, fontSize: 16, fontWeight: "800" },
});
