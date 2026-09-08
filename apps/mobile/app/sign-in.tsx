import { useEffect, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Keyboard,
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
import {
  isCompleteCode,
  normalizeCode,
  OTP_MAX_LENGTH,
  sendEmailCode,
  verifyEmailCode,
} from "../src/lib/otp";
import { getSupabase } from "../src/lib/supabase";
import { colors } from "../src/theme/colors";

export default function SignInScreen() {
  const { authError } = useLocalSearchParams<{ authError?: string }>();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [error, setError] = useState<string | null>(
    typeof authError === "string" ? authError : null,
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (typeof authError === "string") {
      setError(authError);
    }
  }, [authError]);

  const requestCode = async () => {
    setError(null);
    setSubmitting(true);

    try {
      await sendEmailCode(getSupabase().auth, email);
      Keyboard.dismiss();
      setCode("");
      setCodeSent(true);
    } catch (caughtError) {
      setError(explainError(caughtError));
    } finally {
      setSubmitting(false);
    }
  };

  // On success the root layout's auth listener navigates into the app.
  const submitCode = async () => {
    setError(null);
    setSubmitting(true);

    try {
      await verifyEmailCode(getSupabase().auth, email, code);
      Keyboard.dismiss();
    } catch (caughtError) {
      setError(explainError(caughtError));
    } finally {
      setSubmitting(false);
    }
  };

  const useDifferentEmail = () => {
    setError(null);
    setCode("");
    setCodeSent(false);
  };

  const canRequest = Boolean(email.trim()) && !submitting;
  const canSubmit = isCompleteCode(code) && !submitting;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.screen}
    >
      <View style={styles.card}>
        <Text style={styles.eyebrow}>HUMANAUT SOS</Text>
        <Text style={styles.title}>Support, right when you need it.</Text>
        <Text style={styles.body}>
          {codeSent
            ? `We sent a sign-in code to ${email.trim()}. Enter it below.`
            : "Enter your email and we’ll send a sign-in code."}
        </Text>

        {error ? <ErrorBanner message={error} /> : null}

        {codeSent ? (
          <View style={styles.form}>
            <Text style={styles.label}>Sign-in code</Text>
            <TextInput
              autoComplete="one-time-code"
              autoFocus
              editable={!submitting}
              inputMode="numeric"
              keyboardType="number-pad"
              maxLength={OTP_MAX_LENGTH}
              onChangeText={(next) => setCode(normalizeCode(next))}
              placeholder="123456"
              placeholderTextColor={colors.body}
              style={[styles.input, styles.codeInput]}
              textContentType="oneTimeCode"
              value={code}
            />
            <Pressable
              accessibilityRole="button"
              disabled={!canSubmit}
              onPress={submitCode}
              style={({ pressed }) => [
                styles.button,
                !canSubmit && styles.buttonDisabled,
                pressed && styles.buttonPressed,
              ]}
            >
              {submitting ? (
                <ActivityIndicator color={colors.canvas} />
              ) : (
                <Text style={styles.buttonText}>Sign in</Text>
              )}
            </Pressable>

            <View style={styles.secondaryRow}>
              <Pressable
                accessibilityRole="button"
                disabled={submitting}
                onPress={requestCode}
              >
                <Text style={styles.secondaryText}>Resend code</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={submitting}
                onPress={useDifferentEmail}
              >
                <Text style={styles.secondaryText}>Use a different email</Text>
              </Pressable>
            </View>
          </View>
        ) : (
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
              disabled={!canRequest}
              onPress={requestCode}
              style={({ pressed }) => [
                styles.button,
                !canRequest && styles.buttonDisabled,
                pressed && styles.buttonPressed,
              ]}
            >
              {submitting ? (
                <ActivityIndicator color={colors.canvas} />
              ) : (
                <Text style={styles.buttonText}>Email me a code</Text>
              )}
            </Pressable>
          </View>
        )}
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
  codeInput: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: 8,
    textAlign: "center",
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
  secondaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  secondaryText: {
    color: colors.ember,
    fontSize: 15,
    fontWeight: "700",
  },
});
