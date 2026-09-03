import { useEffect, useState } from "react";
import * as Linking from "expo-linking";
import { useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { ErrorBanner } from "../components/ErrorBanner";
import { explainError } from "../src/lib/errors";
import { getSupabase } from "../src/lib/supabase";
import { colors } from "../src/theme/colors";

export default function SignInScreen() {
  const { authError } = useLocalSearchParams<{ authError?: string }>();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(
    typeof authError === "string" ? authError : null,
  );
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (typeof authError === "string") {
      setError(authError);
    }
  }, [authError]);

  const sendMagicLink = async () => {
    setError(null);
    setSent(false);
    setSubmitting(true);

    try {
      const { error: signInError } = await getSupabase().auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: Linking.createURL("/"),
        },
      });

      if (signInError) {
        throw signInError;
      }

      setSent(true);
    } catch (caughtError) {
      setError(explainError(caughtError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.screen}
    >
      <View style={styles.card}>
        <Text style={styles.eyebrow}>HUMANAUT SOS</Text>
        <Text style={styles.title}>Support, right when you need it.</Text>
        <Text style={styles.body}>
          Enter your email and we’ll send a secure sign-in link.
        </Text>

        {error ? <ErrorBanner message={error} /> : null}
        {sent ? (
          <View style={styles.confirmation}>
            <Text style={styles.confirmationText}>
              Check your email. Open the link on this phone.
            </Text>
          </View>
        ) : null}

        <View style={styles.form}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            editable={!submitting}
            inputMode="email"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={colors.body}
            style={styles.input}
            value={email}
          />
          <Pressable
            accessibilityRole="button"
            disabled={!email.trim() || submitting}
            onPress={sendMagicLink}
            style={({ pressed }) => [
              styles.button,
              (!email.trim() || submitting) && styles.buttonDisabled,
              pressed && styles.buttonPressed,
            ]}
          >
            {submitting ? (
              <ActivityIndicator color={colors.canvas} />
            ) : (
              <Text style={styles.buttonText}>Email me a link</Text>
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: colors.canvas,
    padding: 24,
  },
  card: {
    gap: 20,
  },
  eyebrow: {
    color: colors.ember,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  title: {
    color: colors.ink,
    fontSize: 38,
    fontWeight: "800",
    letterSpacing: -1,
    lineHeight: 41,
  },
  body: {
    color: colors.body,
    fontSize: 17,
    lineHeight: 25,
  },
  confirmation: {
    borderColor: colors.ember,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  confirmationText: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 21,
  },
  form: {
    gap: 10,
  },
  label: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "700",
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderColor: "#D7D9D9",
    borderRadius: 12,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 17,
    minHeight: 54,
    paddingHorizontal: 16,
  },
  button: {
    alignItems: "center",
    backgroundColor: colors.ember,
    borderRadius: 12,
    justifyContent: "center",
    marginTop: 4,
    minHeight: 54,
    paddingHorizontal: 20,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    color: colors.canvas,
    fontSize: 17,
    fontWeight: "800",
  },
});
