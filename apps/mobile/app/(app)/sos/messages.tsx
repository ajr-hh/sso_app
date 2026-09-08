import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { ErrorBanner } from "../../../components/ErrorBanner";
import {
  SosButton,
  SosCard,
  SosLoading,
  SosScreen,
  sosTextStyles,
  useSosPath,
} from "../../../components/SosUi";
import {
  createCoachMessage,
  fetchCoachMessages,
  generateCoachReply,
  hideCoachMessage,
  hideVisibleCoachMessages,
  type CoachMessage,
} from "../../../src/data/coachMessages";
import { fetchProfile, saveProfile } from "../../../src/data/profile";
import { logSosEvent } from "../../../src/data/sos";
import { explainError } from "../../../src/lib/errors";
import {
  COACH_COPY,
  COACH_IDS,
  COACHES,
  coachPickerAccessibilityLabel,
  getCoachMessageValidationError,
  getCoachName,
  shouldPickCoach,
  type CoachId,
} from "../../../src/presentation/coaches";
import { colors } from "../../../src/theme/colors";
import type { Profile } from "../../../src/types";

export default function MessagesScreen() {
  const path = useSosPath();
  const openingPromiseRef = useRef<Promise<CoachMessage> | null>(null);
  const threadRequestRef = useRef(0);
  const pickLocked = useRef(false);
  const sendingRef = useRef(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [emptyAllowed, setEmptyAllowed] = useState(false);

  const loadThread = useCallback(async (coachStyle: CoachId) => {
    if (sendingRef.current) {
      return;
    }
    const requestId = ++threadRequestRef.current;
    const existing = await fetchCoachMessages(coachStyle);
    if (sendingRef.current || threadRequestRef.current !== requestId) {
      return;
    }
    if (existing.length > 0) {
      setMessages(existing);
      return;
    }
    if (!openingPromiseRef.current) {
      openingPromiseRef.current = (async () => {
        const body = await generateCoachReply(coachStyle);
        return createCoachMessage({
          coachStyle,
          role: "coach",
          body,
        });
      })().finally(() => {
        openingPromiseRef.current = null;
      });
    }
    const openingMsg = await openingPromiseRef.current;
    if (sendingRef.current || threadRequestRef.current !== requestId) {
      return;
    }
    setMessages([openingMsg]);
  }, []);

  const load = useCallback(async () => {
    if (sendingRef.current || pickLocked.current) {
      return;
    }
    setError(null);
    try {
      const nextProfile = await fetchProfile();
      if (sendingRef.current || pickLocked.current) {
        return;
      }
      setProfile(nextProfile);
      if (!shouldPickCoach(nextProfile.coach_style_set)) {
        await loadThread(nextProfile.coach_style);
      }
    } catch (caughtError) {
      setError(explainError(caughtError));
    }
  }, [loadThread]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void load();
      void logSosEvent(path, "messages").catch((caughtError) => {
        if (active) {
          setError(explainError(caughtError));
        }
      });
      return () => {
        active = false;
      };
    }, [load, path]),
  );

  const pickCoach = async (coachStyle: CoachId) => {
    if (pickLocked.current) {
      return;
    }
    pickLocked.current = true;
    setPreparing(true);
    setError(null);
    try {
      await saveProfile({
        coach_style: coachStyle,
        coach_style_set: true,
      });
      setProfile((current) =>
        current
          ? { ...current, coach_style: coachStyle, coach_style_set: true }
          : current,
      );
      await loadThread(coachStyle);
    } catch (caughtError) {
      setError(explainError(caughtError));
    } finally {
      pickLocked.current = false;
      setPreparing(false);
    }
  };

  const send = async (coachStyle: CoachId) => {
    if (sendingRef.current) {
      return;
    }
    const validationError = getCoachMessageValidationError(draft);
    if (validationError) {
      setError(validationError);
      return;
    }
    const body = draft.trim();
    sendingRef.current = true;
    threadRequestRef.current += 1;
    setSending(true);
    setError(null);
    try {
      const member = await createCoachMessage({
        coachStyle,
        role: "member",
        body,
      });
      setMessages((current) => [...current, member]);
      setDraft("");
      Keyboard.dismiss();
      const reply = await generateCoachReply(coachStyle);
      const coach = await createCoachMessage({
        coachStyle,
        role: "coach",
        body: reply,
      });
      setMessages((current) => [...current, coach]);
    } catch (caughtError) {
      setError(explainError(caughtError));
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  const hideOne = async (message: CoachMessage) => {
    setError(null);
    try {
      await hideCoachMessage(message.id);
      setMessages((current) => {
        const remaining = current.filter(({ id }) => id !== message.id);
        if (remaining.length === 0) {
          setEmptyAllowed(true);
        }
        return remaining;
      });
    } catch (caughtError) {
      setError(explainError(caughtError));
    }
  };

  const hideAll = async (coachStyle: CoachId) => {
    setError(null);
    try {
      await hideVisibleCoachMessages(coachStyle);
      setEmptyAllowed(true);
      setMessages([]);
    } catch (caughtError) {
      setError(explainError(caughtError));
    }
  };

  if (!profile && !error) {
    return (
      <SosScreen
        eyebrow="COACH MESSAGES"
        showBack
        title="A voice in your corner"
      >
        <SosLoading label="Loading your coach messages…" />
      </SosScreen>
    );
  }

  if (!profile) {
    return (
      <SosScreen
        eyebrow="COACH MESSAGES"
        showBack
        title="A voice in your corner"
      >
        {error ? <ErrorBanner message={error} /> : null}
        <SosButton label="Try again" onPress={() => void load()} />
      </SosScreen>
    );
  }

  if (shouldPickCoach(profile.coach_style_set) && !preparing) {
    return (
      <SosScreen
        eyebrow="COACH MESSAGES"
        showBack
        subtitle={COACH_COPY.pickerBody}
        title={COACH_COPY.pickerTitle}
      >
        {error ? <ErrorBanner message={error} /> : null}
        {COACH_IDS.map((id) => (
          <Pressable
            accessibilityLabel={coachPickerAccessibilityLabel(
              COACHES[id].name,
              COACHES[id].blurb,
            )}
            accessibilityRole="button"
            accessibilityState={{ disabled: preparing }}
            disabled={preparing}
            key={id}
            onPress={() => pickCoach(id)}
          >
            <SosCard>
              <Text style={sosTextStyles.strong}>{COACHES[id].name}</Text>
              <Text style={sosTextStyles.body}>{COACHES[id].blurb}</Text>
            </SosCard>
          </Pressable>
        ))}
      </SosScreen>
    );
  }

  if (preparing || (messages.length === 0 && !error && !emptyAllowed)) {
    return (
      <SosScreen
        eyebrow="COACH MESSAGES"
        showBack
        title="A voice in your corner"
      >
        <SosLoading label={COACH_COPY.opening} />
      </SosScreen>
    );
  }

  if (messages.length === 0 && !emptyAllowed) {
    return (
      <SosScreen
        eyebrow="COACH MESSAGES"
        showBack
        title="A voice in your corner"
      >
        {error ? <ErrorBanner message={error} /> : null}
        <SosButton label="Try again" onPress={() => void load()} />
      </SosScreen>
    );
  }

  const coachName = getCoachName(profile.coach_style);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.flex}
    >
      <SosScreen
        eyebrow={`${coachName.toUpperCase()}`}
        showBack
        subtitle="Write like you would to a person. They will write back."
        title="A voice in your corner"
      >
        {error ? <ErrorBanner message={error} /> : null}
        {messages.map((message) => (
          <SosCard key={message.id}>
            <View style={styles.messageHeader}>
              <Text style={sosTextStyles.body}>
                {message.role === "member" ? "You" : coachName}
              </Text>
              <Pressable
                accessibilityLabel={`Delete ${message.body}`}
                accessibilityRole="button"
                onPress={() => void hideOne(message)}
              >
                <Text style={styles.deleteText}>{COACH_COPY.delete}</Text>
              </Pressable>
            </View>
            <Text style={sosTextStyles.strong}>{message.body}</Text>
          </SosCard>
        ))}
        <View style={styles.composer}>
          <TextInput
            accessibilityLabel={COACH_COPY.composerLabel}
            editable={!sending}
            maxLength={280}
            multiline
            onChangeText={setDraft}
            placeholder="What's going on?"
            style={styles.input}
            value={draft}
          />
          <SosButton
            busy={sending}
            label={sending ? COACH_COPY.sending : COACH_COPY.send}
            onPress={() => send(profile.coach_style)}
          />
          {messages.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => void hideAll(profile.coach_style)}
              style={styles.clearButton}
            >
              <Text style={styles.clearText}>{COACH_COPY.clear}</Text>
            </Pressable>
          ) : null}
        </View>
      </SosScreen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  messageHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  deleteText: { color: colors.alert, fontSize: 15, fontWeight: "800" },
  composer: { gap: 12 },
  clearButton: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "transparent",
    borderColor: colors.ink,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 32,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  clearText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "700",
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    minHeight: 88,
    padding: 16,
    color: colors.ink,
    fontSize: 16,
    textAlignVertical: "top",
  },
});
