import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  fetchPhotos,
  saveReinforcementPhoto,
  type ReinforcementPhoto,
} from "../src/data/photos";
import type { SosPath } from "../src/data/sos";
import type { HardTruthTag, PhotoMode } from "../src/lib/domain";
import { explainError } from "../src/lib/errors";
import { colors } from "../src/theme/colors";
import { ErrorBanner } from "./ErrorBanner";

type Props = { mode: PhotoMode; path: SosPath };
type DraftPhoto = { uri: string; width: number };

const HARD_TRUTH_TAGS: readonly {
  label: string;
  value: HardTruthTag;
}[] = [
  { label: "Proud of this", value: "proud_of_this" },
  { label: "Never again", value: "never_again" },
];

export function PhotoComposer({ mode, path }: Props) {
  const [photos, setPhotos] = useState<ReinforcementPhoto[] | null>(null);
  const [draft, setDraft] = useState<DraftPhoto | null>(null);
  const [caption, setCaption] = useState("");
  const [tag, setTag] = useState<HardTruthTag>();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hardTruths = mode === "hard_truths";

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetchPhotos(mode)
      .then((nextPhotos) => active && setPhotos(nextPhotos))
      .catch((caughtError) => active && setError(explainError(caughtError)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [mode]);

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
    setBusy(true);
    setError(null);
    try {
      await saveReinforcementPhoto({
        caption,
        mode,
        path,
        tag,
        uri: draft.uri,
        width: draft.width,
      });
      setPhotos(await fetchPhotos(mode));
      setDraft(null);
      setCaption("");
      setTag(undefined);
    } catch (caughtError) {
      setError(explainError(caughtError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.stack}>
      {error ? <ErrorBanner message={error} /> : null}
      <View style={styles.card}>
        <Text style={styles.title}>Add your own photo</Text>
        <Text style={styles.body}>
          Choose an image that matters to you. Your photo and words stay yours.
        </Text>
        <View style={styles.row}>
          <Button
            disabled={busy}
            label="Take photo"
            onPress={takePhoto}
            secondary
          />
          <Button
            disabled={busy}
            label="Choose from library"
            onPress={choosePhoto}
            secondary
          />
        </View>
        {draft ? (
          <Image
            accessibilityLabel="Selected reinforcement photo"
            source={{ uri: draft.uri }}
            style={styles.image}
          />
        ) : null}
        {hardTruths ? (
          <View style={styles.field}>
            <Text style={styles.label}>Tag</Text>
            <View style={styles.row}>
              {HARD_TRUTH_TAGS.map((option) => (
                <Pressable
                  accessibilityRole="button"
                  key={option.value}
                  onPress={() => setTag(option.value)}
                  style={[
                    styles.tag,
                    tag === option.value && styles.tagSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.tagText,
                      tag === option.value && styles.tagTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}
        <View style={styles.field}>
          <Text style={styles.label}>
            Caption{hardTruths ? "" : " (optional)"}
          </Text>
          <TextInput
            accessibilityLabel="Photo caption"
            editable={!busy}
            multiline
            onChangeText={setCaption}
            placeholder={
              hardTruths
                ? "Write what you want to remember"
                : "Add your own words"
            }
            style={styles.input}
            textAlignVertical="top"
            value={caption}
          />
        </View>
        <Button
          disabled={!draft || busy}
          label={busy ? "Saving…" : "Save photo"}
          onPress={save}
        />
      </View>

      <View style={styles.heading}>
        <Text style={styles.title}>Your photos</Text>
        {photos ? <Text style={styles.count}>{photos.length}</Text> : null}
      </View>
      {loading ? <ActivityIndicator color={colors.ember} /> : null}
      {!loading && photos?.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.body}>
            No photos yet. Add one when you are ready.
          </Text>
        </View>
      ) : null}
      {photos?.map((photo) => (
        <View key={photo.id} style={styles.photoCard}>
          <Image
            accessibilityLabel={photo.caption || "Reinforcement photo"}
            source={{ uri: photo.signed_url }}
            style={styles.image}
          />
          {photo.mode === "hard_truths" || photo.caption ? (
            <View style={styles.photoCopy}>
              {photo.mode === "hard_truths" ? (
                <Text style={styles.photoTag}>
                  {photo.tag === "proud_of_this"
                    ? "PROUD OF THIS"
                    : "NEVER AGAIN"}
                </Text>
              ) : null}
              {photo.caption ? (
                <Text style={styles.body}>{photo.caption}</Text>
              ) : null}
            </View>
          ) : null}
        </View>
      ))}
    </View>
  );
}

function Button(props: {
  disabled: boolean;
  label: string;
  onPress: () => void;
  secondary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={props.disabled}
      onPress={props.onPress}
      style={[
        styles.button,
        props.secondary && styles.buttonSecondary,
        props.disabled && styles.disabled,
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          props.secondary && styles.buttonTextSecondary,
        ]}
      >
        {props.label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 16 },
  card: { backgroundColor: "#FFF", borderRadius: 16, gap: 14, padding: 18 },
  title: { color: colors.ink, fontSize: 21, fontWeight: "800" },
  body: { color: colors.body, fontSize: 16, lineHeight: 22 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  image: {
    aspectRatio: 4 / 3,
    backgroundColor: colors.canvas,
    borderRadius: 12,
    width: "100%",
  },
  field: { gap: 8 },
  label: { color: colors.ink, fontSize: 15, fontWeight: "800" },
  input: {
    backgroundColor: colors.canvas,
    borderColor: "#D7D9D9",
    borderRadius: 12,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 16,
    minHeight: 96,
    padding: 14,
  },
  tag: {
    borderColor: "#D7D9D9",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  tagSelected: { backgroundColor: colors.ink, borderColor: colors.ink },
  tagText: { color: colors.ink, fontSize: 14, fontWeight: "700" },
  tagTextSelected: { color: "#FFF" },
  button: {
    alignItems: "center",
    backgroundColor: colors.ember,
    borderRadius: 12,
    flexGrow: 1,
    justifyContent: "center",
    minHeight: 50,
    paddingHorizontal: 14,
  },
  buttonSecondary: {
    backgroundColor: "#FFF",
    borderColor: colors.ink,
    borderWidth: 1,
  },
  buttonText: { color: "#FFF", fontSize: 15, fontWeight: "800" },
  buttonTextSecondary: { color: colors.ink },
  disabled: { opacity: 0.45 },
  heading: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  count: {
    backgroundColor: colors.emberTint,
    borderRadius: 999,
    color: colors.ink,
    fontWeight: "800",
    minWidth: 30,
    padding: 6,
    textAlign: "center",
  },
  photoCard: { backgroundColor: "#FFF", borderRadius: 16, overflow: "hidden" },
  photoCopy: { gap: 6, padding: 16 },
  photoTag: {
    color: colors.ember,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
  },
});
