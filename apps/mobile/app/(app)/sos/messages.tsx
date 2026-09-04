import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Text } from "react-native";

import { ErrorBanner } from "../../../components/ErrorBanner";
import {
  SosButton,
  SosCard,
  SosLoading,
  SosScreen,
  sosTextStyles,
} from "../../../components/SosUi";
import { COACH_LIBRARY } from "../../../src/content/coach";
import { fetchProfile } from "../../../src/data/profile";
import { explainError } from "../../../src/lib/errors";
import type { Profile } from "../../../src/types";

export default function MessagesScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setProfile(await fetchProfile());
    } catch (caughtError) {
      setError(explainError(caughtError));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (!profile && !error) {
    return <SosLoading label="Loading your coach messages…" />;
  }

  if (!profile) {
    return (
      <SosScreen eyebrow="COACH MESSAGES" title="A voice in your corner">
        {error ? <ErrorBanner message={error} /> : null}
        <SosButton label="Try again" onPress={load} />
      </SosScreen>
    );
  }

  const coachName = profile.coach_style === "marcus" ? "Marcus" : "Elena";

  return (
    <SosScreen
      eyebrow={`${coachName.toUpperCase()} SAYS`}
      subtitle="Read one slowly. Let it interrupt the story in your head."
      title="A voice in your corner"
    >
      {error ? <ErrorBanner message={error} /> : null}
      {COACH_LIBRARY[profile.coach_style].map((message) => (
        <SosCard key={message}>
          <Text style={sosTextStyles.strong}>“{message}”</Text>
          <Text style={sosTextStyles.body}>— {coachName}</Text>
        </SosCard>
      ))}
    </SosScreen>
  );
}
