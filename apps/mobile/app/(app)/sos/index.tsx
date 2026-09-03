import { StyleSheet, Text, View } from "react-native";

import { colors } from "../../../src/theme/colors";

export default function SosScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>SOS</Text>
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
    color: colors.ember,
    fontSize: 36,
    fontWeight: "900",
  },
});
