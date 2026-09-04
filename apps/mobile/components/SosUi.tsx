import {
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { BackControl } from "./BackControl";
import { MaterialSymbol } from "./MaterialSymbol";
import type { SosPath } from "../src/data/sos";
import type { RailId, RailOption } from "../src/lib/domain";
import {
  getMoveBoundaryAnnouncement,
  getMoveControlHint,
  getMoveControlLabel,
  getMoveControlText,
  getMoveFailureStatus,
  getMovePositionText,
  getMoveSuccessStatus,
  getReorderModeAnnouncement,
  getReorderSavingStatus,
  shouldAnnounceReorderStatus,
  type MoveDirection,
} from "../src/presentation/rails";
import { colors } from "../src/theme/colors";

const RAIL_DESCRIPTIONS: Readonly<Record<RailId, string>> = {
  why: "Reconnect with the reason you started.",
  hard_truths: "Remember what you do not want to repeat.",
  stats: "Use the facts to steady your next choice.",
  rewards: "See the progress you have already earned.",
  food: "Find a better option for this craving.",
  messages: "Hear the voice you chose for hard moments.",
  call: "Call someone safe who can stay with you through this moment.",
};

const RAIL_ROUTES = {
  why: "/(app)/sos/why",
  hard_truths: "/(app)/sos/hard-truths",
  stats: "/(app)/sos/stats",
  rewards: "/(app)/sos/rewards",
  food: "/(app)/sos/food",
  messages: "/(app)/sos/messages",
  call: "/(app)/sos/call",
} as const satisfies Readonly<Record<RailId, string>>;

export function SosScreen({
  children,
  eyebrow,
  subtitle,
  title,
  showBack = false,
}: {
  children: ReactNode;
  eyebrow: string;
  subtitle?: string;
  title: string;
  showBack?: boolean;
}) {
  const router = useRouter();

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      {showBack ? (
        <BackControl
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/(app)/sos");
            }
          }}
        />
      ) : null}
      <View style={styles.heading}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
        {subtitle ? <Text style={styles.body}>{subtitle}</Text> : null}
      </View>
      {children}
    </ScrollView>
  );
}

