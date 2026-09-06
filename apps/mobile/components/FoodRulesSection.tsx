import { useEffect, useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  getAllergenValidationError,
  normalizeAllergen,
  toggleDietFlag,
  type DietFlag,
} from "../src/presentation/foodRules";
import { colors } from "../src/theme/colors";
import { ErrorBanner } from "./ErrorBanner";

const DIET_OPTIONS: readonly {
  label: string;
  value: DietFlag | "none";
}[] = [
  { label: "None", value: "none" },
  { label: "Vegetarian", value: "vegetarian" },
  { label: "Vegan", value: "vegan" },
  { label: "Nut-free", value: "nut_free" },
  { label: "Dairy-free", value: "dairy_free" },
  { label: "Gluten-free", value: "gluten_free" },
];

export type FoodRulesSaveInput = {
  food_rules_set: true;
  diet_flags: DietFlag[];
  allergens: string[];
};

export type FoodRulesSectionProps = {
  allergens: string[];
  dietFlags: DietFlag[];
  onSave: (input: FoodRulesSaveInput) => Promise<void>;
};

export function FoodRulesSection({
  allergens: initialAllergens,
  dietFlags: initialDietFlags,
  onSave,
}: FoodRulesSectionProps) {
  const [allergens, setAllergens] = useState(initialAllergens);
  const [dietFlags, setDietFlags] = useState(initialDietFlags);
  const [allergenInput, setAllergenInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  useEffect(() => setAllergens(initialAllergens), [initialAllergens]);
  useEffect(() => setDietFlags(initialDietFlags), [initialDietFlags]);

  const addAllergen = () => {
    const validationError = getAllergenValidationError(allergenInput, allergens);
    if (validationError) {
      setError(validationError);
      return;
    }
    const normalized = normalizeAllergen(allergenInput);
    if (!normalized) return;
    setAllergens((current) => [...current, normalized]);
    setAllergenInput("");
    setError(null);
  };

  const save = async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError(null);
    setStatus(null);
    try {
      await onSave({
        food_rules_set: true,
        diet_flags: dietFlags,
        allergens,
      });
      setStatus("Food rules saved.");
    } catch {
      setError("We couldn’t save your food rules. Try again.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.title}>
        Food rules
      </Text>
      <Text style={styles.supporting}>
        We’ll never suggest a swap that breaks these.
      </Text>
      {error ? <ErrorBanner message={error} /> : null}
      {status ? (
        <Text accessibilityLiveRegion="polite" style={styles.status}>
          {status}
        </Text>
      ) : null}

      <Text style={styles.label}>Diet</Text>
      <View
        accessibilityLabel="Diet"
        accessibilityRole="radiogroup"
        style={styles.chips}
      >
        {DIET_OPTIONS.map(({ label, value }) => {
          const selected =
            value === "none"
              ? dietFlags.length === 0
              : dietFlags.includes(value);
          return (
            <Pressable
              accessibilityLabel={label}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              disabled={saving}
              key={value}
              onPress={() => {
                setDietFlags((current) => toggleDietFlag(current, value));
                setStatus(null);
              }}
              style={[styles.chip, selected && styles.selected]}
            >
              <Text style={styles.chipText}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.label}>Allergies</Text>
      {allergens.map((allergen) => (
        <View key={allergen} style={styles.allergen}>
          <Text style={styles.allergenText}>{allergen}</Text>
          <Pressable
            accessibilityLabel={`Remove allergy ${allergen}`}
            accessibilityRole="button"
            disabled={saving}
            onPress={() =>
              setAllergens((current) =>
                current.filter((item) => item !== allergen),
              )
            }
            style={styles.remove}
          >
            <Text style={styles.removeText}>Remove</Text>
          </Pressable>
        </View>
      ))}
      <View style={styles.addRow}>
        <TextInput
          accessibilityLabel="Allergy"
          editable={!saving}
          maxLength={41}
          onChangeText={setAllergenInput}
          placeholder="Add an allergy"
          placeholderTextColor={colors.body}
          style={styles.input}
          value={allergenInput}
        />
        <Pressable
          accessibilityRole="button"
          disabled={saving}
          onPress={addAllergen}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryText}>Add allergy</Text>
        </Pressable>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ busy: saving }}
        disabled={saving}
        onPress={() => void save()}
        style={[styles.saveButton, saving && styles.disabled]}
      >
        <Text style={styles.saveText}>
          {saving ? "Saving…" : "Save food rules"}
        </Text>
      </Pressable>
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
  status: { color: "#27633E", fontSize: 15, fontWeight: "700" },
  label: { color: colors.ink, fontSize: 14, fontWeight: "700" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  chip: {
    borderColor: "#C8CCCC",
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 14,
  },
  selected: { backgroundColor: colors.emberTint, borderColor: colors.ember },
  chipText: { color: colors.ink, fontSize: 15, fontWeight: "700" },
  allergen: {
    alignItems: "center",
    borderColor: "#D7D9D9",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    paddingHorizontal: 14,
  },
  allergenText: { color: colors.ink, flex: 1, fontSize: 16 },
  remove: { justifyContent: "center", minHeight: 48, paddingHorizontal: 8 },
  removeText: { color: colors.alert, fontSize: 14, fontWeight: "800" },
  addRow: { gap: 10 },
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
  secondaryButton: {
    alignItems: "center",
    borderColor: "#C8CCCC",
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 48,
  },
  secondaryText: { color: colors.ink, fontSize: 15, fontWeight: "800" },
  saveButton: {
    alignItems: "center",
    backgroundColor: colors.ember,
    borderRadius: 12,
    justifyContent: "center",
    minHeight: 52,
  },
  saveText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  disabled: { opacity: 0.45 },
});
