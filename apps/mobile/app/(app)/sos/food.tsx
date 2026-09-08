import { useFocusEffect } from "expo-router";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ErrorBanner } from "../../../components/ErrorBanner";
import { FoodSettingsFlyout } from "../../../components/FoodSettingsFlyout";
import type { FoodRulesSaveInput } from "../../../components/FoodRulesSection";
import { MaterialSymbol } from "../../../components/MaterialSymbol";
import { RecipeFlyout } from "../../../components/RecipeFlyout";
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
  removeCraving,
  type Craving,
} from "../../../src/data/cravings";
import {
  generateFoodSwaps,
  type GeneratedSwap,
} from "../../../src/data/generate";
import { fetchProfile, saveProfile } from "../../../src/data/profile";
import { loadSwapRecipe } from "../../../src/data/recipes";
import { logSosEvent } from "../../../src/data/sos";
import { explainError } from "../../../src/lib/errors";
import {
  getCravingSetupProgress,
  getSwapLabelValidationError,
  getUnusedCravingSuggestions,
  MIN_USUAL_CRAVINGS,
} from "../../../src/presentation/cravings";
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
import {
  getOpenRecipeLabel,
  RECIPE_COPY,
  RECIPE_ERRORS,
  type SwapRecipe,
} from "../../../src/presentation/recipes";
import { resolveSwapView, type SwapRow } from "../../../src/presentation/swaps";
import { colors } from "../../../src/theme/colors";
import type { Profile } from "../../../src/types";

