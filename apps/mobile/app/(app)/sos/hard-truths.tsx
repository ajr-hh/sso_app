import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  Image,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { ErrorBanner } from "../../../components/ErrorBanner";
import { MaterialSymbol } from "../../../components/MaterialSymbol";
import {
  SosLoading,
  SosScreen,
  useSosPath,
} from "../../../components/SosUi";
import {
  fetchHardTruthsCoachLine,
  generateHardTruthsCoachLine,
  saveHardTruthsCoachLine,
} from "../../../src/data/hardTruthsCoach";
import {
  fetchPhotos,
  saveReinforcementPhoto,
  setPhotoFavorited,
  type ReinforcementPhoto,
} from "../../../src/data/photos";
import { fetchProfile } from "../../../src/data/profile";
import { logSosEvent } from "../../../src/data/sos";
import type { HardTruthTag } from "../../../src/lib/domain";
import { explainError } from "../../../src/lib/errors";
import { getCoachName, parseCoachId } from "../../../src/presentation/coaches";
import {
  getCoachNoFilterLabel,
  getFavoritePhotoLabel,
  getHardTruthTaggedLabel,
  HARD_TRUTHS_COPY,
  quoteHardTruthCaption,
} from "../../../src/presentation/hardTruths";
import { colors } from "../../../src/theme/colors";

type DraftPhoto = { uri: string; width: number };