export function SosCard({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

export function SosButton({
  disabled = false,
  label,
  onPress,
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

export function SosLoading({ label }: { label: string }) {
  return (
    <View style={styles.centered}>
      <ActivityIndicator color={colors.ember} size="large" />
      <Text style={styles.body}>{label}</Text>
    </View>
  );
}

export function RailList({
  onOrderChange,
  path,
  rails,
}: {
  onOrderChange: (ids: RailId[]) => Promise<void>;
  path: SosPath;
  rails: readonly RailOption[];
}) {
  const router = useRouter();
  const moveLocked = useRef(false);
  const [reordering, setReordering] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (status && shouldAnnounceReorderStatus(Platform.OS)) {
      AccessibilityInfo.announceForAccessibility(status);
    }
  }, [status]);

  const move = async (index: number, direction: MoveDirection) => {
    if (moveLocked.current) {
      return;
    }

    // Boundary controls stay enabled so focus survives a move to first or last;
    // pressing them there only reports that the order did not change.
    const target = index + (direction === "up" ? -1 : 1);
    if (target < 0 || target >= rails.length) {
      AccessibilityInfo.announceForAccessibility(
        getMoveBoundaryAnnouncement(direction, rails[index].title),
      );
      return;
    }

    const next = [...rails];
    moveLocked.current = true;
    [next[index], next[target]] = [next[target], next[index]];
    setSaving(true);
    setStatus(getReorderSavingStatus());
    try {
      await onOrderChange(next.map(({ id }) => id));
      setStatus(
        getMoveSuccessStatus(rails[index].title, target + 1, rails.length),
      );
    } catch {
      // The parent rolls back the optimistic order and its ErrorBanner explains
      // the failure; this status only confirms the order the list is showing.
      setStatus(getMoveFailureStatus());
    } finally {
      moveLocked.current = false;
      setSaving(false);
    }
  };

  const toggleReordering = () => {
    if (saving) {
      return;
    }

    const nextReordering = !reordering;
    setReordering(nextReordering);
    setStatus(null);
    AccessibilityInfo.announceForAccessibility(
      getReorderModeAnnouncement(nextReordering),
    );
  };

  return (
    <View style={styles.railList}>
      <View style={styles.reorderHeader}>
        {/* Mounted permanently so Android reads each new status from the same
            live region instead of missing a region that just appeared. */}
        <View
          accessibilityLiveRegion={
            Platform.OS === "android" ? "polite" : "none"
          }
          role="status"
          style={styles.statusRegion}
        >
          {status ? <Text style={styles.statusText}>{status}</Text> : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: saving, expanded: reordering }}
          disabled={saving}
          onPress={toggleReordering}
          style={({ pressed }) => [
            styles.reorderToggle,
            saving && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.reorderToggleText}>
            {reordering
              ? "Done reordering support options"
              : "Reorder support options"}
          </Text>
        </Pressable>
      </View>
      {rails.map((rail, index) => (
        <View key={rail.id} style={styles.railRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: reordering }}
            disabled={reordering}
            onPress={() =>
              router.push({
                pathname: RAIL_ROUTES[rail.id],
                params: { path },
              })
            }
            // Reorder mode blocks navigation without dimming the rail, so the
            // title and description keep their contrast while it is on.
            style={({ pressed }) => [styles.rail, pressed && styles.pressed]}
          >
            <View style={styles.railIcon}>
              <MaterialSymbol color={colors.ember} name={rail.icon} size={24} />
            </View>
            <View style={styles.railCopy}>
              <Text style={styles.railTitle}>{rail.title}</Text>
              <Text style={styles.railBody}>
                {RAIL_DESCRIPTIONS[rail.id]}
              </Text>
            </View>
            <MaterialSymbol
              color={colors.ember}
              name="arrow_forward"
              size={24}
            />
          </Pressable>
          {reordering ? (
            <View style={styles.moveControls}>
              <Text style={styles.positionText}>
                {getMovePositionText(index, rails.length)}
              </Text>
              <MoveControl
                direction="up"
                index={index}
                onPress={() => void move(index, "up")}
                saving={saving}
                title={rail.title}
                total={rails.length}
              />
              <MoveControl
                direction="down"
                index={index}
                onPress={() => void move(index, "down")}
                saving={saving}
                title={rail.title}
                total={rails.length}
              />
            </View>
          ) : null}
        </View>
      ))}
    </View>
  );
}

function MoveControl({
  direction,
  index,
  onPress,
  saving,
  title,
  total,
}: {
  direction: MoveDirection;
  index: number;
  onPress: () => void;
  saving: boolean;
  title: string;
  total: number;
}) {
  return (
    <Pressable
      accessibilityHint={getMoveControlHint(index, total)}
      accessibilityLabel={getMoveControlLabel(direction, title)}
      accessibilityRole="button"
      accessibilityState={{ disabled: saving }}
      disabled={saving}
      onPress={onPress}
      style={({ pressed }) => [
        styles.moveButton,
        saving && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.moveButtonText}>{getMoveControlText(direction)}</Text>
    </Pressable>
  );
}

export function useSosPath(): SosPath {
  const { path } = useLocalSearchParams<{ path?: string }>();
  return path === "planned_event" ? "planned_event" : "off_the_rails";
}

export const sosTextStyles = StyleSheet.create({
  sectionTitle: { color: colors.ink, fontSize: 21, fontWeight: "800" },
  body: { color: colors.body, fontSize: 16, lineHeight: 23 },
  strong: { color: colors.ink, fontSize: 17, fontWeight: "800" },
  // The ember accent only reaches 2.5:1 on the canvas, so accent text uses the
  // darker alert token instead.
  number: { color: colors.alert, fontSize: 40, fontWeight: "900" },
});

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.canvas,
    gap: 16,
    padding: 24,
    paddingBottom: 48,
  },
  centered: {
    alignItems: "center",
    backgroundColor: colors.canvas,
    flex: 1,
    gap: 16,
    justifyContent: "center",
    padding: 24,
  },
  heading: { gap: 6 },
  eyebrow: {
    color: colors.alert,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  title: { color: colors.ink, fontSize: 36, fontWeight: "800" },
  body: { color: colors.body, fontSize: 16, lineHeight: 23 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    gap: 12,
    padding: 18,
  },
  button: {
    alignItems: "center",
    backgroundColor: colors.ember,
    borderRadius: 12,
    justifyContent: "center",
    minHeight: 50,
    paddingHorizontal: 18,
  },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.72 },
  railList: { gap: 10 },
  railRow: { gap: 6 },
  rail: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    flexDirection: "row",
    gap: 13,
    minHeight: 92,
    padding: 16,
  },
  railIcon: {
    alignItems: "center",
    backgroundColor: colors.emberTint,
    borderRadius: 999,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  railCopy: { flex: 1, gap: 4 },
  railTitle: { color: colors.ink, fontSize: 19, fontWeight: "800" },
  railBody: { color: colors.body, fontSize: 14, lineHeight: 19 },
  reorderHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },
  statusRegion: { flex: 1 },
  statusText: { color: colors.ink, fontSize: 14, fontWeight: "700" },
  reorderToggle: {
    justifyContent: "center",
    minHeight: 44,
    padding: 8,
  },
  reorderToggleText: { color: colors.ink, fontSize: 16, fontWeight: "800" },
  moveControls: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "flex-end",
  },
  positionText: { color: colors.body, flex: 1, fontSize: 14 },
  moveButton: {
    backgroundColor: colors.emberTint,
    borderRadius: 10,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  moveButtonText: { color: colors.ink, fontSize: 14, fontWeight: "700" },
});
