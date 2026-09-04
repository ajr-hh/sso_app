import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";

import { ErrorBanner } from "../../../components/ErrorBanner";
import {
  RailList,
  SosButton,
  SosLoading,
  SosScreen,
} from "../../../components/SosUi";
import { fetchProfile, saveRailOrder } from "../../../src/data/profile";
import { orderRails, type RailId } from "../../../src/lib/domain";
import { explainError } from "../../../src/lib/errors";
import { createRailOrderSync } from "../../../src/presentation/rails";
import type { Profile } from "../../../src/types";

export default function RailsScreen() {
  const orderSync = useRef(createRailOrderSync());
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = orderSync.current.beginLoad();
    setError(null);
    try {
      const loaded = await fetchProfile();
      // A reorder saved since this fetch started is the newer truth.
      if (orderSync.current.shouldApplyLoad(token)) {
        setProfile(loaded);
      }
    } catch (caughtError) {
      if (orderSync.current.shouldApplyLoad(token)) {
        setError(explainError(caughtError));
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (!profile && !error) {
    return (
      <SosScreen eyebrow="RIGHT NOW" showBack title="Choose your reset">
        <SosLoading label="Loading your support plan…" />
      </SosScreen>
    );
  }

  if (!profile) {
    return (
      <SosScreen eyebrow="RIGHT NOW" showBack title="Choose your reset">
        {error ? <ErrorBanner message={error} /> : null}
        <SosButton label="Try again" onPress={load} />
      </SosScreen>
    );
  }

  const rails = orderRails(profile.rail_order);

  const persistOrder = async (ids: RailId[]) => {
    const previousOrder = profile.rail_order;
    const token = orderSync.current.beginSave();
    setError(null);
    setProfile((current) => (current ? { ...current, rail_order: ids } : current));
    try {
      await saveRailOrder(ids);
    } catch (caughtError) {
      // Only undo this save while it is still the order on screen.
      if (orderSync.current.shouldRollbackSave(token)) {
        setProfile((current) =>
          current ? { ...current, rail_order: previousOrder } : current,
        );
      }
      setError(explainError(caughtError));
      throw caughtError;
    } finally {
      orderSync.current.finishSave(token);
    }
  };

  return (
    <SosScreen
      eyebrow="RIGHT NOW"
      showBack
      subtitle="Choose the support that fits this moment."
      title="Choose your reset"
    >
      {error ? <ErrorBanner message={error} /> : null}
      <RailList
        onOrderChange={persistOrder}
        path="off_the_rails"
        rails={rails}
      />
    </SosScreen>
  );
}
