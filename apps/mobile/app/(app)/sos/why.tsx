import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { ErrorBanner } from "../../../components/ErrorBanner";
import { MaterialSymbol } from "../../../components/MaterialSymbol";
import {
  SosButton,
  SosCard,
  SosLoading,
  SosScreen,
  sosTextStyles,
  useSosPath,
} from "../../../components/SosUi";
import { WhyPhotoComposer, WhyPhotosFlyout } from "../../../components/WhyPhotos";
import {
  fetchPhotos,
  removeReinforcementPhoto,
  saveReinforcementPhoto,
  updateReinforcementPhotoCaption,
  type ReinforcementPhoto,
} from "../../../src/data/photos";
import { logSosEvent } from "../../../src/data/sos";
import {
  createWhyReason,
  fetchWhyReasons,
  type WhyReason,
} from "../../../src/data/whyReasons";
import { explainError } from "../../../src/lib/errors";
import {
  getTopWhyReason,
  getUnusedWhyReasonSuggestions,
  getWhyReasonValidationError,
  getWhyScreenMode,
  MAX_WHY_REASON,
  pickNextWhyPhoto,
  pickRandomWhyPhoto,
  quoteWhyReason,
  WHY_COPY,
  WHY_ERRORS,
} from "../../../src/presentation/why";
import { colors } from "../../../src/theme/colors";

