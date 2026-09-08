import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { ErrorBanner } from "../../../components/ErrorBanner";
import { MaterialSymbol } from "../../../components/MaterialSymbol";
import {
  SosButton,
  SosCard,
  SosLoading,
  SosScreen,
  sosTextStyles,
} from "../../../components/SosUi";
import {
  fetchFoodAliases,
  generateFoodAlias,
  saveFoodAlias,
  type FoodAlias,
} from "../../../src/data/foodAliases";
import { explainError } from "../../../src/lib/errors";
import {
  ALIAS_COPY,
  ALIAS_LEVELS,
  OTHER_TOOLS_EYEBROW,
  type AliasLevel,
} from "../../../src/presentation/otherTools";
import { colors } from "../../../src/theme/colors";

export default function AliasScreen() {
  const [aliases, setAliases] = useState<FoodAlias[] | null>(null);
  const [craving, setCraving] = useState("");
  const [level, setLevel] = useState<AliasLevel>("Mid");
  const [draft, setDraft] = useState<{ title: string; sub: string } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setAliases(await fetchFoodAliases());
    } catch (caughtError) {
      setError(explainError(caughtError));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const generate = async () => {
    if (generating || !craving.trim()) return;
    setGenerating(true);
    setError(null);
    try {
      setDraft(
        await generateFoodAlias({ craving: craving.trim(), flexLevel: level }),
      );
    } catch (caughtError) {
      setError(explainError(caughtError));
    } finally {
      setGenerating(false);
    }
  };

  const save = async () => {
    if (!draft || saving) return;
    setSaving(true);
    setError(null);
    try {
      const saved = await saveFoodAlias({
        craving: craving.trim(),
        flexLevel: level,
        title: draft.title,
        sub: draft.sub,
      });
      setAliases((current) => (current ? [saved, ...current] : [saved]));
    } catch (caughtError) {
      setError(explainError(caughtError));
    } finally {
      setSaving(false);
    }
  };

  if (!aliases && !error) {
    return (
      <SosScreen eyebrow={OTHER_TOOLS_EYEBROW} showBack title={ALIAS_COPY.title}>
        <SosLoading label="Loading swaps…" />
      </SosScreen>
    );
  }

  if (!aliases) {
    return (
      <SosScreen eyebrow={OTHER_TOOLS_EYEBROW} showBack title={ALIAS_COPY.title}>
        {error ? <ErrorBanner message={error} /> : null}
        <SosButton label="Try again" onPress={() => void load()} />
      </SosScreen>
    );
  }

  return (
    <SosScreen
      eyebrow={OTHER_TOOLS_EYEBROW}
      keyboardAware
      showBack
      subtitle={ALIAS_COPY.subtitle}
      title={ALIAS_COPY.title}
    >
      {error ? <ErrorBanner message={error} /> : null}

      <SosCard>
        <Text style={styles.fieldLabel}>{ALIAS_COPY.craving}</Text>
        <TextInput
          accessibilityLabel={ALIAS_COPY.craving}
          onChangeText={setCraving}
          placeholder={ALIAS_COPY.craving}
          style={styles.input}
          value={craving}
        />
      </SosCard>

      <Text style={styles.fieldLabel}>{ALIAS_COPY.flex}</Text>
      <View
        accessibilityLabel={ALIAS_COPY.flex}
        accessibilityRole="radiogroup"
        style={styles.pills}
      >
        {ALIAS_LEVELS.map((option) => {
          const selected = option === level;
          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              key={option}
              onPress={() => setLevel(option)}
              style={[styles.pill, selected && styles.pillSelected]}
            >
              <Text style={styles.pillText}>{option}</Text>
            </Pressable>
          );
        })}
      </View>

      <SosButton
        busy={generating}
        disabled={!craving.trim()}
        label={generating ? ALIAS_COPY.generating : ALIAS_COPY.generate}
        onPress={() => void generate()}
      />

      {draft ? (
        <SosCard>
          <View style={styles.swapRow}>
            <View style={styles.photoTile}>
              <MaterialSymbol color={colors.ember} name="nutrition" size={24} />
            </View>
            <View style={styles.swapCopy}>
              <Text style={sosTextStyles.strong}>{draft.title}</Text>
              <Text style={sosTextStyles.body}>{draft.sub}</Text>
            </View>
          </View>
        </SosCard>
      ) : null}

      {draft ? (
        <SosButton
          busy={saving}
          label={saving ? ALIAS_COPY.saving : ALIAS_COPY.save}
          onPress={() => void save()}
        />
      ) : null}

      {aliases.length > 0 ? (
        <>
          <Text style={styles.recent}>Recent swaps</Text>
          {aliases.map((alias) => (
            <SosCard key={alias.id}>
              <Text style={sosTextStyles.strong}>{alias.title}</Text>
              <Text style={sosTextStyles.body}>
                {alias.craving} · {alias.flex_level}
              </Text>
            </SosCard>
          ))}
        </>
      ) : null}
    </SosScreen>
  );
}

const styles = StyleSheet.create({
  fieldLabel: { color: colors.body, fontSize: 13, fontWeight: "700" },
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
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  pill: {
    borderColor: "#C8CCCC",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  pillSelected: {
    backgroundColor: colors.emberTint,
    borderColor: colors.ember,
  },
  pillText: { color: colors.ink, fontSize: 15, fontWeight: "700" },
  swapRow: { alignItems: "center", flexDirection: "row", gap: 12 },
  photoTile: {
    alignItems: "center",
    backgroundColor: colors.canvas,
    borderRadius: 12,
    height: 64,
    justifyContent: "center",
    width: 64,
  },
  swapCopy: { flex: 1, gap: 4 },
  recent: { color: colors.body, fontSize: 13, fontWeight: "800" },
});
