import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { MaterialSymbol, type MaterialSymbolName } from "./MaterialSymbol";
import {
  ALIAS_COPY,
  CHALLENGE_COPY,
  OTHER_TOOLS_EYEBROW,
  OTHER_TOOL_ROUTES,
  RESTAURANT_COPY,
} from "../src/presentation/otherTools";
import { colors } from "../src/theme/colors";

const TOOLS: {
  icon: MaterialSymbolName;
  label: string;
  route: string;
}[] = [
  {
    icon: "emoji_events",
    label: CHALLENGE_COPY.joinLabel,
    route: OTHER_TOOL_ROUTES.challenge,
  },
  {
    icon: "restaurant",
    label: RESTAURANT_COPY.button,
    route: OTHER_TOOL_ROUTES.restaurant,
  },
  {
    icon: "swap_horiz",
    label: ALIAS_COPY.button,
    route: OTHER_TOOL_ROUTES.alias,
  },
];

export function OtherToolsSection() {
  const router = useRouter();

  return (
    <View style={styles.card}>
      <Text accessibilityRole="header" style={styles.title}>
        {OTHER_TOOLS_EYEBROW}
      </Text>
      {TOOLS.map((tool) => (
        <Pressable
          accessibilityRole="button"
          key={tool.route}
          onPress={() => router.push(tool.route as never)}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        >
          <View style={styles.iconBadge}>
            <MaterialSymbol color={colors.ember} name={tool.icon} size={22} />
          </View>
          <Text style={styles.label}>{tool.label}</Text>
          <MaterialSymbol color={colors.ember} name="arrow_forward" size={22} />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    gap: 10,
    padding: 18,
  },
  title: { color: colors.ink, fontSize: 21, fontWeight: "800" },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    minHeight: 52,
  },
  iconBadge: {
    alignItems: "center",
    backgroundColor: colors.emberTint,
    borderRadius: 999,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  label: { color: colors.ink, flex: 1, fontSize: 16, fontWeight: "800" },
  pressed: { opacity: 0.72 },
});
