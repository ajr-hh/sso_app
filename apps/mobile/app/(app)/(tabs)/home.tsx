import { StyleSheet, Text, View } from "react-native";

import { colors } from "../../../src/theme/colors";

export default function HomeScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>You’re signed in.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignItems: "center",
    backgroundColor: colors.canvas,
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  title: {
    color: colors.ink,
    fontSize: 28,
    fontWeight: "800",
  },
});
