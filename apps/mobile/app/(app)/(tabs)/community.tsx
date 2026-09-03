import { StyleSheet, Text, View } from "react-native";

import { colors } from "../../../src/theme/colors";

export default function CommunityScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Community</Text>
      <Text style={styles.body}>Community encouragement will appear here.</Text>
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
  body: {
    color: colors.body,
    fontSize: 16,
    marginTop: 8,
    textAlign: "center",
  },
});
