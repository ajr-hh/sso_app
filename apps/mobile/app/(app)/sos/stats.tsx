import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { ErrorBanner } from "../../../components/ErrorBanner";
import {
  SosButton,
  SosCard,
  SosScreen,
  sosTextStyles,
  useSosPath,
} from "../../../components/SosUi";
import {
  createResearchFact,
  fetchResearchFacts,
  generateResearchFact,
} from "../../../src/data/researchFacts";
import { logSosEvent } from "../../../src/data/sos";
import { explainError } from "../../../src/lib/errors";
import {
  canAddResearchFact,
  getResearchFactValidationError,
  mergeResearchFacts,
  nextResearchFactIndex,
  STATS_COPY,
  type ResearchFact,
} from "../../../src/presentation/statsScreen";
import { colors } from "../../../src/theme/colors";

export default function StatsScreen() {
  const router = useRouter();
  const path = useSosPath();
  const [saved, setSaved] = useState<ResearchFact[]>([]);
  const [index, setIndex] = useState(0);
  const [draftNum, setDraftNum] = useState("");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const facts = useMemo(() => mergeResearchFacts(saved), [saved]);
  const current = facts[Math.min(index, Math.max(facts.length - 1, 0))];

  const load = useCallback(async () => {
    setError(null);
    try {
      setSaved(await fetchResearchFacts());
    } catch (caughtError) {
      setError(explainError(caughtError));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void load();
      void logSosEvent(path, "stats_view").catch((caughtError) => {
        if (active) {
          setError(explainError(caughtError));
        }
      });
      return () => {
        active = false;
      };
    }, [load, path]),
  );

  const generate = async () => {
    if (!canAddResearchFact(saved.length)) {
      setError("That's the 20-fact cap.");
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      const generated = await generateResearchFact(saved.length);
      const created = await createResearchFact({
        ...generated,
        source: "ai",
      });
      setSaved((currentSaved) => [...currentSaved, created]);
      setIndex(mergeResearchFacts([...saved, created]).length - 1);
    } catch (caughtError) {
      setError(explainError(caughtError));
    } finally {
      setGenerating(false);
    }
  };

  const saveMemberFact = async () => {
    const validationError = getResearchFactValidationError({
      title: draftTitle,
      body: draftBody,
      num: draftNum,
    });
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!canAddResearchFact(saved.length)) {
      setError("That's the 20-fact cap.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await createResearchFact({
        num: draftNum.trim() || null,
        title: draftTitle.trim(),
        body: draftBody.trim(),
        source: "member",
      });
      setSaved((currentSaved) => [...currentSaved, created]);
      setIndex(mergeResearchFacts([...saved, created]).length - 1);
      setDraftNum("");
      setDraftTitle("");
      setDraftBody("");
    } catch (caughtError) {
      setError(explainError(caughtError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SosScreen
      eyebrow="THE NUMBERS"
      showBack
      subtitle={STATS_COPY.subtitle}
      title={STATS_COPY.title}
    >
      {error ? <ErrorBanner message={error} /> : null}
      {current ? (
        <SosCard>
          {current.num ? (
            <Text style={sosTextStyles.number}>{current.num}</Text>
          ) : null}
          <Text style={sosTextStyles.sectionTitle}>{current.title}</Text>
          <Text style={sosTextStyles.body}>{current.body}</Text>
        </SosCard>
      ) : null}
      <View style={styles.row}>
        <SosButton
          label={STATS_COPY.rotate}
          onPress={() => setIndex(nextResearchFactIndex(index, facts.length))}
        />
        <SosButton
          disabled={generating || !canAddResearchFact(saved.length)}
          label={generating ? STATS_COPY.generating : STATS_COPY.generate}
          onPress={() => generate()}
        />
      </View>

      <View style={styles.add} testID="stats-add-fact">
        <Text accessibilityRole="header" style={sosTextStyles.sectionTitle}>
          {STATS_COPY.addHeading}
        </Text>
        <Text style={sosTextStyles.body}>{STATS_COPY.addBody}</Text>
        <TextInput
          accessibilityLabel={STATS_COPY.numLabel}
          editable={!saving}
          maxLength={12}
          onChangeText={setDraftNum}
          placeholder="27%"
          style={styles.input}
          value={draftNum}
        />
        <TextInput
          accessibilityLabel={STATS_COPY.titleLabel}
          editable={!saving}
          maxLength={80}
          onChangeText={setDraftTitle}
          placeholder="Short title"
          style={styles.input}
          value={draftTitle}
        />
        <TextInput
          accessibilityLabel={STATS_COPY.bodyLabel}
          editable={!saving}
          maxLength={280}
          multiline
          onChangeText={setDraftBody}
          placeholder="The fact itself"
          style={[styles.input, styles.multiline]}
          textAlignVertical="top"
          value={draftBody}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ busy: saving, disabled: saving }}
          disabled={saving}
          onPress={() => void saveMemberFact()}
          style={[styles.save, saving && styles.disabled]}
        >
          <Text style={styles.saveText}>
            {saving ? STATS_COPY.saving : STATS_COPY.save}
          </Text>
        </Pressable>
      </View>

      <View style={styles.divider} />
      <Text style={styles.footnote}>{STATS_COPY.footnote}</Text>
      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={() => {
          void (async () => {
            setBusy(true);
            setError(null);
            try {
              await logSosEvent(path, "stats_cta");
              router.navigate("/(app)/(tabs)/home");
            } catch (caughtError) {
              setError(explainError(caughtError));
            } finally {
              setBusy(false);
            }
          })();
        }}
        style={[styles.homeButton, busy && styles.disabled]}
      >
        <Text style={styles.homeButtonText}>{STATS_COPY.backOnTrack}</Text>
      </Pressable>
    </SosScreen>
  );
}

const styles = StyleSheet.create({
  row: { gap: 12 },
  add: {
    backgroundColor: "#FFFFFF",
    borderColor: "#C8CCCC",
    borderRadius: 16,
    borderStyle: "dashed",
    borderWidth: 1.5,
    gap: 12,
    padding: 18,
  },
  input: {
    backgroundColor: colors.canvas,
    borderColor: "#D7D9D9",
    borderRadius: 12,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  multiline: { minHeight: 96 },
  save: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
    borderColor: colors.ink,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: 14,
  },
  saveText: { color: colors.ink, fontSize: 14, fontWeight: "800" },
  divider: {
    backgroundColor: "#D7D9D9",
    height: StyleSheet.hairlineWidth,
  },
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
  disabled: { opacity: 0.45 },
});
