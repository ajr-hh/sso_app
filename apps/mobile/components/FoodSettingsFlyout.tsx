import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { Craving } from "../src/data/cravings";
import { FOOD_SCREEN_COPY } from "../src/presentation/foodScreen";
import type { DietFlag } from "../src/presentation/foodRules";
import { colors } from "../src/theme/colors";
import {
  FoodRulesSection,
  type FoodRulesSaveInput,
} from "./FoodRulesSection";
import { UsualCravingsSection } from "./UsualCravingsSection";

export type FoodSettingsFlyoutProps = {
  allergens: string[];
  cravings: readonly Craving[];
  cravingsError: string | null;
  cravingsLoaded: boolean;
  cravingsStatus: string | null;
  dietFlags: DietFlag[];
  onClose: () => void;
  onCreateCraving: (label: string) => Promise<Craving>;
  onRemoveCraving: (craving: Craving) => Promise<void>;
  onRetryCravings: () => void;
  onSaveRules: (input: FoodRulesSaveInput) => Promise<void>;
  visible: boolean;
};

export function FoodSettingsFlyout({
  allergens,
  cravings,
  cravingsError,
  cravingsLoaded,
  cravingsStatus,
  dietFlags,
  onClose,
  onCreateCraving,
  onRemoveCraving,
  onRetryCravings,
  onSaveRules,
  visible,
}: FoodSettingsFlyoutProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents={visible ? "box-none" : "none"}
      style={StyleSheet.absoluteFill}
      testID="food-settings-flyout"
    >
      {visible ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalRoot}
        >
          <Pressable
            accessibilityLabel="Close allergies and cravings"
            accessibilityRole="button"
            onPress={onClose}
            style={StyleSheet.absoluteFill}
          >
            <View style={styles.backdrop} />
          </Pressable>
          <View
            accessibilityViewIsModal
            onAccessibilityEscape={onClose}
            style={styles.sheet}
            testID="food-settings-sheet"
          >
            <ScrollView
              contentContainerStyle={[
                styles.sheetContent,
                { paddingBottom: 36 + insets.bottom },
              ]}
              keyboardShouldPersistTaps="handled"
            >
              <Text accessibilityRole="header" style={styles.sheetTitle}>
                {FOOD_SCREEN_COPY.settingsTitle}
              </Text>
              <Text style={styles.supporting}>
                Changes here apply to every swap on this page. You can also
                edit these from Profile.
              </Text>
              <FoodRulesSection
                allergens={allergens}
                dietFlags={dietFlags}
                onSave={onSaveRules}
              />
              <UsualCravingsSection
                cravings={cravings}
                loadError={cravingsError}
                loading={!cravingsLoaded && cravingsError === null}
                onCreate={onCreateCraving}
                onRemove={onRemoveCraving}
                onRetry={onRetryCravings}
                status={cravingsStatus}
              />
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
      ) : null}
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
  supporting: { color: colors.body, fontSize: 15, lineHeight: 21 },
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
