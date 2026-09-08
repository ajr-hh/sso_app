import { ActivityIndicator, StyleSheet, View } from "react-native";

import { colors } from "../src/theme/colors";

// Entry route. The root layout redirects to /sign-in or /(app)/(tabs)/home
// once the session resolves; this renders while that check is in flight.
export default function IndexScreen() {
  return (
    <View style={styles.screen}>
      <ActivityIndicator color={colors.ember} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignItems: "center",
    backgroundColor: colors.canvas,
    flex: 1,
    justifyContent: "center",
  },
});
