import { Stack, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { fetchProfile } from "../../src/data/profile";
import { isProfileComplete } from "../../src/lib/domain";
import { colors } from "../../src/theme/colors";

export default function AppLayout() {
  const router = useRouter();
  const [checkedProfile, setCheckedProfile] = useState(false);

  useEffect(() => {
    let active = true;

    const requireProfile = async () => {
      try {
        const profile = await fetchProfile();

        if (active && !isProfileComplete(profile)) {
          router.replace("/(app)/onboarding");
        }
      } catch {
        // A failed profile load should not lock anyone out of the app; each
        // screen surfaces its own load error.
      } finally {
        if (active) {
          setCheckedProfile(true);
        }
      }
    };

    void requireProfile();

    return () => {
      active = false;
    };
  }, [router]);

  if (!checkedProfile) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.ember} size="large" />
      </View>
    );
  }

  // Screens draw their own headings, so the top inset is applied once here.
  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="sos" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="goals" />
        <Stack.Screen name="tasks" />
      </Stack>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.canvas,
    flex: 1,
  },
  loading: {
    alignItems: "center",
    backgroundColor: colors.canvas,
    flex: 1,
    justifyContent: "center",
  },
});
