import { useCallback, useEffect, useState } from "react";
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

import { ErrorBanner } from "../../../components/ErrorBanner";
import { fetchProfile, saveProfile } from "../../../src/data/profile";
import { explainError } from "../../../src/lib/errors";
import { colors } from "../../../src/theme/colors";
import type { Profile } from "../../../src/types";

const motivatorOptions = ["Remember why", "The numbers", "Rewards"] as const;
const coachOptions = ["marcus", "elena"] as const;

export default function ProfileScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setProfile(await fetchProfile());
    } catch (caughtError) {
      setProfile(null);
      setError(explainError(caughtError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const updateProfile = <Key extends keyof Profile>(
    key: Key,
    value: Profile[Key],
  ) => {
    setSaved(false);
    setProfile((current) =>
      current ? { ...current, [key]: value } : current,
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.ember} size="large" />
        <Text style={styles.body}>Loading your profile…</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.centered}>
        {error ? <ErrorBanner message={error} /> : null}
        <Button label="Try again" onPress={load} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.flex}
    >
      <ScrollView
        contentContainerStyle={styles.screen}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.eyebrow}>YOUR SUPPORT PLAN</Text>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.body}>Personalize the support you get.</Text>
        {error ? <ErrorBanner message={error} /> : null}
        {saved ? (
          <Text accessibilityLiveRegion="polite" style={styles.saved}>
            Profile saved.
          </Text>
        ) : null}

        <ProfileFields profile={profile} update={updateProfile} />
        <ChoiceSection
          options={motivatorOptions}
          selected={profile.motivators}
          title="What motivates you"
          update={(value) => updateProfile("motivators", value)}
        />
        <ChoiceSection
          options={coachOptions}
          selected={profile.coach_style}
          title="Coach style"
          update={(value) => updateProfile("coach_style", value)}
        />
        <Button
          disabled={busy}
          label={busy ? "Saving…" : "Save profile"}
          onPress={async () => {
            setBusy(true);
            setError(null);
            try {
              await saveProfile({
                display_name: profile.display_name?.trim() || null,
                age: profile.age,
                phone: profile.phone?.trim() || null,
                why_matters: profile.why_matters?.trim() || null,
                motivators: profile.motivators,
                coach_style: profile.coach_style,
              });
              setSaved(true);
            } catch (caughtError) {
              setError(explainError(caughtError));
            } finally {
              setBusy(false);
            }
          }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function ProfileFields({
  profile,
  update,
}: {
  profile: Profile;
  update: <Key extends keyof Profile>(key: Key, value: Profile[Key]) => void;
}) {
  return (
    <Section title="About you">
      <Field label="Name">
        <TextInput
          accessibilityLabel="Name"
          autoCapitalize="words"
          onChangeText={(value) => update("display_name", value)}
          placeholder="First Last"
          placeholderTextColor={colors.body}
          style={styles.input}
          value={profile.display_name ?? ""}
        />
      </Field>
      <Field label="Email">
        <View
          accessible
          accessibilityHint="This is the email address used to sign in."
          accessibilityLabel={`Email, ${profile.email ?? "not available"}, read only`}
          accessibilityRole="text"
          style={[styles.input, styles.readOnly]}
        >
          <Text style={styles.readOnlyText}>
            {profile.email ?? "Not available"}
          </Text>
        </View>
        <Text style={styles.hint}>
          You sign in with this address, so it can’t be changed here.
        </Text>
      </Field>
      <Field label="Phone">
        <TextInput
          accessibilityLabel="Phone, optional"
          keyboardType="phone-pad"
          onChangeText={(value) => update("phone", value)}
          placeholder="Optional"
          placeholderTextColor={colors.body}
          style={styles.input}
          value={profile.phone ?? ""}
        />
      </Field>
      <Field label="Age">
        <TextInput
          accessibilityLabel="Age, optional"
          keyboardType="number-pad"
          onChangeText={(value) =>
            update(
              "age",
              value.trim() ? Number.parseInt(value, 10) || null : null,
            )
          }
          placeholder="Optional"
          placeholderTextColor={colors.body}
          style={styles.input}
          value={profile.age?.toString() ?? ""}
        />
      </Field>
      <Field label="Why this matters">
        <TextInput
          accessibilityLabel="Why this matters"
          multiline
          onChangeText={(value) => update("why_matters", value)}
          placeholder="The reason you want to keep going"
          placeholderTextColor={colors.body}
          style={[styles.input, styles.textArea]}
          value={profile.why_matters ?? ""}
        />
      </Field>
    </Section>
  );
}

function Section({ children, title }: { children: React.ReactNode; title: string }) {
  return <View style={styles.section}><Text accessibilityRole="header" style={styles.sectionTitle}>{title}</Text>{children}</View>;
}

function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return <View style={styles.field}><Text accessible={false} style={styles.label}>{label}</Text>{children}</View>;
}

function ChoiceSection<Value extends string>({ options, selected, title, update }: {
  options: readonly Value[];
  selected: Value;
  title: string;
  update: (value: Value) => void;
}) {
  return (
    <Section title={title}>
      <View accessibilityLabel={title} accessibilityRole="radiogroup" style={styles.options}>
        {options.map((option) => (
          <Pressable accessibilityRole="radio" accessibilityState={{ selected: selected === option }} key={option} onPress={() => update(option)} style={[styles.choice, selected === option && styles.choiceSelected]}>
            <Text style={styles.choiceText}>{option === "marcus" ? "Marcus" : option === "elena" ? "Elena" : option}</Text>
          </Pressable>
        ))}
      </View>
    </Section>
  );
}

function Button({ disabled = false, label, onPress }: { disabled?: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[styles.button, disabled && styles.disabled]}>
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { backgroundColor: colors.canvas, flex: 1 },
  screen: { backgroundColor: colors.canvas, gap: 16, padding: 24, paddingBottom: 96 },
  centered: { alignItems: "center", backgroundColor: colors.canvas, flex: 1, gap: 16, justifyContent: "center", padding: 24 },
  eyebrow: { color: colors.ember, fontSize: 13, fontWeight: "800", letterSpacing: 1.5 },
  title: { color: colors.ink, fontSize: 36, fontWeight: "800" },
  body: { color: colors.body, fontSize: 16 },
  saved: { color: "#27633E", fontSize: 15, fontWeight: "700" },
  section: { backgroundColor: "#FFFFFF", borderRadius: 16, gap: 14, padding: 18 },
  sectionTitle: { color: colors.ink, fontSize: 21, fontWeight: "800" },
  field: { gap: 7 },
  label: { color: colors.ink, fontSize: 14, fontWeight: "700" },
  hint: { color: colors.body, fontSize: 13, lineHeight: 18 },
  input: { backgroundColor: colors.canvas, borderColor: "#D7D9D9", borderRadius: 12, borderWidth: 1, color: colors.ink, fontSize: 16, minHeight: 50, paddingHorizontal: 14, paddingVertical: 11 },
  readOnly: { backgroundColor: "#EDEFEF", justifyContent: "center" },
  readOnlyText: { color: colors.body, fontSize: 16 },
  textArea: { minHeight: 104, textAlignVertical: "top" },
  options: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  choice: { borderColor: "#C8CCCC", borderRadius: 999, borderWidth: 1, padding: 11 },
  choiceSelected: { backgroundColor: colors.emberTint, borderColor: colors.ember },
  choiceText: { color: colors.ink, fontSize: 15, fontWeight: "700" },
  button: { alignItems: "center", backgroundColor: colors.ember, borderRadius: 12, justifyContent: "center", minHeight: 50, paddingHorizontal: 16 },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  disabled: { opacity: 0.45 },
});
