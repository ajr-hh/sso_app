import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  RECIPE_COPY,
  type SwapRecipe,
} from "../src/presentation/recipes";
import { colors } from "../src/theme/colors";
import { ErrorBanner } from "./ErrorBanner";

export type RecipeFlyoutProps = {
  error: string | null;
  loading: boolean;
  onClose: () => void;
  onRetry: () => void;
  recipe: SwapRecipe | null;
  visible: boolean;
};

export function RecipeFlyout({
  error,
  loading,
  onClose,
  onRetry,
  recipe,
  visible,
}: RecipeFlyoutProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents={visible ? "box-none" : "none"}
      style={StyleSheet.absoluteFill}
      testID="swap-recipe-flyout"
    >
      {visible ? (
        <View style={styles.modalRoot}>
          <Pressable
            accessibilityLabel="Close recipe"
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
            testID="swap-recipe-sheet"
          >
            <ScrollView
              contentContainerStyle={[
                styles.sheetContent,
                { paddingBottom: 36 + insets.bottom },
              ]}
            >
              {loading ? (
                <View
                  accessibilityLabel={RECIPE_COPY.loading}
                  style={styles.loading}
                >
                  <ActivityIndicator color={colors.ember} />
                  <Text style={styles.supporting}>{RECIPE_COPY.loading}</Text>
                </View>
              ) : null}
              {error ? (
                <>
                  <ErrorBanner message={error} />
                  <Pressable
                    accessibilityRole="button"
                    onPress={onRetry}
                    style={styles.retryButton}
                  >
                    <Text style={styles.retryText}>Try again</Text>
                  </Pressable>
                </>
              ) : null}
              {recipe ? (
                <>
                  <Text accessibilityRole="header" style={styles.sheetTitle}>
                    {recipe.title}
                  </Text>
                  <Text style={styles.supporting}>{recipe.summary}</Text>
                  {recipe.minutes || recipe.servings ? (
                    <Text style={styles.meta}>
                      {[
                        recipe.minutes ? `${recipe.minutes} min` : null,
                        recipe.servings ? `${recipe.servings} servings` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </Text>
                  ) : null}
                  <Text style={styles.section}>Ingredients</Text>
                  {recipe.ingredients.map((line) => (
                    <Text key={line} style={styles.item}>
                      {line}
                    </Text>
                  ))}
                  <Text style={styles.section}>Steps</Text>
                  {recipe.steps.map((line, index) => (
                    <Text key={line} style={styles.item}>
                      {`${index + 1}. ${line}`}
                    </Text>
                  ))}
                  <Text style={styles.note}>{RECIPE_COPY.note}</Text>
                </>
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
        </View>
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
  sheetContent: { gap: 12, padding: 24 },
  sheetTitle: { color: colors.ink, fontSize: 24, fontWeight: "800" },
  supporting: { color: colors.body, fontSize: 15, lineHeight: 21 },
  meta: { color: colors.ink, fontSize: 14, fontWeight: "700" },
  section: { color: colors.ink, fontSize: 16, fontWeight: "800", marginTop: 6 },
  item: { color: colors.ink, fontSize: 16, lineHeight: 22 },
  note: { color: colors.body, fontSize: 14, lineHeight: 20 },
  loading: { alignItems: "center", gap: 12, minHeight: 80 },
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
  doneButton: {
    alignItems: "center",
    borderColor: "#C8CCCC",
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 52,
    marginTop: 8,
  },
  doneText: { color: colors.ink, fontSize: 16, fontWeight: "800" },
});
