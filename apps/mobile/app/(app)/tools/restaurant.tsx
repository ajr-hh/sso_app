import * as ImagePicker from "expo-image-picker";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

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
  fetchFavoriteRestaurants,
  fetchRestaurantTargets,
  generateRestaurantPick,
  saveFavoriteRestaurant,
  saveRestaurantTargets,
  type FavoriteRestaurant,
} from "../../../src/data/favoriteRestaurants";
import { explainError } from "../../../src/lib/errors";
import {
  clampRestaurantTargets,
  DEFAULT_CALORIE_MAX,
  DEFAULT_PROTEIN_TARGET,
  OTHER_TOOLS_EYEBROW,
  RESTAURANT_COPY,
} from "../../../src/presentation/otherTools";
import { colors } from "../../../src/theme/colors";

export default function RestaurantScreen() {
  const [restaurants, setRestaurants] = useState<FavoriteRestaurant[] | null>(
    null,
  );
  const [name, setName] = useState("");
  const [protein, setProtein] = useState(String(DEFAULT_PROTEIN_TARGET));
  const [calories, setCalories] = useState(String(DEFAULT_CALORIE_MAX));
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [spots, targets] = await Promise.all([
        fetchFavoriteRestaurants(),
        fetchRestaurantTargets(),
      ]);
      setRestaurants(spots);
      setProtein(String(targets.protein_grams));
      setCalories(String(targets.calorie_max));
    } catch (caughtError) {
      setError(explainError(caughtError));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const { protein_grams: proteinGrams, calorie_max: calorieMax } =
    clampRestaurantTargets({
      protein_grams: Number(protein) || 0,
      calorie_max: Number(calories) || 0,
    });
  const atMax = (restaurants?.length ?? 0) >= RESTAURANT_COPY.max;
  const busy = scanning || saving;

  const persistTargets = async () => {
    try {
      await saveRestaurantTargets({
        protein_grams: proteinGrams,
        calorie_max: calorieMax,
      });
    } catch {
      // Targets are optional for a scan. A failed upsert should not block
      // reading the menu or saving the restaurant pick.
    }
  };

  const savePick = async (pick: {
    name: string;
    bestPick: string;
    filter: string;
  }) => {
    const saved = await saveFavoriteRestaurant({
      name: pick.name,
      bestPick: pick.bestPick,
      filter: pick.filter,
    });
    setRestaurants((current) => (current ? [...current, saved] : [saved]));
    setName("");
  };

  const scanMenu = async () => {
    if (busy || atMax) return;
    setScanning(true);
    setError(null);
    try {
      await persistTargets();
      const result = await ImagePicker.launchImageLibraryAsync({
        base64: true,
        mediaTypes: ["images"],
        quality: 0.7,
      });
      if (result.canceled || !result.assets[0]?.base64) {
        return;
      }
      const pick = await generateRestaurantPick({
        proteinGrams,
        calorieMax,
        menuImageBase64: result.assets[0].base64,
      });
      await savePick(pick);
    } catch (caughtError) {
      setError(explainError(caughtError));
    } finally {
      setScanning(false);
    }
  };

  const addByName = async () => {
    if (busy || atMax || !name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await persistTargets();
      const pick = await generateRestaurantPick({
        name: name.trim(),
        proteinGrams,
        calorieMax,
      });
      await savePick(pick);
    } catch (caughtError) {
      setError(explainError(caughtError));
    } finally {
      setSaving(false);
    }
  };

  if (!restaurants && !error) {
    return (
      <SosScreen
        eyebrow={OTHER_TOOLS_EYEBROW}
        showBack
        title={RESTAURANT_COPY.title}
      >
        <SosLoading label="Loading your spots…" />
      </SosScreen>
    );
  }

  if (!restaurants) {
    return (
      <SosScreen
        eyebrow={OTHER_TOOLS_EYEBROW}
        showBack
        title={RESTAURANT_COPY.title}
      >
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
      subtitle={RESTAURANT_COPY.subtitle}
      title={RESTAURANT_COPY.title}
    >
      {error ? <ErrorBanner message={error} /> : null}

      {restaurants.map((spot) => (
        <SosCard key={spot.id}>
          <Text style={sosTextStyles.strong}>{spot.name}</Text>
          {spot.filter ? (
            <Text style={sosTextStyles.body}>{spot.filter}</Text>
          ) : null}
          <View style={styles.pickRow}>
            <View style={styles.iconBadge}>
              <MaterialSymbol color={colors.ember} name="star" size={20} />
            </View>
            <Text style={[sosTextStyles.body, styles.pickCopy]}>
              {spot.best_pick}
            </Text>
          </View>
        </SosCard>
      ))}

      <SosCard>
        <Text style={sosTextStyles.sectionTitle}>
          {RESTAURANT_COPY.targetsHeading}
        </Text>
        <Text style={styles.fieldLabel}>{RESTAURANT_COPY.proteinLabel}</Text>
        <TextInput
          accessibilityLabel={RESTAURANT_COPY.proteinLabel}
          keyboardType="number-pad"
          onChangeText={setProtein}
          style={styles.input}
          value={protein}
        />
        <Text style={styles.fieldLabel}>{RESTAURANT_COPY.calorieLabel}</Text>
        <TextInput
          accessibilityLabel={RESTAURANT_COPY.calorieLabel}
          keyboardType="number-pad"
          onChangeText={setCalories}
          style={styles.input}
          value={calories}
        />
      </SosCard>

      <SosButton
        busy={scanning}
        disabled={atMax}
        label={scanning ? RESTAURANT_COPY.scanning : RESTAURANT_COPY.scan}
        onPress={() => void scanMenu()}
      />

      <SosCard>
        <Text style={sosTextStyles.sectionTitle}>{RESTAURANT_COPY.add}</Text>
        <Text style={styles.fieldLabel}>{RESTAURANT_COPY.nameLabel}</Text>
        <TextInput
          accessibilityLabel={RESTAURANT_COPY.nameLabel}
          onChangeText={setName}
          placeholder={RESTAURANT_COPY.nameLabel}
          style={styles.input}
          value={name}
        />
        <SosButton
          busy={saving}
          disabled={atMax || !name.trim()}
          label={saving ? RESTAURANT_COPY.generating : RESTAURANT_COPY.save}
          onPress={() => void addByName()}
        />
      </SosCard>

      <Text style={styles.footnote}>{RESTAURANT_COPY.footnote}</Text>
    </SosScreen>
  );
}

const styles = StyleSheet.create({
  pickRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
  },
  iconBadge: {
    alignItems: "center",
    backgroundColor: colors.emberTint,
    borderRadius: 12,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  pickCopy: { flex: 1, paddingTop: 8 },
  fieldLabel: { color: colors.ink, fontSize: 14, fontWeight: "700" },
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
  footnote: { color: colors.body, fontSize: 13, lineHeight: 19 },
});
