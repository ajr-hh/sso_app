import { Tabs, useRouter } from "expo-router";
import { Fragment } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SOS_PATH, TAB_SCREENS } from "../../../src/navigation/tabs";
import { colors } from "../../../src/theme/colors";

export default function TabsLayout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={({ state }) => (
        <View
          style={[
            styles.tabBar,
            { paddingBottom: Math.max(insets.bottom, 12) },
          ]}
        >
          {TAB_SCREENS.map((screen, index) => {
            const active = state.routes[state.index]?.name === screen.name;

            return (
              <Fragment key={screen.name}>
                <Pressable
                  accessibilityLabel={`${screen.label} tab`}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  onPress={() =>
                    router.push(`/(app)/(tabs)/${screen.name}`)
                  }
                  style={styles.tab}
                >
                  <Text style={[styles.symbol, active && styles.active]}>
                    {screen.symbol}
                  </Text>
                  <Text style={[styles.label, active && styles.active]}>
                    {screen.label}
                  </Text>
                </Pressable>
                {index === 1 ? <View style={styles.sosGap} /> : null}
              </Fragment>
            );
          })}

          <Pressable
            accessibilityLabel="Open SOS"
            accessibilityRole="button"
            hitSlop={10}
            onPress={() => router.push(SOS_PATH)}
            style={styles.sosButton}
          >
            <Text style={styles.sosText}>SOS</Text>
          </Pressable>
        </View>
      )}
    >
      <Tabs.Screen name="home" options={{ title: "Home" }} />
      <Tabs.Screen name="journal" options={{ title: "Activity" }} />
      <Tabs.Screen name="community" options={{ title: "Community" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderTopColor: "#E5E7E7",
    borderTopWidth: StyleSheet.hairlineWidth,
    elevation: 12,
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingTop: 12,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  tab: {
    alignItems: "center",
    flex: 1,
    gap: 3,
    justifyContent: "center",
    minHeight: 48,
  },
  symbol: {
    color: colors.body,
    fontSize: 20,
    fontWeight: "800",
  },
  label: {
    color: colors.body,
    fontSize: 11,
    fontWeight: "700",
  },
  active: {
    color: colors.ember,
  },
  sosGap: {
    width: 76,
  },
  sosButton: {
    alignItems: "center",
    backgroundColor: colors.ember,
    borderColor: "#FFFFFF",
    borderRadius: 38,
    borderWidth: 5,
    height: 76,
    justifyContent: "center",
    left: "50%",
    position: "absolute",
    top: -38,
    transform: [{ translateX: -38 }],
    width: 76,
  },
  sosText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
});
