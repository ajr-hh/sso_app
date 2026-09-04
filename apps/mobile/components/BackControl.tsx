import { Pressable, StyleSheet, Text } from "react-native";

import { MaterialSymbol } from "./MaterialSymbol";
import { colors } from "../src/theme/colors";

type BackControlProps = {
  onPress: () => void;
};

export function BackControl({ onPress }: BackControlProps) {
  return (
    <Pressable
      accessibilityLabel="Go back"
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.back, pressed && styles.pressed]}
    >
      <MaterialSymbol color={colors.ink} name="arrow_back" size={22} />
      <Text style={styles.backText}>Back</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  back: { alignItems: "center", flexDirection: "row", gap: 4, minHeight: 40 },
  backText: { color: colors.ink, fontSize: 16, fontWeight: "700" },
  pressed: { opacity: 0.6 },
});
