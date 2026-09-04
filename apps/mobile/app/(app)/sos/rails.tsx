import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

import { ErrorBanner } from "../../../components/ErrorBanner";
import {
  RailList,
  SosButton,
  SosLoading,
  SosScreen,
} from "../../../components/SosUi";
import { fetchProfile } from "../../../src/data/profile";
import { rankRails, type RailId } from "../../../src/lib/domain";
import { explainError } from "../../../src/lib/errors";
import type { Profile } from "../../../src/types";

export default function RailsScreen() {
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
    return <SosLoading label="Loading your support plan…" />;
  }

  if (!profile) {
    return (
      <SosScreen eyebrow="RIGHT NOW" title="Choose your reset">
        {error ? <ErrorBanner message={error} /> : null}
        <SosButton label="Try again" onPress={load} />
      </SosScreen>
    );
  }

  const rails: { id: RailId; title: string }[] = rankRails(
    profile.motivators.split(","),
  );

  return (
    <SosScreen
      eyebrow="RIGHT NOW"
      subtitle="Start with what motivates you most, or choose another reset."
      title="Choose your reset"
    >
      {error ? <ErrorBanner message={error} /> : null}
      <RailList path="off_the_rails" rails={rails} />
    </SosScreen>
  );
}