export default function FoodScreen() {
  const path = useSosPath();
  const insets = useSafeAreaInsets();

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
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [cravingsStatus, setCravingsStatus] = useState<string | null>(null);
  const [recipeVisible, setRecipeVisible] = useState(false);
  const [recipeTitle, setRecipeTitle] = useState<string | null>(null);
  const [recipe, setRecipe] = useState<SwapRecipe | null>(null);
  const [recipeLoading, setRecipeLoading] = useState(false);
  const [recipeError, setRecipeError] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [addingSuggestion, setAddingSuggestion] = useState<string | null>(null);

  const profileRequestRef = useRef(0);
  const cravingsRequestRef = useRef(0);
  const cravingsMutationRevisionRef = useRef(0);
  const cravingsMutationsInFlightRef = useRef(0);
  const swapsRequestRef = useRef(0);
  const swapsMutationRevisionRef = useRef(0);
  const swapsMutationsInFlightRef = useRef(0);
  const addTriggerRef = useRef<View>(null);
  const gearRef = useRef<View>(null);
  const focusRestoredRef = useRef(true);
  const settingsFocusRestoredRef = useRef(true);

  const rules: FoodRules = useMemo(
    () => ({
      foodRulesSet: profile?.food_rules_set ?? false,
      dietFlags: profile?.diet_flags ?? [],
      allergens: profile?.allergens ?? [],
    }),
    [profile],
  );

  const loadProfile = useCallback(async () => {
    const requestId = ++profileRequestRef.current;
    const canApply = () => profileRequestRef.current === requestId;
    setProfileLoading(true);
    try {
      const loaded = await fetchProfile();
      if (canApply()) {
        setProfile(loaded);
        setProfileError(null);
      }
    } catch {
      if (canApply()) {
        setProfile(null);
        setProfileError(FOOD_SCREEN_ERRORS.rules);
      }
    } finally {
      if (canApply()) {
        setProfileLoading(false);
      }
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
    if (
      !rules.foodRulesSet ||
      cravings.length < MIN_USUAL_CRAVINGS ||
      !selectedId ||
      selectedLabel === null
    ) {
      return;
    }
    void loadSwaps(selectedId, selectedLabel);
  }, [
    cravings.length,
    loadSwaps,
    rules.foodRulesSet,
    selectedId,
    selectedLabel,
  ]);

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

  const restoreGearFocus = () => {
    if (settingsFocusRestoredRef.current) return;
    const handle = findNodeHandle(gearRef.current);
    if (handle === null) return;
    settingsFocusRestoredRef.current = true;
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
      setCravingsStatus(`${created.label} added.`);
      setAddError(null);
      setActionError(null);
      setCustomError(null);
      return created;
    } catch {
      throw new Error(FOOD_SCREEN_ERRORS.addCraving);
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
      throw new Error(FOOD_SCREEN_ERRORS.removeCraving);
    } finally {
      finishCravingMutation();
    }
  };

  const saveFoodRules = async (input: FoodRulesSaveInput): Promise<void> => {
    try {
      await saveProfile(input);
      setProfile((current) => (current ? { ...current, ...input } : current));
    } catch {
      throw new Error(FOOD_SCREEN_ERRORS.saveRules);
    }
  };

  const openSettings = () => {
    settingsFocusRestoredRef.current = false;
    setSettingsVisible(true);
  };

  const closeSettings = () => {
    setSettingsVisible(false);
  };

  const openRecipe = async (title: string) => {
    setRecipeTitle(title);
    setRecipeVisible(true);
    setRecipeLoading(true);
    setRecipeError(null);
    setRecipe(null);
    try {
      setRecipe(await loadSwapRecipe(title));
    } catch (caughtError) {
      setRecipeError(
        caughtError instanceof Error
          ? caughtError.message
          : RECIPE_ERRORS.load,
      );
    } finally {
      setRecipeLoading(false);
    }
  };

  const closeRecipe = () => {
    setRecipeVisible(false);
    setRecipeTitle(null);
    setRecipe(null);
    setRecipeError(null);
  };

  useEffect(() => {
    if (settingsVisible) return;
    restoreGearFocus();
  }, [settingsVisible]);

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

  const addSuggestion = async (label: string) => {
    if (addingSuggestion) return;
    setAddingSuggestion(label);
    setAddError(null);
    try {
      await addCraving(label);
    } catch (caughtError) {
      setAddError(
        caughtError instanceof Error
          ? caughtError.message
          : FOOD_SCREEN_ERRORS.addCraving,
      );
    } finally {
      setAddingSuggestion(null);
    }
  };

  const mode = getFoodScreenMode({
    foodRulesSet: rules.foodRulesSet,
    cravingCount: cravings.length,
  });
  const setupProgress = getCravingSetupProgress(cravings.length);
  const unusedSuggestions = getUnusedCravingSuggestions(
    cravings.map(({ label }) => label),
  );
  const addDisabled = !cravingsLoaded || cravingsError !== null;
  const swapsPending = swapsLoading || loadedCravingId !== selectedId;
  const showPersonalization = !profileLoading && !profileError;

  return (
    <View style={styles.root}>
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
            onPress={openSettings}
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
              <Text style={sosTextStyles.strong}>
                {FOOD_SCREEN_COPY.emptyCravingsProgress(setupProgress.remaining)}
              </Text>
              {unusedSuggestions.length > 0 ? (
                <>
                  <Text style={styles.label}>
                    {FOOD_SCREEN_COPY.emptyCravingsIdeas}
                  </Text>
                  <View
                    accessibilityLabel={FOOD_SCREEN_COPY.emptyCravingsIdeas}
                    style={styles.chips}
                  >
                    {unusedSuggestions.map((label) => {
                      const busy = addingSuggestion === label;
                      return (
                        <Pressable
                          accessibilityLabel={`Add ${label}`}
                          accessibilityRole="button"
                          accessibilityState={{
                            busy,
                            disabled: addDisabled || addingSuggestion !== null,
                          }}
                          disabled={addDisabled || addingSuggestion !== null}
                          key={label}
                          onPress={() => void addSuggestion(label)}
                          style={[
                            styles.chip,
                            busy && styles.chipSelected,
                            addDisabled && styles.disabled,
                          ]}
                        >
                          <Text style={styles.chipText}>{label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              ) : null}
            </>
          ) : null}
          {addError ? <ErrorBanner message={addError} /> : null}
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
                  <View style={styles.swapHeader}>
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
                        filled={row.favorited}
                        name="favorite"
                        size={22}
                      />
                    </Pressable>
                  </View>
                  <Pressable
                    accessibilityLabel={getOpenRecipeLabel(row.label)}
                    accessibilityRole="button"
                    onPress={() => void openRecipe(row.label)}
                    style={styles.recipeRow}
                  >
                    <Text style={styles.recipeText}>{RECIPE_COPY.addRecipe}</Text>
                    <MaterialSymbol
                      color={colors.ember}
                      name="arrow_forward"
                      size={18}
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
      {showPersonalization ? (
        <View style={{ height: 32 + insets.bottom }} />
      ) : null}
    </SosScreen>
    {showPersonalization ? (
      <Pressable
        accessibilityLabel={FOOD_SCREEN_COPY.settingsLabel}
        accessibilityRole="button"
        onPress={openSettings}
        ref={gearRef}
        style={[styles.gear, { bottom: 24 + insets.bottom }]}
      >
        <MaterialSymbol color={colors.ink} name="settings" size={26} />
      </Pressable>
    ) : null}
    <FoodSettingsFlyout
      allergens={rules.allergens}
      cravings={cravings}
      cravingsError={cravingsError}
      cravingsLoaded={cravingsLoaded}
      cravingsStatus={cravingsStatus}
      dietFlags={rules.dietFlags}
      onClose={closeSettings}
      onCreateCraving={addCraving}
      onRemoveCraving={deleteCraving}
      onRetryCravings={() => void loadCravings()}
      onSaveRules={saveFoodRules}
      visible={settingsVisible}
    />
    <RecipeFlyout
      error={recipeError}
      loading={recipeLoading}
      onClose={closeRecipe}
      onRetry={() => {
        if (recipeTitle) {
          void openRecipe(recipeTitle);
        }
      }}
      recipe={recipe}
      visible={recipeVisible}
    />
    </View>
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
  root: { backgroundColor: colors.canvas, flex: 1 },
  gear: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#D7D9D9",
    borderRadius: 999,
    borderWidth: 1,
    elevation: 4,
    height: 56,
    justifyContent: "center",
    position: "absolute",
    right: 20,
    shadowColor: "#141B1D",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    width: 56,
  },
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
    borderColor: "#D7D9D9",
    borderRadius: 12,
    borderWidth: 1,
    gap: 2,
    paddingBottom: 8,
    paddingHorizontal: 6,
  },
  swapHeader: {
    alignItems: "center",
    flexDirection: "row",
  },
  swapText: { color: colors.ink, flex: 1, fontSize: 16, paddingHorizontal: 8 },
  recipeRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 8,
  },
  recipeText: { color: colors.ember, fontSize: 14, fontWeight: "800" },
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
