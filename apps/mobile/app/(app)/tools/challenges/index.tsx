import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ErrorBanner } from "../../../../components/ErrorBanner";
import { MaterialSymbol } from "../../../../components/MaterialSymbol";
import {
  SosButton,
  SosLoading,
  SosScreen,
  sosTextStyles,
} from "../../../../components/SosUi";
import {
  fetchGroupChallenges,
  type GroupChallenge,
} from "../../../../src/data/groupChallenges";
import { explainError } from "../../../../src/lib/errors";
import {
  CHALLENGE_COPY,
  getChallengeListLabel,
  OTHER_TOOLS_EYEBROW,
  OTHER_TOOL_ROUTES,
} from "../../../../src/presentation/otherTools";
import { colors } from "../../../../src/theme/colors";

export default function ChallengeListScreen() {
  const router = useRouter();
  const [challenges, setChallenges] = useState<GroupChallenge[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setChallenges(await fetchGroupChallenges());
    } catch (caughtError) {
      setError(explainError(caughtError));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (!challenges && !error) {
    return (
      <SosScreen
        eyebrow={OTHER_TOOLS_EYEBROW}
        showBack
        title={CHALLENGE_COPY.listTitle}
      >
        <SosLoading label="Loading challenges…" />
      </SosScreen>
    );
  }

  if (!challenges) {
    return (
      <SosScreen
        eyebrow={OTHER_TOOLS_EYEBROW}
        showBack
        title={CHALLENGE_COPY.listTitle}
      >
        {error ? <ErrorBanner message={error} /> : null}
        <SosButton label="Try again" onPress={() => void load()} />
      </SosScreen>
    );
  }

  return (
    <SosScreen
      eyebrow={OTHER_TOOLS_EYEBROW}
      showBack
      subtitle={CHALLENGE_COPY.listSubtitle}
      title={CHALLENGE_COPY.listTitle}
    >
      {error ? <ErrorBanner message={error} /> : null}
      {challenges.map((challenge) => (
        <Pressable
          accessibilityRole="button"
          key={challenge.id}
          onPress={() =>
            router.push(`/(app)/tools/challenges/${challenge.id}` as never)
          }
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        >
          <View style={styles.iconBadge}>
            <MaterialSymbol color={colors.ember} name="emoji_events" size={22} />
          </View>
          <Text style={[sosTextStyles.strong, styles.rowLabel]}>
            {getChallengeListLabel({
              durationDays: challenge.duration_days,
              buyIn: challenge.buy_in,
            })}
          </Text>
          <MaterialSymbol color={colors.ember} name="arrow_forward" size={22} />
        </Pressable>
      ))}
      <SosButton
        label={CHALLENGE_COPY.start}
        onPress={() => router.push(OTHER_TOOL_ROUTES.challengeNew)}
      />
    </SosScreen>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    flexDirection: "row",
    gap: 12,
    minHeight: 72,
    padding: 16,
  },
  iconBadge: {
    alignItems: "center",
    backgroundColor: colors.emberTint,
    borderRadius: 999,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  rowLabel: { flex: 1 },
  pressed: { opacity: 0.72 },
});
