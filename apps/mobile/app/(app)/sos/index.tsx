import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { SosScreen as Screen } from "../../../components/SosUi";
import { colors } from "../../../src/theme/colors";

export default function SosScreen() {
  const router = useRouter();

  return (
    <Screen
      eyebrow="PAUSE. RESET. CHOOSE."
      subtitle="Pick the kind of support you need right now."
      title="SOS"
    >
      <PathCard
        body="A craving or rough moment is pulling you away from your plan."
        label="I’m off the rails"
        onPress={() => router.push("/(app)/sos/rails")}
      />
      <PathCard
        body="Get ready for a dinner, party, trip, or other planned event."
        label="I have something planned"
        onPress={() => router.push("/(app)/sos/planned")}
      />
    </Screen>
  );
}

function PathCard({
  body,
  label,
  onPress,
}: {
  body: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.badge}>
        <Text style={styles.badgeText}>SOS</Text>
      </View>
      <Text style={styles.cardTitle}>{label}</Text>
      <Text style={styles.cardBody}>{body}</Text>
      <Text style={styles.arrow}>Continue →</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E4E4",
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    padding: 20,
  },
  pressed: { opacity: 0.72 },
  badge: {
    alignItems: "center",
    backgroundColor: colors.emberTint,
    borderRadius: 999,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  badgeText: { color: colors.ember, fontSize: 12, fontWeight: "900" },
  cardTitle: { color: colors.ink, fontSize: 22, fontWeight: "800" },
  cardBody: { color: colors.body, fontSize: 16, lineHeight: 22 },
  arrow: { color: colors.ember, fontSize: 15, fontWeight: "800" },
});
