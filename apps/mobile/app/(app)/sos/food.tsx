import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Text } from "react-native";

import { ErrorBanner } from "../../../components/ErrorBanner";
import {
  SosCard,
  SosScreen,
  sosTextStyles,
  useSosPath,
} from "../../../components/SosUi";
import { FOOD_SWAPS } from "../../../src/content/food-swaps";
import { logSosEvent } from "../../../src/data/sos";
import { explainError } from "../../../src/lib/errors";

export default function FoodScreen() {
  const path = useSosPath();
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void logSosEvent(path, "food").catch((caughtError) => {
        if (active) {
          setError(explainError(caughtError));
        }
      });
      return () => {
        active = false;
      };
    }, [path]),
  );

  return (
    <SosScreen
      eyebrow="BETTER CHOICES"
      subtitle="Name what you want, then choose an option that still feels satisfying."
      title="Make the next swap"
    >
      {error ? <ErrorBanner message={error} /> : null}
      {Object.entries(FOOD_SWAPS).map(([craving, swaps]) => (
        <SosCard key={craving}>
          <Text style={sosTextStyles.sectionTitle}>{craving}</Text>
          {swaps.map((swap) => (
            <Text key={swap} style={sosTextStyles.body}>
              • {swap}
            </Text>
          ))}
        </SosCard>
      ))}
    </SosScreen>
  );
}
