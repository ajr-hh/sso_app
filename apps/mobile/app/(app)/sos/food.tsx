import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  findNodeHandle,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { ErrorBanner } from "../../../components/ErrorBanner";
import { MaterialSymbol } from "../../../components/MaterialSymbol";
import {
  SosButton,
  SosCard,
  SosScreen,
  sosTextStyles,
  useSosPath,
} from "../../../components/SosUi";
import { AddCravingFlyout } from "../../../components/UsualCravingsSection";
import { FOOD_SWAPS, FOOD_SWAP_TAGS } from "../../../src/content/food-swaps";
import {
  createCravingSwap,
  fetchCravingSwaps,
  setSwapFavorited,
  type CravingSwap,
} from "../../../src/data/cravingSwaps";
import {
  createCraving,
  fetchCravings,
  type Craving,
} from "../../../src/data/cravings";
import {
  generateFoodSwaps,
  type GeneratedSwap,
} from "../../../src/data/generate";
import { fetchProfile } from "../../../src/data/profile";
import { logSosEvent } from "../../../src/data/sos";
import { explainError } from "../../../src/lib/errors";
import { getSwapLabelValidationError } from "../../../src/presentation/cravings";
import type { FoodRules } from "../../../src/presentation/foodRules";
import {
  FOOD_SCREEN_COPY,
  FOOD_SCREEN_ERRORS,
  getCatalogSeedLabels,
  getFavoriteAction,
  getFoodScreenMode,
  getSelectedCravingId,
  getSwapToggleLabel,
  shouldShowIngredientNote,
  toSwapRows,
} from "../../../src/presentation/foodScreen";
import { resolveSwapView, type SwapRow } from "../../../src/presentation/swaps";
import { colors } from "../../../src/theme/colors";
import type { Profile } from "../../../src/types";

const PROFILE_PATH = "/(app)/(tabs)/profile";

