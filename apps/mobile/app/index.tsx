import { Image, StyleSheet, View } from "react-native";

// Entry route. The root layout redirects to /sign-in or /(app)/(tabs)/home
// once the session resolves; this renders while that check is in flight.
export default function IndexScreen() {
  return (
    <View style={styles.screen}>
      <Image
        accessibilityLabel="Humanaut SOS"
        source={require("../assets/splash-icon.png")}
        style={styles.mark}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  mark: {
    height: 180,
    width: 180,
  },
  screen: {
    alignItems: "center",
    backgroundColor: "#FF7248",
    flex: 1,
    justifyContent: "center",
  },
});
