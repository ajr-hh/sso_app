import { useRouter } from "expo-router";
import { Fragment, useEffect, useState } from "react";
import {
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MaterialSymbol } from "./MaterialSymbol";
import { SOS_PATH, SOS_TAB_NAME, TAB_SCREENS } from "../src/navigation/tabs";
import { colors } from "../src/theme/colors";

export function AppTabBar({ activeName }: { activeName?: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const show = Keyboard.addListener(showEvent, () => {
      setKeyboardVisible(true);
    });
    const hide = Keyboard.addListener(hideEvent, () => {
      setKeyboardVisible(false);
    });

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  if (keyboardVisible) {
    return null;
  }

  return (
    <View
      style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 12) }]}
    >
      {TAB_SCREENS.map((screen, index) => {
        const active = activeName === screen.name;

        return (
          <Fragment key={screen.name}>
            <Pressable
              accessibilityLabel={`${screen.label} tab`}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => router.navigate(`/(app)/(tabs)/${screen.name}`)}
              style={styles.tab}
            >
              <MaterialSymbol
                color={active ? colors.ember : colors.body}
                name={screen.symbol}
                size={24}
              />
              <Text style={[styles.label, active && styles.active]}>
                {screen.label}
              </Text>
            </Pressable>
            {index === 1 ? <View style={styles.sosGap} /> : null}
          </Fragment>
        );
      })}

      {/* SOS is a tab, not a screen stacked over the tabs, so it switches the
          same way the other tabs do and leaving it keeps them mounted. */}
      <Pressable
        accessibilityLabel="SOS tab"
        accessibilityRole="tab"
        accessibilityState={{ selected: activeName === SOS_TAB_NAME }}
        hitSlop={10}
        onPress={() => router.navigate(SOS_PATH)}
        style={styles.sosButton}
      >
        <MaterialSymbol color="#FFFFFF" name="emergency" size={24} />
        <Text maxFontSizeMultiplier={1.4} style={styles.sosText}>
          SOS
        </Text>
      </Pressable>
    </View>
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
    gap: 1,
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
