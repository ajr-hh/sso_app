import * as Linking from "expo-linking";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { ErrorBanner } from "../../../../components/ErrorBanner";
import { MaterialSymbol, type MaterialSymbolName } from "../../../../components/MaterialSymbol";
import {
  SosButton,
  SosCard,
  SosLoading,
  SosScreen,
  sosTextStyles,
} from "../../../../components/SosUi";
import {
  createGroupChallenge,
  fetchGroupChallenges,
  type GroupChallenge,
} from "../../../../src/data/groupChallenges";
import { explainError } from "../../../../src/lib/errors";
import {
  CHALLENGE_COPY,
  formatChallengeDuration,
  getChallengeInviteHref,
  getPrizePeopleLine,
  getPrizePoolLabel,
  OTHER_TOOLS_EYEBROW,
  prizePoolAmount,
} from "../../../../src/presentation/otherTools";
import { colors } from "../../../../src/theme/colors";

export default function ChallengeDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const creatingRef = useRef(false);
  const [challenge, setChallenge] = useState<GroupChallenge | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      if (id === "new") {
        if (creatingRef.current) return;
        creatingRef.current = true;
        setChallenge(await createGroupChallenge());
        return;
      }
      if (!id) {
        setError("We couldn’t load that challenge. Try again.");
        return;
      }
      const found = (await fetchGroupChallenges()).find((row) => row.id === id);
      if (!found) {
        setError("We couldn’t load that challenge. Try again.");
        return;
      }
      setChallenge(found);
    } catch (caughtError) {
      setError(explainError(caughtError));
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const invite = async () => {
    if (!challenge || inviting) return;
    setInviting(true);
    setError(null);
    try {
      const href = getChallengeInviteHref({
        buyIn: challenge.buy_in,
        durationDays: challenge.duration_days,
      });
      const canOpen = await Linking.canOpenURL(href);
      if (!canOpen) {
        setError("Mail isn’t available on this device.");
        return;
      }
      await Linking.openURL(href);
    } catch (caughtError) {
      setError(explainError(caughtError));
    } finally {
      setInviting(false);
    }
  };

  if (!challenge && !error) {
    return (
      <SosScreen
        eyebrow={OTHER_TOOLS_EYEBROW}
        showBack
        title={CHALLENGE_COPY.title}
      >
        <SosLoading label="Opening your challenge…" />
      </SosScreen>
    );
  }

  if (!challenge) {
    return (
      <SosScreen
        eyebrow={OTHER_TOOLS_EYEBROW}
        showBack
        title={CHALLENGE_COPY.title}
      >
        {error ? <ErrorBanner message={error} /> : null}
        <SosButton label="Try again" onPress={() => void load()} />
      </SosScreen>
    );
  }

  const people = 1 + challenge.invited_emails.length;
  const pool = prizePoolAmount(challenge.buy_in, people);
  const rules: { icon: MaterialSymbolName; label: string }[] = [
    { icon: "timer", label: formatChallengeDuration(challenge.duration_days) },
    { icon: "scale", label: CHALLENGE_COPY.logWeight },
    { icon: "block", label: CHALLENGE_COPY.missRule },
  ];

  return (
    <SosScreen
      eyebrow={OTHER_TOOLS_EYEBROW}
      showBack
      subtitle={CHALLENGE_COPY.subtitle}
      title={CHALLENGE_COPY.title}
    >
      {error ? <ErrorBanner message={error} /> : null}

      <SosCard>
        <Text style={sosTextStyles.sectionTitle}>{CHALLENGE_COPY.rules}</Text>
        {rules.map((rule, index) => (
          <View key={rule.label}>
            {index > 0 ? <View style={styles.divider} /> : null}
            <View style={styles.ruleRow}>
              <View style={styles.iconBadge}>
                <MaterialSymbol color={colors.ink} name={rule.icon} size={20} />
              </View>
              <Text style={[sosTextStyles.body, styles.ruleCopy]}>
                {rule.label}
              </Text>
            </View>
          </View>
        ))}
      </SosCard>

      <SosCard>
        <Text style={sosTextStyles.sectionTitle}>{CHALLENGE_COPY.prize}</Text>
        <Text style={sosTextStyles.body}>
          {CHALLENGE_COPY.prizeBody(challenge.buy_in)}
        </Text>
        <Text style={styles.poolAmount}>{getPrizePoolLabel(pool)}</Text>
        <Text style={sosTextStyles.body}>{getPrizePeopleLine(people)}</Text>
      </SosCard>

      <SosButton
        busy={inviting}
        label={inviting ? CHALLENGE_COPY.inviting : CHALLENGE_COPY.invite}
        onPress={() => void invite()}
      />
    </SosScreen>
  );
}

const styles = StyleSheet.create({
  divider: {
    backgroundColor: "#E4E6E6",
    height: StyleSheet.hairlineWidth,
    marginVertical: 10,
  },
  ruleRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
  },
  iconBadge: {
    alignItems: "center",
    backgroundColor: colors.canvas,
    borderRadius: 12,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  ruleCopy: { flex: 1, paddingTop: 8 },
  poolAmount: { color: colors.ember, fontSize: 28, fontWeight: "800" },
});