export default function FoodScreen() {
  const path = useSosPath();
  const router = useRouter();

  const [logError, setLogError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [cravings, setCravings] = useState<Craving[]>([]);
  const [cravingsLoaded, setCravingsLoaded] = useState(false);
  const [cravingsError, setCravingsError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saved, setSaved] = useState<CravingSwap[]>([]);
  const [loadedCravingId, setLoadedCravingId] = useState<string | null>(null);
  const [swapsLoading, setSwapsLoading] = useState(false);
  const [swapsError, setSwapsError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [busySwapIds, setBusySwapIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [customLabel, setCustomLabel] = useState("");
  const [customError, setCustomError] = useState<string | null>(null);
  const [savingCustom, setSavingCustom] = useState(false);
  const [flyoutVisible, setFlyoutVisible] = useState(false);

  const cravingsRequestRef = useRef(0);
  const cravingsMutationRevisionRef = useRef(0);
  const cravingsMutationsInFlightRef = useRef(0);
  const swapsRequestRef = useRef(0);
  const swapsMutationRevisionRef = useRef(0);
  const swapsMutationsInFlightRef = useRef(0);
  const addTriggerRef = useRef<View>(null);
  const focusRestoredRef = useRef(true);

  const rules: FoodRules = useMemo(
    () => ({
      foodRulesSet: profile?.food_rules_set ?? false,
      dietFlags: profile?.diet_flags ?? [],
      allergens: profile?.allergens ?? [],
    }),
    [profile],
  );

  const loadProfile = useCallback(async () => {
    setProfileLoading(true);
    try {
      setProfile(await fetchProfile());
      setProfileError(null);
    } catch {
      setProfile(null);
      setProfileError(FOOD_SCREEN_ERRORS.rules);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  const loadCravings = useCallback(async () => {
    const requestId = ++cravingsRequestRef.current;
    const mutationRevision = cravingsMutationRevisionRef.current;
    const canApply = () =>
      cravingsRequestRef.current === requestId &&
      cravingsMutationRevisionRef.current === mutationRevision &&
      cravingsMutationsInFlightRef.current === 0;
    try {
      const loaded = await fetchCravings();
      if (canApply()) {
        setCravings(loaded);
        setCravingsError(null);
        setCravingsLoaded(true);
      }
    } catch {
      if (canApply()) {
        setCravingsError(FOOD_SCREEN_ERRORS.cravings);
      }
    }
  }, []);

  const loadSwaps = useCallback(
    async (cravingId: string, cravingLabel: string) => {
      const requestId = ++swapsRequestRef.current;
      const mutationRevision = swapsMutationRevisionRef.current;
      const canApply = () =>
        swapsRequestRef.current === requestId &&
        swapsMutationRevisionRef.current === mutationRevision &&
        swapsMutationsInFlightRef.current === 0;
      setSwapsLoading(true);
      try {
        let rows = await fetchCravingSwaps(cravingId);
        const seedLabels = getCatalogSeedLabels({
          cravingLabel,
          catalog: FOOD_SWAPS,
          tags: FOOD_SWAP_TAGS,
          rules,
          saved: toSwapRows(rows),
        });

        if (seedLabels.length > 0) {
          try {
            for (const label of seedLabels) {
              await createCravingSwap({
                craving_id: cravingId,
                label,
                favorited: false,
                source: "catalog",
                rule_tags: FOOD_SWAP_TAGS[label] ?? [],
              });
            }
          } catch {
            // A label this craving already has active is the expected clash
            // when two devices seed at once. The refetch below settles it
            // instead of putting a database message on screen.
          }
          rows = await fetchCravingSwaps(cravingId);
        }

        if (canApply()) {
          setSaved(rows);
          setSwapsError(null);
          setLoadedCravingId(cravingId);
        }
      } catch {
        if (canApply()) {
          setSaved([]);
          setSwapsError(FOOD_SCREEN_ERRORS.swaps);
          setLoadedCravingId(cravingId);
        }
      } finally {
        if (canApply()) {
          setSwapsLoading(false);
        }
      }
    },
    [rules],
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void logSosEvent(path, "food").catch((caughtError) => {
        if (active) {
          setLogError(explainError(caughtError));
        }
      });
      void loadProfile();
      void loadCravings();
      return () => {
        active = false;
      };
    }, [loadCravings, loadProfile, path]),
  );

  useEffect(() => {
    setSelectedId((current) => getSelectedCravingId(cravings, current));
  }, [cravings]);

  const selectedCraving = cravings.find(({ id }) => id === selectedId) ?? null;
  const selectedLabel = selectedCraving?.label ?? null;

  useEffect(() => {
    if (!rules.foodRulesSet || !selectedId || selectedLabel === null) {
      return;
    }
    void loadSwaps(selectedId, selectedLabel);
  }, [loadSwaps, rules.foodRulesSet, selectedId, selectedLabel]);

  const beginCravingMutation = () => {
    cravingsMutationsInFlightRef.current += 1;
    cravingsMutationRevisionRef.current += 1;
  };

  const finishCravingMutation = () => {
    cravingsMutationsInFlightRef.current = Math.max(
      0,
      cravingsMutationsInFlightRef.current - 1,
    );
    cravingsMutationRevisionRef.current += 1;
  };

  const beginSwapMutation = () => {
    swapsMutationsInFlightRef.current += 1;
    swapsMutationRevisionRef.current += 1;
    setSwapsLoading(false);
  };

  const finishSwapMutation = () => {
    swapsMutationsInFlightRef.current = Math.max(
      0,
      swapsMutationsInFlightRef.current - 1,
    );
    swapsMutationRevisionRef.current += 1;
  };

  // Native dismissal is the one restoration point, so a close path that runs
  // before the modal is gone cannot move focus behind it.
  const restoreAddTriggerFocus = () => {
    if (focusRestoredRef.current) return;
    const handle = findNodeHandle(addTriggerRef.current);
    if (handle === null) return;
    focusRestoredRef.current = true;
    AccessibilityInfo.setAccessibilityFocus(handle);
  };

  const markSwapBusy = (id: string, busy: boolean) => {
    setBusySwapIds((current) => {
      const next = new Set(current);
      if (busy) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const addCraving = async (label: string): Promise<Craving> => {
    beginCravingMutation();
    try {
      const created = await createCraving(label);
      setCravings((current) => [...current, created]);
      setSelectedId(created.id);
      setActionError(null);
      setCustomError(null);
      return created;
    } catch {
      throw new Error(FOOD_SCREEN_ERRORS.addCraving);
    } finally {
      finishCravingMutation();
    }
  };

  const view = useMemo(
    () =>
      resolveSwapView({
        cravingLabel: selectedLabel ?? "",
        catalog: FOOD_SWAPS,
        tags: FOOD_SWAP_TAGS,
        rules,
        saved: toSwapRows(saved),
      }),
    [rules, saved, selectedLabel],
  );
  const persistedIds = useMemo(
    () => new Set(saved.map(({ id }) => id)),
    [saved],
  );

  /**
   * Saving awaits the server before the star moves. An optimistic star would
   * have to roll back onto state a concurrent load may already have replaced,
   * so the row shows a busy state instead of a result it does not have yet.
   */
  const toggleFavorite = async (row: SwapRow) => {
    if (!selectedCraving || busySwapIds.has(row.id)) {
      return;
    }

    const action = getFavoriteAction(row, persistedIds);
    beginSwapMutation();
    markSwapBusy(row.id, true);
    setActionError(null);
    try {
      if (action.kind === "update") {
        await setSwapFavorited(action.id, action.favorited);
        setSaved((current) =>
          current.map((swap) =>
            swap.id === action.id
              ? { ...swap, favorited: action.favorited }
              : swap,
          ),
        );
      } else {
        const created = await createCravingSwap({
          craving_id: selectedCraving.id,
          label: action.label,
          favorited: true,
          source: "catalog",
          rule_tags: action.ruleTags,
        });
        setSaved((current) => [...current, created]);
      }
    } catch {
      setActionError(FOOD_SCREEN_ERRORS.favorite);
    } finally {
      markSwapBusy(row.id, false);
      finishSwapMutation();
    }
  };

  const generate = async () => {
    if (!selectedCraving || generating) {
      return;
    }

    const craving = selectedCraving;
    beginSwapMutation();
    setGenerating(true);
    setActionError(null);
    try {
      let generated: GeneratedSwap[];
      try {
        generated = await generateFoodSwaps({
          cravingLabel: craving.label,
          rules,
        });
      } catch (caughtError) {
        // generateFoodSwaps already returns member-safe copy that never
        // repeats the craving or the food rules.
        setActionError(
          caughtError instanceof Error
            ? caughtError.message
            : FOOD_SCREEN_ERRORS.saveGenerated,
        );
        return;
      }

      const created: CravingSwap[] = [];
      try {
        for (const swap of generated) {
          created.push(
            await createCravingSwap({
              craving_id: craving.id,
              label: swap.label,
              favorited: false,
              source: "ai",
              rule_tags: swap.ruleTags,
            }),
          );
        }
      } catch {
        setActionError(FOOD_SCREEN_ERRORS.saveGenerated);
      }

      // Only rows the server accepted reach the list, so a partial save shows
      // what was stored rather than inventing the rest.
      if (created.length > 0) {
        setSaved((current) => [...current, ...created]);
      }
    } finally {
      setGenerating(false);
      finishSwapMutation();
    }
  };

  const saveCustomSwap = async () => {
    if (!selectedCraving || savingCustom) {
      return;
    }

    const validationError = getSwapLabelValidationError(customLabel);
    if (validationError) {
      setCustomError(validationError);
      return;
    }

    beginSwapMutation();
    setSavingCustom(true);
    setCustomError(null);
    try {
      const created = await createCravingSwap({
        craving_id: selectedCraving.id,
        label: customLabel.trim(),
        favorited: true,
        source: "custom",
        // The member wrote this swap, so no catalog tags apply: empty means no
        // known conflicts, which is why the ingredient note stays on screen.
        rule_tags: [],
      });
      setSaved((current) => [...current, created]);
      setCustomLabel("");
    } catch {
      setCustomError(FOOD_SCREEN_ERRORS.saveCustom);
    } finally {
      setSavingCustom(false);
      finishSwapMutation();
    }
  };

  const mode = getFoodScreenMode({
    foodRulesSet: rules.foodRulesSet,
    cravingCount: cravings.length,
  });
  const addDisabled = !cravingsLoaded || cravingsError !== null;
  const swapsPending = swapsLoading || loadedCravingId !== selectedId;
  const showPersonalization = !profileLoading && !profileError;

  return (
    <SosScreen
      eyebrow="BETTER CHOICES"
      showBack
      subtitle={mode === "ready" ? FOOD_SCREEN_COPY.subtitle : undefined}
      title={FOOD_SCREEN_COPY.title}
    >
      {logError ? <ErrorBanner message={logError} /> : null}

      {profileLoading ? (
        <SosCard>
          <View
            accessibilityLabel="Loading your food rules"
            style={styles.loading}
          >
            <ActivityIndicator color={colors.ember} />
          </View>
        </SosCard>
      ) : null}

      {!profileLoading && profileError ? (
        <SosCard>
          <ErrorBanner message={profileError} />
          <RetryButton
            accessibilityLabel="Reload your food rules"
            onPress={() => void loadProfile()}
          />
        </SosCard>
      ) : null}

      {showPersonalization && mode === "needs_rules" ? (
        <SosCard>
          <Text accessibilityRole="header" style={sosTextStyles.sectionTitle}>
            {FOOD_SCREEN_COPY.needsRulesTitle}
          </Text>
          <Text style={sosTextStyles.body}>
            {FOOD_SCREEN_COPY.needsRulesBody}
          </Text>
          <SosButton
            label={FOOD_SCREEN_COPY.needsRulesButton}
            // navigate keeps the existing Profile tab instead of stacking a
            // second copy of the tab tree over this screen.
            onPress={() => router.navigate(PROFILE_PATH)}
          />
        </SosCard>
      ) : null}

      {showPersonalization && mode !== "needs_rules" ? (
        <SosCard>
          <Text accessibilityRole="header" style={sosTextStyles.sectionTitle}>
            {FOOD_SCREEN_COPY.cravingsLabel}
          </Text>
          {cravingsError ? (
            <>
              <ErrorBanner message={cravingsError} />
              <RetryButton
                accessibilityLabel="Reload your cravings"
                onPress={() => void loadCravings()}
              />
            </>
          ) : null}
          {!cravingsLoaded && !cravingsError ? (
            <View
              accessibilityLabel="Loading your cravings"
              style={styles.loading}
            >
              <ActivityIndicator color={colors.ember} />
            </View>
          ) : null}
          {cravingsLoaded && mode === "empty_cravings" ? (
            <>
              <Text style={sosTextStyles.strong}>
                {FOOD_SCREEN_COPY.emptyCravingsTitle}
              </Text>
              <Text style={sosTextStyles.body}>
                {FOOD_SCREEN_COPY.emptyCravingsBody}
              </Text>
            </>
          ) : null}
          {cravings.length > 0 ? (
            <View
              accessibilityLabel={FOOD_SCREEN_COPY.cravingsLabel}
              accessibilityRole="tablist"
              style={styles.chips}
            >
              {cravings.map((craving) => {
                const selected = craving.id === selectedId;
                return (
                  <Pressable
                    accessibilityRole="tab"
                    accessibilityState={{ selected }}
                    key={craving.id}
                    onPress={() => {
                      setActionError(null);
                      setCustomError(null);
                      setSelectedId(craving.id);
                    }}
                    style={[styles.chip, selected && styles.chipSelected]}
                  >
                    <Text style={styles.chipText}>{craving.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{
              busy: !cravingsLoaded && !cravingsError,
              disabled: addDisabled,
            }}
            disabled={addDisabled}
            onPress={() => {
              focusRestoredRef.current = false;
              setFlyoutVisible(true);
            }}
            ref={addTriggerRef}
            style={[styles.addButton, addDisabled && styles.disabled]}
          >
            <MaterialSymbol name="nutrition" size={22} />
            <Text style={styles.addText}>{FOOD_SCREEN_COPY.addCraving}</Text>
          </Pressable>
          <AddCravingFlyout
            existingLabels={cravings.map(({ label }) => label)}
            onClose={() => setFlyoutVisible(false)}
            onCreate={addCraving}
            onDismiss={restoreAddTriggerFocus}
            visible={flyoutVisible}
          />
        </SosCard>
      ) : null}

      {showPersonalization && mode === "ready" && selectedCraving ? (
        <SosCard>
          <Text accessibilityRole="header" style={sosTextStyles.sectionTitle}>
            {FOOD_SCREEN_COPY.swapsHeading}
          </Text>
          <Text style={sosTextStyles.body}>{selectedCraving.label}</Text>

          {swapsError ? (
            <>
              <ErrorBanner message={swapsError} />
              <RetryButton
                accessibilityLabel="Reload swaps"
                onPress={() =>
                  void loadSwaps(selectedCraving.id, selectedCraving.label)
                }
              />
            </>
          ) : null}

          {!swapsError && swapsPending ? (
            <View
              accessibilityLabel={FOOD_SCREEN_COPY.loadingSwaps}
              style={styles.loading}
            >
              <ActivityIndicator color={colors.ember} />
            </View>
          ) : null}

          {!swapsError && !swapsPending ? (
            <>
              {view.rows.map((row) => (
                <View key={row.id} style={styles.swap}>
                  <Text style={styles.swapText}>{row.label}</Text>
                  <Pressable
                    accessibilityLabel={getSwapToggleLabel(
                      row.label,
                      row.favorited,
                    )}
                    accessibilityRole="button"
                    accessibilityState={{
                      busy: busySwapIds.has(row.id),
                      selected: row.favorited,
                    }}
                    disabled={busySwapIds.has(row.id)}
                    onPress={() => void toggleFavorite(row)}
                    style={styles.star}
                  >
                    <MaterialSymbol
                      color={row.favorited ? colors.alert : colors.body}
                      name="favorite"
                      size={22}
                    />
                  </Pressable>
                </View>
              ))}

              {shouldShowIngredientNote(view) ? (
                <Text style={styles.note}>
                  {FOOD_SCREEN_COPY.ingredientNote}
                </Text>
              ) : null}

              {actionError ? <ErrorBanner message={actionError} /> : null}

              {view.showGenerate ? (
                <SosButton
                  disabled={generating}
                  label={
                    generating
                      ? FOOD_SCREEN_COPY.generateBusyButton
                      : FOOD_SCREEN_COPY.generateButton
                  }
                  onPress={() => void generate()}
                />
              ) : null}

              {view.allFilteredOut ? (
                <View style={styles.custom}>
                  <Text style={sosTextStyles.strong}>
                    {FOOD_SCREEN_COPY.filteredOut}
                  </Text>
                  {customError ? <ErrorBanner message={customError} /> : null}
                  <Text style={styles.label}>
                    {FOOD_SCREEN_COPY.customSwapLabel}
                  </Text>
                  <TextInput
                    accessibilityLabel={FOOD_SCREEN_COPY.customSwapLabel}
                    editable={!savingCustom}
                    maxLength={80}
                    onChangeText={setCustomLabel}
                    style={styles.input}
                    value={customLabel}
                  />
                  <SosButton
                    disabled={savingCustom}
                    label={
                      savingCustom
                        ? FOOD_SCREEN_COPY.customSwapBusyButton
                        : FOOD_SCREEN_COPY.customSwapButton
                    }
                    onPress={() => void saveCustomSwap()}
                  />
                </View>
              ) : null}
            </>
          ) : null}
        </SosCard>
      ) : null}
    </SosScreen>
  );
}

function RetryButton({
  accessibilityLabel,
  onPress,
}: {
  accessibilityLabel: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={styles.retryButton}
    >
      <Text style={styles.retryText}>Try again</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  loading: { alignItems: "center", justifyContent: "center", minHeight: 48 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  chip: {
    borderColor: "#C8CCCC",
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 14,
  },
  chipSelected: {
    backgroundColor: colors.emberTint,
    borderColor: colors.ember,
  },
  chipText: { color: colors.ink, fontSize: 15, fontWeight: "700" },
  addButton: {
    alignItems: "center",
    borderColor: "#C8CCCC",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    minHeight: 54,
  },
  addText: { color: colors.ink, fontSize: 16, fontWeight: "800" },
  swap: {
    alignItems: "center",
    borderColor: "#D7D9D9",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    paddingHorizontal: 14,
  },
  swapText: { color: colors.ink, flex: 1, fontSize: 16, paddingVertical: 14 },
  star: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    minWidth: 48,
  },
  note: { color: colors.body, fontSize: 14, lineHeight: 20 },
  custom: { gap: 12 },
  label: { color: colors.ink, fontSize: 14, fontWeight: "700" },
  input: {
    backgroundColor: colors.canvas,
    borderColor: "#D7D9D9",
    borderRadius: 12,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 16,
    minHeight: 50,
    paddingHorizontal: 14,
  },
  retryButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderColor: colors.ink,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 16,
  },
  retryText: { color: colors.ink, fontSize: 15, fontWeight: "800" },
  disabled: { opacity: 0.45 },
});
