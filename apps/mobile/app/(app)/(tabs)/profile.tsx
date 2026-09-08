import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
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
import {
  FoodRulesSection,
  type FoodRulesSaveInput,
} from "../../../components/FoodRulesSection";
import { OtherToolsSection } from "../../../components/OtherToolsSection";
import { UsualCravingsSection } from "../../../components/UsualCravingsSection";
import { YourPeopleSection } from "../../../components/YourPeopleSection";
import {
  createAccountabilityContact,
  fetchAccountabilityContacts,
  removeAccountabilityContact,
  type AccountabilityContact,
  type CreateAccountabilityContactInput,
} from "../../../src/data/accountabilityContacts";
import {
  createCraving,
  fetchCravings,
  removeCraving,
  type Craving,
} from "../../../src/data/cravings";
import { fetchProfile, saveProfile } from "../../../src/data/profile";
import { explainError } from "../../../src/lib/errors";
import { signOut } from "../../../src/lib/session";
import {
  COACH_IDS,
  getCoachName,
  isCoachId,
} from "../../../src/presentation/coaches";
import { isProfileFoodRulesSection } from "../../../src/presentation/foodScreen";
import {
  applySilentProfileRefresh,
  isMotivationOption,
  MOTIVATION_OPTIONS,
  MOTIVATION_PROMPT,
  PROFILE_LOG_OUT,
} from "../../../src/presentation/profile";
import { colors } from "../../../src/theme/colors";
import type { Profile } from "../../../src/types";

const coachOptions = COACH_IDS;

