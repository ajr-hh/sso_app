import { StyleSheet, Text, View } from "react-native";

import { colors } from "../src/theme/colors";

type ErrorBannerProps = {
  message: string;
};

export function ErrorBanner({ message }: ErrorBannerProps) {
  return (
    <View accessibilityRole="alert" style={styles.banner}>
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