export default function WhyScreen() {
  const path = useSosPath();
  const [reasons, setReasons] = useState<WhyReason[]>([]);
  const [photos, setPhotos] = useState<ReinforcementPhoto[]>([]);
  const [current, setCurrent] = useState<ReinforcementPhoto | null>(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [nextReasons, nextPhotos] = await Promise.all([
        fetchWhyReasons(),
        fetchPhotos("remember_why"),
      ]);
      setReasons(nextReasons);
      setPhotos(nextPhotos);
      setCurrent(pickRandomWhyPhoto(nextPhotos));
      setError(null);
    } catch (caughtError) {
      setError(explainError(caughtError) || WHY_ERRORS.load);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void logSosEvent(path, "why").catch((caughtError) => {
        if (active) {
          setError(explainError(caughtError));
        }
      });
      void load();
      return () => {
        active = false;
      };
    }, [load, path]),
  );

  const addReason = async (raw: string) => {
    const validationError = getWhyReasonValidationError(
      raw,
      reasons.map((reason) => reason.label.toLowerCase()),
    );
    if (validationError) {
      setReasonError(validationError);
      return;
    }
    setReasonError(null);
    try {
      const created = await createWhyReason(raw.trim());
      setReasons((currentReasons) => [...currentReasons, created]);
      setDraft("");
    } catch (caughtError) {
      setReasonError(explainError(caughtError) || WHY_ERRORS.reason);
    }
  };

  const savePhoto = async (input: {
    caption: string;
    uri: string;
    width: number;
  }) => {
    setSaving(true);
    setError(null);
    try {
      await saveReinforcementPhoto({
        caption: input.caption,
        mode: "remember_why",
        path,
        uri: input.uri,
        width: input.width,
      });
      const nextPhotos = await fetchPhotos("remember_why");
      setPhotos(nextPhotos);
      setCurrent(pickRandomWhyPhoto(nextPhotos));
    } catch (caughtError) {
      throw new Error(explainError(caughtError) || WHY_ERRORS.photo);
    } finally {
      setSaving(false);
    }
  };

  const updateCaption = async (
    photo: ReinforcementPhoto,
    caption: string,
  ) => {
    await updateReinforcementPhotoCaption(photo.id, caption);
    setPhotos((currentPhotos) =>
      currentPhotos.map((item) =>
        item.id === photo.id ? { ...item, caption: caption.trim() } : item,
      ),
    );
    setCurrent((currentPhoto) =>
      currentPhoto?.id === photo.id
        ? { ...currentPhoto, caption: caption.trim() }
        : currentPhoto,
    );
  };

  const removePhoto = async (photo: ReinforcementPhoto) => {
    await removeReinforcementPhoto(photo.id);
    setPhotos((currentPhotos) => {
      const remaining = currentPhotos.filter(({ id }) => id !== photo.id);
      setCurrent((currentPhoto) =>
        currentPhoto?.id === photo.id
          ? pickRandomWhyPhoto(remaining)
          : currentPhoto,
      );
      return remaining;
    });
  };

  const mode = getWhyScreenMode(reasons.length);
  const topReason = getTopWhyReason(reasons);
  const unusedSuggestions = getUnusedWhyReasonSuggestions(
    reasons.map((reason) => reason.label),
  );

  if (loading) {
    return (
      <SosScreen
        eyebrow="REMEMBER YOUR WHY"
        showBack
        subtitle={WHY_COPY.subtitle}
        title={WHY_COPY.title}
      >
        <SosLoading label="Loading Remember Your Why…" />
      </SosScreen>
    );
  }

  return (
    <View style={styles.flex}>
      <SosScreen
        eyebrow="REMEMBER YOUR WHY"
        keyboardAware
        showBack
        subtitle={WHY_COPY.subtitle}
        title={WHY_COPY.title}
      >
        {error ? <ErrorBanner message={error} /> : null}
        {mode === "needs_reasons" ? (
          <SosCard>
            <Text style={sosTextStyles.sectionTitle}>
              {WHY_COPY.reasonsTitle}
            </Text>
            <Text style={sosTextStyles.body}>{WHY_COPY.reasonsBody}</Text>
            <Text style={sosTextStyles.body}>
              {WHY_COPY.reasonsProgress(3 - reasons.length)}
            </Text>
            {reasonError ? <ErrorBanner message={reasonError} /> : null}
            {unusedSuggestions.length > 0 ? (
              <View style={styles.suggestions}>
                {unusedSuggestions.map((label) => (
                  <Pressable
                    accessibilityLabel={`Add ${label}`}
                    accessibilityRole="button"
                    key={label}
                    onPress={() => void addReason(label)}
                    style={styles.suggestion}
                  >
                    <Text style={styles.suggestionText}>{label}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
            {reasons.map((reason) => (
              <Text key={reason.id} style={sosTextStyles.strong}>
                {reason.label}
              </Text>
            ))}
            <TextInput
              accessibilityLabel="Reason"
              maxLength={MAX_WHY_REASON}
              onChangeText={setDraft}
              placeholder="Write a reason"
              style={styles.input}
              value={draft}
            />
            <SosButton
              label={WHY_COPY.addReason}
              onPress={() => void addReason(draft)}
            />
          </SosCard>
        ) : topReason ? (
          <View style={styles.pill}>
            <Text style={styles.pillLabel}>{WHY_COPY.topReasonLabel}</Text>
            <Text style={styles.pillQuote}>{quoteWhyReason(topReason)}</Text>
          </View>
        ) : null}

        <Text style={sosTextStyles.sectionTitle}>{WHY_COPY.photosTitle}</Text>
        <Text style={sosTextStyles.body}>{WHY_COPY.photosBody}</Text>
        {photos.length === 0 || !current ? (
          <WhyPhotoComposer
            busy={saving}
            onSave={savePhoto}
            path={path}
          />
        ) : (
          <SosCard>
            <Image
              accessibilityLabel={current.caption || "Why photo"}
              source={{ uri: current.signed_url }}
              style={styles.image}
            />
            {current.caption ? (
              <Text style={sosTextStyles.strong}>{current.caption}</Text>
            ) : null}
            <SosButton
              label={WHY_COPY.rotate}
              onPress={() =>
                setCurrent(pickNextWhyPhoto(photos, current.id))
              }
            />
          </SosCard>
        )}
      </SosScreen>
      {photos.length > 0 ? (
        <Pressable
          accessibilityLabel={WHY_COPY.settingsLabel}
          accessibilityRole="button"
          onPress={() => setSettingsOpen(true)}
          style={styles.gear}
        >
          <MaterialSymbol color={colors.ink} name="settings" size={26} />
        </Pressable>
      ) : null}
      <WhyPhotosFlyout
        onClose={() => setSettingsOpen(false)}
        onRemove={removePhoto}
        onSave={savePhoto}
        onUpdateCaption={updateCaption}
        path={path}
        photos={photos}
        saving={saving}
        visible={settingsOpen}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  suggestions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  suggestion: {
    backgroundColor: colors.emberTint,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  suggestionText: { color: colors.ink, fontSize: 14, fontWeight: "700" },
  input: {
    backgroundColor: "#FFFFFF",
    borderColor: "#D7D9D9",
    borderRadius: 12,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  pill: {
    backgroundColor: colors.emberTint,
    borderRadius: 999,
    gap: 4,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  pillLabel: { color: colors.ink, fontSize: 13, fontWeight: "800" },
  pillQuote: { color: colors.ink, fontSize: 20, fontWeight: "800" },
  image: {
    aspectRatio: 4 / 3,
    backgroundColor: colors.canvas,
    borderRadius: 12,
    width: "100%",
  },
  gear: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    bottom: 24,
    height: 52,
    justifyContent: "center",
    position: "absolute",
    right: 24,
    width: 52,
  },
});
