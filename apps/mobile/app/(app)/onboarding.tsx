import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { ErrorBanner } from "../../components/ErrorBanner";
import { saveProfile } from "../../src/data/profile";
import { explainError } from "../../src/lib/errors";
import { colors } from "../../src/theme/colors";

export default function OnboardingScreen() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [whyMatters, setWhyMatters] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const canSave =
    Boolean(displayName.trim()) && Boolean(whyMatters.trim()) && !saving;

  const save = async () => {
    setError(null);
    setSaving(true);

    try {
      await saveProfile({
        display_name: displayName.trim(),
        why_matters: whyMatters.trim(),
      });
      router.replace("/(app)/(tabs)/home");
    } catch (caughtError) {
      setError(explainError(caughtError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.flex}
    >
      <ScrollView contentContainerStyle={styles.screen}>
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>WELCOME</Text>
          <Text style={styles.title}>Let’s set you up</Text>
          <Text style={styles.body}>
            Two quick things. SOS uses them when you need support in the moment.
          </Text>
        </View>

        {error ? <ErrorBanner message={error} /> : null}

        <View style={styles.card}>
          <Text style={styles.label}>Tell us your name</Text>
          <TextInput
            autoCapitalize="words"
            autoFocus
            editable={!saving}
            onChangeText={setDisplayName}
            placeholder="First Last"
            placeholderTextColor={colors.body}
            style={styles.input}
            value={displayName}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Why does this matter to you?</Text>
          <Text style={styles.hint}>
            You’ll see this when a craving hits, so write it the way you’d want
            to hear it.
          </Text>
          <TextInput
            editable={!saving}
            multiline
            onChangeText={setWhyMatters}
            placeholder="I want to be around for my kids."
            placeholderTextColor={colors.body}
            style={[styles.input, styles.multiline]}
            textAlignVertical="top"
            value={whyMatters}
          />
        </View>

        <Pressable
          accessibilityRole="button"
          disabled={!canSave}
          onPress={save}
          style={({ pressed }) => [
            styles.button,
            !canSave && styles.buttonDisabled,
            pressed && styles.buttonPressed,
          ]}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Start using SOS</Text>
          )}
        </Pressable>

        <Text style={styles.footnote}>
          You can change these any time from the Profile tab.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { backgroundColor: colors.canvas, flex: 1 },
  screen: {
    backgroundColor: colors.canvas,
    gap: 16,
    padding: 24,
    paddingBottom: 48,
  },
  heading: { gap: 6 },
  eyebrow: {
    color: colors.ember,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  title: { color: colors.ink, fontSize: 36, fontWeight: "800" },
  body: { color: colors.body, fontSize: 16, lineHeight: 23 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    gap: 10,
    padding: 18,
  },
  label: { color: colors.ink, fontSize: 17, fontWeight: "800" },
  hint: { color: colors.body, fontSize: 14, lineHeight: 20 },
  input: {
    backgroundColor: colors.canvas,
    borderColor: "#D7D9D9",
    borderRadius: 12,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 17,
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  multiline: { minHeight: 110 },
  button: {
    alignItems: "center",
    backgroundColor: colors.ember,
    borderRadius: 12,
    justifyContent: "center",
    minHeight: 54,
  },
  buttonDisabled: { opacity: 0.45 },
  buttonPressed: { opacity: 0.8 },
  buttonText: { color: "#FFFFFF", fontSize: 17, fontWeight: "800" },
  footnote: {
    color: colors.body,
    fontSize: 14,
    textAlign: "center",
  },
});
