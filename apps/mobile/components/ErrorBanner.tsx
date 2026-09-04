import { useEffect } from "react";
import {
  AccessibilityInfo,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { colors } from "../src/theme/colors";

type ErrorBannerProps = {
  message: string;
};

export function shouldExplicitlyAnnounceError(platform: string): boolean {
  return platform === "ios";
}

export function ErrorBanner({ message }: ErrorBannerProps) {
  useEffect(() => {
    if (shouldExplicitlyAnnounceError(Platform.OS)) {
      AccessibilityInfo.announceForAccessibility(message);
    }
  }, [message]);

  return (
    <View
      accessibilityLiveRegion={Platform.OS === "android" ? "assertive" : "none"}
      accessibilityRole="alert"
      style={styles.banner}
    >
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.emberTint,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  message: {
    color: colors.ink,
    fontSize: 15,
    lineHeight: 21,
  },
});
