import {
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import type { SosPath } from "../src/data/sos";
import type { RailId, RailOption } from "../src/lib/domain";
import { colors } from "../src/theme/colors";

const RAIL_DESCRIPTIONS: Readonly<Record<RailId, string>> = {
  why: "Reconnect with the reason you started.",
  hard_truths: "Remember what you do not want to repeat.",
  stats: "Use the facts to steady your next choice.",
  rewards: "See the progress you have already earned.",
  food: "Find a better option for this craving.",
  messages: "Hear the voice you chose for hard moments.",
};

const RAIL_ROUTES = {
  why: "/(app)/sos/why",
  hard_truths: "/(app)/sos/hard-truths",
  stats: "/(app)/sos/stats",
  rewards: "/(app)/sos/rewards",
  food: "/(app)/sos/food",
  messages: "/(app)/sos/messages",
} as const satisfies Readonly<Record<RailId, string>>;

export function SosScreen({
  children,
  eyebrow,
  subtitle,
  title,
}: {
  children: ReactNode;
  eyebrow: string;
  subtitle?: string;
  title: string;
}) {
  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <View style={styles.heading}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.body}>{subtitle}</Text> : null}
      </View>
      {children}
    </ScrollView>
  );
}

export function SosCard({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

export function SosButton({
  disabled = false,
  label,
  onPress,
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

export function SosLoading({ label }: { label: string }) {
  return (
    <View style={styles.centered}>
      <ActivityIndicator color={colors.ember} size="large" />
      <Text style={styles.body}>{label}</Text>
    </View>
  );
}

export function RailList({
  path,
  rails,
}: {
  path: SosPath;
  rails: readonly RailOption[];
}) {
  const router = useRouter();

  return (
    <View style={styles.railList}>
      {rails.map((rail, index) => (
        <Pressable
          accessibilityHint={RAIL_DESCRIPTIONS[rail.id]}
          accessibilityRole="button"
          key={rail.id}
          onPress={() =>
            router.push({
              pathname: RAIL_ROUTES[rail.id],
              params: { path },
            })
          }
          style={({ pressed }) => [
            styles.rail,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.railNumber}>
            {String(index + 1).padStart(2, "0")}
          </Text>
          <View style={styles.railCopy}>
            <Text style={styles.railTitle}>{rail.title}</Text>
            <Text style={styles.railBody}>
              {RAIL_DESCRIPTIONS[rail.id]}
            </Text>
          </View>
          <Text style={styles.railArrow}>→</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function useSosPath(): SosPath {
  const { path } = useLocalSearchParams<{ path?: string }>();
  return path === "planned_event" ? "planned_event" : "off_the_rails";
}

export const sosTextStyles = StyleSheet.create({
  sectionTitle: { color: colors.ink, fontSize: 21, fontWeight: "800" },
  body: { color: colors.body, fontSize: 16, lineHeight: 23 },
  strong: { color: colors.ink, fontSize: 17, fontWeight: "800" },
  number: { color: colors.ember, fontSize: 40, fontWeight: "900" },
});

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.canvas,
    gap: 16,
    padding: 24,
    paddingBottom: 48,
  },
  centered: {
    alignItems: "center",
    backgroundColor: colors.canvas,
    flex: 1,
    gap: 16,
    justifyContent: "center",
    padding: 24,
  },
  heading: { gap: 6 },
  eyebrow: {
    color: colors.ember,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  title: { color: colors.ink, fontSize: 36, fontWeight: "800" },
  body: { color: colors.body, fontSize: 16, lineHeight: 23 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    gap: 12,
    padding: 18,
  },
  button: {
    alignItems: "center",
    backgroundColor: colors.ember,
    borderRadius: 12,
    justifyContent: "center",
    minHeight: 50,
    paddingHorizontal: 18,
  },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.72 },
  railList: { gap: 10 },
  rail: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    flexDirection: "row",
    gap: 13,
    minHeight: 92,
    padding: 16,
  },
  railNumber: {
    color: colors.ember,
    fontSize: 15,
    fontWeight: "900",
    width: 24,
  },
  railCopy: { flex: 1, gap: 4 },
  railTitle: { color: colors.ink, fontSize: 19, fontWeight: "800" },
  railBody: { color: colors.body, fontSize: 14, lineHeight: 19 },
  railArrow: { color: colors.ember, fontSize: 24, fontWeight: "700" },
});