export default function ProfileScreen() {
  const router = useRouter();
  const { section } = useLocalSearchParams<{ section?: string | string[] }>();
  const scrollRef = useRef<ScrollView>(null);
  const foodRulesY = useRef<number | null>(null);
  const pendingFoodRulesFocus = useRef(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [contacts, setContacts] = useState<AccountabilityContact[]>([]);
  const [cravings, setCravings] = useState<Craving[]>([]);
  const [loading, setLoading] = useState(true);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [cravingsLoading, setCravingsLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contactsError, setContactsError] = useState<string | null>(null);
  const [cravingsError, setCravingsError] = useState<string | null>(null);
  const [contactsStatus, setContactsStatus] = useState<string | null>(null);
  const [cravingsStatus, setCravingsStatus] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [peopleModalVisible, setPeopleModalVisible] = useState(false);
  const signingOutRef = useRef(false);
  const dirtyKeysRef = useRef(new Set<string>());
  const contactsRequestRef = useRef(0);
  const contactsMutationRevisionRef = useRef(0);
  const contactsMutationsInFlightRef = useRef(0);
  const cravingsRequestRef = useRef(0);
  const cravingsMutationRevisionRef = useRef(0);
  const cravingsMutationsInFlightRef = useRef(0);

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

  const loadContacts = useCallback(async (options?: { silent?: boolean }) => {
    const requestId = ++contactsRequestRef.current;
    const mutationRevision = contactsMutationRevisionRef.current;
    const canApply = () =>
      contactsRequestRef.current === requestId &&
      contactsMutationRevisionRef.current === mutationRevision &&
      contactsMutationsInFlightRef.current === 0;
    if (!options?.silent) {
      setContactsLoading(true);
    }
    // A load that can no longer apply leaves the previous error in place so the
    // retry affordance survives an overlapping mutation.
    try {
      const loadedContacts = await fetchAccountabilityContacts();
      if (canApply()) {
        setContacts(loadedContacts);
        setContactsError(null);
      }
    } catch {
      if (canApply()) {
        setContactsError("We couldn’t load your people. Try again.");
      }
    } finally {
      if (canApply()) {
        setContactsLoading(false);
      }
    }
  }, []);

  const loadCravings = useCallback(async (options?: { silent?: boolean }) => {
    const requestId = ++cravingsRequestRef.current;
    const mutationRevision = cravingsMutationRevisionRef.current;
    const canApply = () =>
      cravingsRequestRef.current === requestId &&
      cravingsMutationRevisionRef.current === mutationRevision &&
      cravingsMutationsInFlightRef.current === 0;
    if (!options?.silent) {
      setCravingsLoading(true);
    }
    try {
      const loadedCravings = await fetchCravings();
      if (canApply()) {
        setCravings(loadedCravings);
        setCravingsError(null);
      }
    } catch {
      if (canApply()) {
        setCravingsError("We couldn’t load your usual cravings. Try again.");
      }
    } finally {
      if (canApply()) setCravingsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    void loadContacts();
    void loadCravings();
  }, [load, loadContacts, loadCravings]);

  const refreshFoodSettings = useCallback(async () => {
    try {
      const incoming = await fetchProfile();
      setProfile((current) =>
        current
          ? applySilentProfileRefresh(current, incoming, dirtyKeysRef.current)
          : incoming,
      );
    } catch {
      // Keep the tiles on screen; a failed refresh should not blank Profile.
    }
    void loadContacts({ silent: true });
    void loadCravings({ silent: true });
  }, [loadContacts, loadCravings]);

  useFocusEffect(
    useCallback(() => {
      void refreshFoodSettings();
    }, [refreshFoodSettings]),
  );

  useEffect(() => {
    if (isProfileFoodRulesSection(section)) {
      pendingFoodRulesFocus.current = true;
    }
  }, [section]);

  const scrollToFoodRulesIfNeeded = useCallback(() => {
    if (
      !pendingFoodRulesFocus.current ||
      foodRulesY.current === null ||
      !scrollRef.current
    ) {
      return;
    }

    scrollRef.current.scrollTo({ y: foodRulesY.current, animated: false });
    pendingFoodRulesFocus.current = false;
    router.setParams({ section: undefined });
  }, [router]);

  const beginContactMutation = () => {
    contactsMutationsInFlightRef.current += 1;
    contactsMutationRevisionRef.current += 1;
    setContactsLoading(false);
    setContactsStatus(null);
  };

  const finishContactMutation = () => {
    contactsMutationsInFlightRef.current = Math.max(
      0,
      contactsMutationsInFlightRef.current - 1,
    );
    contactsMutationRevisionRef.current += 1;
    setContactsLoading(false);
  };

  const beginCravingMutation = () => {
    cravingsMutationsInFlightRef.current += 1;
    cravingsMutationRevisionRef.current += 1;
    setCravingsLoading(false);
    setCravingsStatus(null);
  };

  const finishCravingMutation = () => {
    cravingsMutationsInFlightRef.current = Math.max(
      0,
      cravingsMutationsInFlightRef.current - 1,
    );
    cravingsMutationRevisionRef.current += 1;
    setCravingsLoading(false);
  };

  const createContact = async (
    input: CreateAccountabilityContactInput,
  ): Promise<AccountabilityContact> => {
    beginContactMutation();
    try {
      const created = await createAccountabilityContact(input);
      setContacts((current) => [...current, created]);
      setContactsStatus(`${created.name} added.`);
      return created;
    } catch (caughtError) {
      throw new Error(
        `We couldn’t add ${input.name}. ${explainError(caughtError)}`,
        { cause: caughtError },
      );
    } finally {
      finishContactMutation();
    }
  };

  const removeContact = async (
    contact: AccountabilityContact,
  ): Promise<void> => {
    beginContactMutation();
    try {
      await removeAccountabilityContact(contact.id);
      setContacts((current) =>
        current.filter(({ id }) => id !== contact.id),
      );
      setContactsStatus(`${contact.name} removed.`);
    } catch (caughtError) {
      throw new Error(
        `We couldn’t remove ${contact.name}. ${explainError(caughtError)}`,
        { cause: caughtError },
      );
    } finally {
      finishContactMutation();
    }
  };

  const addCraving = async (label: string): Promise<Craving> => {
    beginCravingMutation();
    try {
      const created = await createCraving(label);
      setCravings((current) => [...current, created]);
      setCravingsStatus(`${created.label} added.`);
      return created;
    } catch {
      throw new Error("We couldn’t add that craving. Try again.");
    } finally {
      finishCravingMutation();
    }
  };

  const deleteCraving = async (craving: Craving): Promise<void> => {
    beginCravingMutation();
    try {
      await removeCraving(craving.id);
      setCravings((current) =>
        current.filter(({ id }) => id !== craving.id),
      );
      setCravingsStatus(`${craving.label} removed.`);
    } catch {
      throw new Error("We couldn’t remove that craving. Try again.");
    } finally {
      finishCravingMutation();
    }
  };

  const saveFoodRules = async (input: FoodRulesSaveInput): Promise<void> => {
    try {
      await saveProfile(input);
      setProfile((current) => (current ? { ...current, ...input } : current));
    } catch {
      throw new Error("We couldn’t save your food rules. Try again.");
    }
  };

  const updateProfile = <Key extends keyof Profile>(
    key: Key,
    value: Profile[Key],
  ) => {
    dirtyKeysRef.current.add(key);
    setSaved(false);
    setProfile((current) =>
      current ? { ...current, [key]: value } : current,
    );
  };

  const logOut = async () => {
    if (signingOutRef.current) {
      return;
    }
    signingOutRef.current = true;
    setError(null);
    setSigningOut(true);
    try {
      await signOut();
    } catch (caughtError) {
      signingOutRef.current = false;
      setError(explainError(caughtError));
      setSigningOut(false);
    }
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
      <View style={styles.flex}>
        <View style={styles.errorHeader}>
          <View style={styles.headerRow}>
            <Text style={styles.eyebrow}>YOUR SUPPORT PLAN</Text>
            <LogOutControl onPress={logOut} signingOut={signingOut} />
          </View>
        </View>
        <View style={styles.centered}>
          {error ? <ErrorBanner message={error} /> : null}
          <Button label="Try again" onPress={load} />
        </View>
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
        onContentSizeChange={scrollToFoodRulesIfNeeded}
        ref={scrollRef}
      >
        <View style={styles.headerRow}>
          <Text style={styles.eyebrow}>YOUR SUPPORT PLAN</Text>
          <LogOutControl onPress={logOut} signingOut={signingOut} />
        </View>
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
          options={MOTIVATION_OPTIONS}
          selected={profile.motivators}
          title={MOTIVATION_PROMPT}
          update={(value) => updateProfile("motivators", value)}
        />
        <ChoiceSection
          options={coachOptions}
          selected={profile.coach_style}
          title="Coach style"
          update={(value) => {
            updateProfile("coach_style", value);
            updateProfile("coach_style_set", true);
          }}
        />
        <YourPeopleSection
          contacts={contacts}
          loading={contactsLoading}
          loadError={contactsError}
          modalVisible={peopleModalVisible}
          onCreate={createContact}
          onModalVisibleChange={setPeopleModalVisible}
          onRemove={removeContact}
          onRetry={() => void loadContacts()}
          status={contactsStatus}
        />
        <View
          onLayout={(event) => {
            foodRulesY.current = event.nativeEvent.layout.y;
            scrollToFoodRulesIfNeeded();
          }}
          testID="profile-food-rules"
        >
          <FoodRulesSection
            allergens={profile.allergens}
            dietFlags={profile.diet_flags}
            onSave={saveFoodRules}
          />
        </View>
        <UsualCravingsSection
          cravings={cravings}
          loading={cravingsLoading}
          loadError={cravingsError}
          onCreate={addCraving}
          onRemove={deleteCraving}
          onRetry={() => void loadCravings()}
          status={cravingsStatus}
        />
        <OtherToolsSection />
        <Button
          disabled={busy}
          label={busy ? "Saving…" : "Save profile"}
          onPress={async () => {
            if (!isMotivationOption(profile.motivators)) {
              setError("Choose how you want to be motivated.");
              return;
            }

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
                coach_style_set: profile.coach_style_set,
              });
              dirtyKeysRef.current.clear();
              setSaved(true);
              Keyboard.dismiss();
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
            <Text style={styles.choiceText}>
              {isCoachId(option) ? getCoachName(option) : option}
            </Text>
          </Pressable>
        ))}
      </View>
    </Section>
  );
}

function LogOutControl({
  onPress,
  signingOut,
}: {
  onPress: () => Promise<void>;
  signingOut: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy: signingOut, disabled: signingOut }}
      disabled={signingOut}
      hitSlop={8}
      onPress={() => {
        void onPress();
      }}
      style={[styles.logOut, signingOut && styles.disabled]}
    >
      <Text style={styles.logOutText}>{PROFILE_LOG_OUT}</Text>
    </Pressable>
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
  errorHeader: { paddingHorizontal: 24, paddingTop: 24 },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  eyebrow: { color: colors.ember, flexShrink: 1, fontSize: 13, fontWeight: "800", letterSpacing: 1.5 },
  logOut: {
    alignItems: "center",
    backgroundColor: "transparent",
    borderColor: colors.ink,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 32,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  logOutText: { color: colors.ink, fontSize: 13, fontWeight: "800" },
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