export default function HardTruthsScreen() {
  const path = useSosPath();
  const router = useRouter();
  const savingRef = useRef(false);
  const [coachName, setCoachName] = useState("Marcus");
  const [coachLine, setCoachLine] = useState<string>(
    HARD_TRUTHS_COPY.coachDefault,
  );
  const [photos, setPhotos] = useState<ReinforcementPhoto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [tag, setTag] = useState<HardTruthTag>();
  const [draft, setDraft] = useState<DraftPhoto | null>(null);
  const [caption, setCaption] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [profile, nextPhotos] = await Promise.all([
        fetchProfile(),
        fetchPhotos("hard_truths"),
      ]);
      const coachStyle = parseCoachId(profile.coach_style);
      setCoachName(getCoachName(coachStyle));
      setPhotos(nextPhotos);
      const existing = await fetchHardTruthsCoachLine(coachStyle);
      if (existing) {
        setCoachLine(existing.body);
      } else {
        try {
          const body = await generateHardTruthsCoachLine(coachStyle);
          await saveHardTruthsCoachLine({ coachStyle, body });
          setCoachLine(body);
        } catch {
          setCoachLine(HARD_TRUTHS_COPY.coachDefault);
        }
      }
      setError(null);
    } catch (caughtError) {
      setError(explainError(caughtError));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void load();
      void logSosEvent(path, "hard_truths").catch((caughtError) => {
        if (active) {
          setError(explainError(caughtError));
        }
      });
      return () => {
        active = false;
      };
    }, [load, path]),
  );

  const upload = async () => {
    setFormError(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: false,
        mediaTypes: ["images"],
        quality: 1,
      });
      if (!result.canceled && result.assets[0]) {
        setDraft({
          uri: result.assets[0].uri,
          width: result.assets[0].width,
        });
      }
    } catch (caughtError) {
      setFormError(explainError(caughtError));
    }
  };

  const save = async () => {
    if (savingRef.current || !draft) {
      if (!draft) {
        setFormError("Choose a photo before saving.");
      }
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setFormError(null);
    try {
      await saveReinforcementPhoto({
        caption,
        mode: "hard_truths",
        path,
        tag,
        uri: draft.uri,
        width: draft.width,
      });
      setDraft(null);
      setCaption("");
      setTag(undefined);
      setPhotos(await fetchPhotos("hard_truths"));
    } catch (caughtError) {
      setFormError(explainError(caughtError));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const favorite = async (photo: ReinforcementPhoto) => {
    if (savingRef.current) {
      return;
    }
    savingRef.current = true;
    try {
      await setPhotoFavorited(photo.id, !photo.favorited);
      setPhotos((current) =>
        (current ?? []).map((item) =>
          item.id === photo.id
            ? { ...item, favorited: !item.favorited }
            : item,
        ),
      );
    } catch (caughtError) {
      setError(explainError(caughtError));
    } finally {
      savingRef.current = false;
    }
  };

  if (!photos && !error) {
    return (
      <SosScreen eyebrow="HARD TRUTHS" showBack title={HARD_TRUTHS_COPY.title}>
        <SosLoading label="Loading Hard Truths…" />
      </SosScreen>
    );
  }

  return (
    <SosScreen
      eyebrow="HARD TRUTHS"
      keyboardAware
      showBack
      subtitle={HARD_TRUTHS_COPY.subtitle}
      title={HARD_TRUTHS_COPY.title}
    >
      {error ? <ErrorBanner message={error} /> : null}

      <View style={styles.coachCard}>
        <View style={styles.coachPill}>
          <Text style={styles.coachPillText}>
            {getCoachNoFilterLabel(coachName)}
          </Text>
        </View>
        <Text style={styles.coachLine}>{coachLine}</Text>
      </View>

      <View style={styles.callCard}>
        <Text style={styles.callEyebrow}>{HARD_TRUTHS_COPY.yourCallEyebrow}</Text>
        <Text style={styles.callBody}>{HARD_TRUTHS_COPY.yourCallBody}</Text>
      </View>

      <Text style={styles.photosTitle}>{HARD_TRUTHS_COPY.photosTitle}</Text>

      {(photos ?? []).map((photo) => {
        const tagValue =
          photo.tag === "proud_of_this" || photo.tag === "never_again"
            ? photo.tag
            : "proud_of_this";
        return (
          <View key={photo.id} style={styles.photoCard}>
            <View style={styles.photoThumb}>
              {photo.signed_url ? (
                <Image
                  accessibilityLabel={photo.caption || "Hard Truths photo"}
                  source={{ uri: photo.signed_url }}
                  style={styles.photoImage}
                />
              ) : (
                <MaterialSymbol
                  color={colors.ember}
                  name="photo_camera"
                  size={26}
                />
              )}
              <Pressable
                accessibilityLabel={getFavoritePhotoLabel(
                  photo.caption ?? "",
                  photo.favorited,
                )}
                accessibilityRole="button"
                onPress={() => void favorite(photo)}
                style={styles.heart}
              >
                <MaterialSymbol
                  color={photo.favorited ? colors.alert : colors.ink}
                  filled={photo.favorited}
                  name="favorite"
                  size={18}
                />
              </Pressable>
            </View>
            <View style={styles.photoCopy}>
              <View style={styles.tagPill}>
                <Text style={styles.tagText}>
                  {getHardTruthTaggedLabel(tagValue)}
                </Text>
              </View>
              <Text style={styles.captionLabel}>{HARD_TRUTHS_COPY.yourCaption}</Text>
              {photo.caption ? (
                <Text style={styles.caption}>
                  {quoteHardTruthCaption(photo.caption)}
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}

      <View style={styles.addCard}>
        {formError ? <ErrorBanner message={formError} /> : null}
        <View style={styles.addRow}>
          <View style={styles.addThumb}>
            <MaterialSymbol name="add" size={22} />
          </View>
          <View style={styles.addCopy}>
            <Text style={styles.addBody}>{HARD_TRUTHS_COPY.addBody}</Text>
            <View style={styles.pills}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setTag("proud_of_this")}
                style={[
                  styles.pill,
                  tag === "proud_of_this" && styles.pillSelected,
                ]}
              >
                <Text style={styles.pillText}>{HARD_TRUTHS_COPY.proud}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => setTag("never_again")}
                style={[
                  styles.pill,
                  tag === "never_again" && styles.pillSelected,
                ]}
              >
                <Text style={styles.pillText}>{HARD_TRUTHS_COPY.never}</Text>
              </Pressable>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => void upload()}
              style={styles.upload}
            >
              <Text style={styles.uploadText}>{HARD_TRUTHS_COPY.upload}</Text>
            </Pressable>
            {draft ? (
              <>
                <Image
                  accessibilityLabel="Selected Hard Truths photo"
                  source={{ uri: draft.uri }}
                  style={styles.draft}
                />
                <TextInput
                  accessibilityLabel={HARD_TRUTHS_COPY.captionLabel}
                  editable={!saving}
                  maxLength={140}
                  onChangeText={setCaption}
                  onSubmitEditing={() => Keyboard.dismiss()}
                  placeholder="Write your own caption"
                  returnKeyType="done"
                  style={styles.input}
                  submitBehavior="blurAndSubmit"
                  value={caption}
                />
                <Pressable
                  accessibilityRole="button"
                  disabled={saving}
                  onPress={() => void save()}
                  style={styles.save}
                >
                  <Text style={styles.saveText}>
                    {saving ? HARD_TRUTHS_COPY.saving : HARD_TRUTHS_COPY.save}
                  </Text>
                </Pressable>
              </>
            ) : null}
          </View>
        </View>
      </View>

      <Text style={styles.footnote}>{HARD_TRUTHS_COPY.footnote}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.navigate("/(app)/(tabs)/home")}
        style={styles.homeButton}
      >
        <Text style={styles.homeButtonText}>{HARD_TRUTHS_COPY.backOnTrack}</Text>
      </Pressable>
    </SosScreen>
  );
}

const styles = StyleSheet.create({
  coachCard: {
    backgroundColor: colors.ink,
    borderRadius: 16,
    gap: 10,
    padding: 18,
  },
  coachPill: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  coachPillText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  coachLine: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 23,
  },
  callCard: {
    backgroundColor: colors.ink,
    borderRadius: 16,
    gap: 6,
    padding: 18,
  },
  callEyebrow: {
    color: "#C7CBCC",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  callBody: {
    color: "#FFFFFF",
    fontSize: 15,
    lineHeight: 22,
  },
  photosTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "800",
  },
  photoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    flexDirection: "row",
    gap: 12,
    padding: 16,
  },
  photoThumb: {
    alignItems: "center",
    backgroundColor: colors.emberTint,
    borderRadius: 12,
    height: 84,
    justifyContent: "center",
    overflow: "hidden",
    width: 84,
  },
  photoImage: { height: "100%", width: "100%" },
  heart: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    height: 28,
    justifyContent: "center",
    position: "absolute",
    right: 4,
    top: 4,
    width: 28,
  },
  photoCopy: { flex: 1, gap: 6 },
  tagPill: {
    alignSelf: "flex-start",
    backgroundColor: colors.emberTint,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tagText: { color: colors.ink, fontSize: 12, fontWeight: "800" },
  captionLabel: {
    color: colors.body,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  caption: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 21,
  },
  addCard: {
    backgroundColor: "transparent",
    borderColor: "#C8CCCC",
    borderRadius: 16,
    borderStyle: "dashed",
    borderWidth: 1.5,
    padding: 16,
  },
  addRow: { flexDirection: "row", gap: 12 },
  addThumb: {
    alignItems: "center",
    backgroundColor: colors.emberTint,
    borderRadius: 12,
    height: 84,
    justifyContent: "center",
    width: 84,
  },
  addCopy: { flex: 1, gap: 10 },
  addBody: { color: colors.body, fontSize: 14, lineHeight: 20 },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: {
    borderColor: "#C8CCCC",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pillSelected: {
    backgroundColor: colors.emberTint,
    borderColor: colors.ember,
  },
  pillText: { color: colors.ink, fontSize: 13, fontWeight: "700" },
  upload: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderColor: colors.ink,
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 40,
    paddingHorizontal: 14,
    justifyContent: "center",
  },
  uploadText: { color: colors.ink, fontSize: 14, fontWeight: "800" },
  draft: {
    aspectRatio: 4 / 3,
    borderRadius: 10,
    width: "100%",
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderColor: "#D7D9D9",
    borderRadius: 10,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 15,
    minHeight: 72,
    padding: 10,
  },
  save: {
    alignItems: "center",
    backgroundColor: colors.ember,
    borderRadius: 10,
    minHeight: 44,
    justifyContent: "center",
  },
  saveText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  footnote: {
    color: colors.body,
    fontSize: 13,
    lineHeight: 19,
  },
  homeButton: {
    alignItems: "center",
    backgroundColor: colors.ink,
    borderRadius: 12,
    justifyContent: "center",
    minHeight: 54,
  },
  homeButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
});
