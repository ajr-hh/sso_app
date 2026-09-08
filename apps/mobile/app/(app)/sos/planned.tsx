import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { ErrorBanner } from "../../../components/ErrorBanner";
import { OtherToolsSection } from "../../../components/OtherToolsSection";
import { MaterialSymbol } from "../../../components/MaterialSymbol";
import {
  SosButton,
  SosCard,
  SosLoading,
  SosScreen,
  sosTextStyles,
} from "../../../components/SosUi";
import {
  fetchPlannedEventPlans,
  generatePlannedSuggestions,
  removePlannedEventPlan,
  savePlannedEventPlan,
  updatePlannedEventSuggestions,
  type PlannedEventPlan,
} from "../../../src/data/plannedSuggestions";
import { fetchProfile } from "../../../src/data/profile";
import { addTask, taskDayKey } from "../../../src/data/tasks";
import { addDays } from "../../../src/lib/domain";
import { explainError } from "../../../src/lib/errors";
import {
  canSaveOtherEvent,
  CHECK_IN_DONE,
  CHECK_IN_LABEL,
  CHECK_IN_SAVING_LABEL,
  customEventPills,
  eventKindFromLabel,
  eventLabelFromKind,
  fallbackSuggestionsFor,
  getCheckInTaskLabel,
  getRemoveEventLabel,
  getSuggestionsHeading,
  MAX_OTHER_LABEL,
  PLAN_AHEAD_COPY,
  upcomingEventChips,
  type PlannedSuggestion,
  type UpcomingEvent,
} from "../../../src/presentation/planned";
import { colors } from "../../../src/theme/colors";
import type { Profile } from "../../../src/types";

const EYEBROW = "PLAN AHEAD";
const TITLE = "Let’s plan ahead";
const SUBTITLE =
  "We have time here. We’re not trying to stop this, just help you make a few smart decisions.";

export default function PlannedScreen() {
  const generateToken = useRef(0);
  const generatingRef = useRef(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [plans, setPlans] = useState<PlannedEventPlan[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [event, setEvent] = useState<UpcomingEvent | null>(null);
  const [selectedCustom, setSelectedCustom] = useState<string | null>(null);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [otherLabel, setOtherLabel] = useState("");
  const [suggestions, setSuggestions] = useState<PlannedSuggestion[]>([]);
  const [generating, setGenerating] = useState(false);
  const [checkInSaving, setCheckInSaving] = useState(false);
  const [checkInSet, setCheckInSet] = useState(false);
  const [checkInError, setCheckInError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [loaded, loadedPlans] = await Promise.all([
        fetchProfile(),
        fetchPlannedEventPlans(),
      ]);
      setProfile(loaded);
      setPlans(loadedPlans);
      const latest = loadedPlans[loadedPlans.length - 1];
      if (latest && !generatingRef.current) {
        generateToken.current += 1;
        setActivePlanId(latest.id);
        if (latest.event_kind === "other" && latest.custom_label) {
          setSelectedCustom(latest.custom_label);
          setEvent(null);
          setOtherLabel("");
        } else {
          setSelectedCustom(null);
          setEvent(eventLabelFromKind(latest.event_kind));
        }
        setSuggestions(latest.suggestions);
      }
    } catch (caughtError) {
      setError(explainError(caughtError));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const persistPlan = async (
    nextEvent: UpcomingEvent,
    nextSuggestions: PlannedSuggestion[],
    nextLabel: string,
  ) => {
    try {
      const saved = await savePlannedEventPlan({
        eventKind: eventKindFromLabel(nextEvent),
        customLabel: nextEvent === "Other" ? nextLabel : undefined,
        suggestions: nextSuggestions,
      });
      setPlans((current) => [...current, saved]);
      setActivePlanId(saved.id);
      return saved;
    } catch (caughtError) {
      setError(explainError(caughtError));
      return null;
    }
  };

  const finishOtherSave = (nextLabel: string) => {
    setSelectedCustom(nextLabel.trim());
    setEvent(null);
    setOtherLabel("");
  };

  const runGenerate = async (
    nextEvent: UpcomingEvent,
    nextLabel = otherLabel,
  ) => {
    const token = ++generateToken.current;
    generatingRef.current = true;
    setGenerating(true);
    setSuggestions([]);
    setError(null);
    try {
      const generated = await generatePlannedSuggestions(
        nextEvent === "Other"
          ? { eventKind: "other", eventLabel: nextLabel.trim() }
          : { eventKind: eventKindFromLabel(nextEvent) },
      );
      if (token !== generateToken.current) return;
      setSuggestions(generated);
      const saved = await persistPlan(nextEvent, generated, nextLabel);
      if (saved?.event_kind === "other" && saved.custom_label) {
        finishOtherSave(saved.custom_label);
      }
    } catch (caughtError) {
      if (token !== generateToken.current) return;
      const fallback = fallbackSuggestionsFor(nextEvent, nextLabel);
      setError(explainError(caughtError));
      const saved = await persistPlan(nextEvent, fallback, nextLabel);
      if (saved?.event_kind === "other" && saved.custom_label) {
        finishOtherSave(saved.custom_label);
      }
    } finally {
      if (token === generateToken.current) {
        generatingRef.current = false;
        setGenerating(false);
      }
    }
  };

  const clearSelection = () => {
    generateToken.current += 1;
    generatingRef.current = false;
    setEvent(null);
    setSelectedCustom(null);
    setActivePlanId(null);
    setSuggestions([]);
    setGenerating(false);
  };

  const selectChip = (option: string) => {
    const pills = customEventPills(plans);
    if (option === "Other") {
      if (event === "Other") {
        clearSelection();
        return;
      }
      setEvent("Other");
      setSelectedCustom(null);
      setCheckInSet(false);
      generateToken.current += 1;
      generatingRef.current = false;
      setSuggestions([]);
      setGenerating(false);
      return;
    }
    if (pills.some((label) => label === option)) {
      if (selectedCustom === option) {
        clearSelection();
        return;
      }
      const plan = [...plans]
        .reverse()
        .find(
          (item) =>
            item.event_kind === "other" &&
            item.custom_label?.toLowerCase() === option.toLowerCase(),
        );
      setSelectedCustom(option);
      setEvent(null);
      setOtherLabel("");
      setCheckInSet(false);
      setActivePlanId(plan?.id ?? null);
      setSuggestions(plan?.suggestions ?? []);
      return;
    }
    const preset = option as UpcomingEvent;
    if (preset === event) {
      clearSelection();
      return;
    }
    setEvent(preset);
    setSelectedCustom(null);
    setCheckInSet(false);
    return runGenerate(preset);
  };

  const saveOther = () => {
    if (generating || !canSaveOtherEvent(otherLabel)) return;
    return runGenerate("Other", otherLabel);
  };

  const currentEvent: UpcomingEvent | null = selectedCustom
    ? "Other"
    : event && event !== "Other"
      ? event
      : null;
  const currentLabel = selectedCustom ?? otherLabel;

  const loadMore = async () => {
    if (generating || !currentEvent) return;
    const token = ++generateToken.current;
    generatingRef.current = true;
    setGenerating(true);
    setError(null);
    try {
      const generated = await generatePlannedSuggestions(
        currentEvent === "Other"
          ? {
              eventKind: "other",
              eventLabel: currentLabel.trim(),
              avoidTexts: suggestions.map((item) => item.text),
            }
          : {
              eventKind: eventKindFromLabel(currentEvent),
              avoidTexts: suggestions.map((item) => item.text),
            },
      );
      if (token !== generateToken.current) return;
      setSuggestions(generated);
      if (activePlanId) {
        const updated = await updatePlannedEventSuggestions(
          activePlanId,
          generated,
        );
        setPlans((current) =>
          current.map((plan) => (plan.id === updated.id ? updated : plan)),
        );
      } else {
        await persistPlan(currentEvent, generated, currentLabel);
      }
    } catch (caughtError) {
      if (token !== generateToken.current) return;
      setError(explainError(caughtError));
    } finally {
      if (token === generateToken.current) {
        generatingRef.current = false;
        setGenerating(false);
      }
    }
  };

  const removeEvent = async (label: string) => {
    const plan = [...plans]
      .reverse()
      .find(
        (item) =>
          item.event_kind === "other" &&
          item.custom_label?.toLowerCase() === label.toLowerCase(),
      );
    if (!plan) return;
    try {
      await removePlannedEventPlan(plan.id);
      setPlans((current) => current.filter((item) => item.id !== plan.id));
      if (selectedCustom === label) {
        clearSelection();
      }
    } catch (caughtError) {
      setError(explainError(caughtError));
    }
  };

  if (!profile && !error) {
    return (
      <SosScreen eyebrow={EYEBROW} showBack title={TITLE}>
        <SosLoading label="Building your event plan…" />
      </SosScreen>
    );
  }

  if (!profile) {
    return (
      <SosScreen eyebrow={EYEBROW} showBack title={TITLE}>
        {error ? <ErrorBanner message={error} /> : null}
        <SosButton label="Try again" onPress={load} />
      </SosScreen>
    );
  }

  const customPills = customEventPills(plans);
  const chips = upcomingEventChips(customPills);
  const headingEvent: UpcomingEvent | null = selectedCustom
    ? "Other"
    : event;
  const headingLabel = selectedCustom ?? otherLabel;

  const setCheckIn = async () => {
    if (checkInSaving) return;

    setCheckInSaving(true);
    setCheckInError(null);
    try {
      await addTask(
        getCheckInTaskLabel(headingEvent, headingLabel),
        addDays(taskDayKey(), 1),
      );
      setCheckInSet(true);
    } catch (caughtError) {
      setCheckInError(explainError(caughtError));
    } finally {
      setCheckInSaving(false);
    }
  };

  return (
    <SosScreen
      eyebrow={EYEBROW}
      keyboardAware
      showBack
      subtitle={SUBTITLE}
      title={TITLE}
    >
      {error ? <ErrorBanner message={error} /> : null}

      <SosCard>
        <Text style={sosTextStyles.sectionTitle}>What’s coming up?</Text>
        <View style={styles.eventRow}>
          {chips.map((option) => {
            const selected =
              option === "Other"
                ? event === "Other"
                : customPills.includes(option)
                  ? selectedCustom === option
                  : option === event;

            const custom = customPills.includes(option);
            return (
              <View
                key={option}
                style={[styles.eventChip, selected && styles.eventChipSelected]}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => selectChip(option)}
                  style={({ pressed }) => [
                    styles.eventChipPress,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.eventChipText,
                      selected && styles.eventChipTextSelected,
                    ]}
                  >
                    {option}
                  </Text>
                </Pressable>
                {custom ? (
                  <Pressable
                    accessibilityLabel={getRemoveEventLabel(option)}
                    accessibilityRole="button"
                    onPress={() => void removeEvent(option)}
                    style={styles.eventChipRemove}
                  >
                    <MaterialSymbol color={colors.ink} name="delete" size={18} />
                  </Pressable>
                ) : null}
              </View>
            );
          })}
        </View>
        {event === "Other" ? (
          <View style={styles.otherBlock}>
            <TextInput
              accessibilityLabel={PLAN_AHEAD_COPY.otherLabel}
              editable={!generating}
              maxLength={MAX_OTHER_LABEL}
              onChangeText={setOtherLabel}
              placeholder={PLAN_AHEAD_COPY.otherPlaceholder}
              style={styles.input}
              value={otherLabel}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityState={{
                busy: generating,
                disabled: generating || !canSaveOtherEvent(otherLabel),
              }}
              disabled={generating || !canSaveOtherEvent(otherLabel)}
              onPress={saveOther}
              style={[
                styles.save,
                (generating || !canSaveOtherEvent(otherLabel)) &&
                  styles.disabled,
              ]}
            >
              <Text style={styles.saveText}>
                {generating ? PLAN_AHEAD_COPY.saving : PLAN_AHEAD_COPY.save}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </SosCard>

      {generating && suggestions.length === 0 ? (
        <SosLoading label={PLAN_AHEAD_COPY.generating} />
      ) : null}

      {(event || selectedCustom) && suggestions.length > 0 ? (
        <SosCard>
          <View
            accessibilityLiveRegion={
              Platform.OS === "android" ? "polite" : "none"
            }
            role="status"
            style={styles.suggestionTile}
            testID="planned-suggestions"
          >
            <Text style={sosTextStyles.sectionTitle}>
              {getSuggestionsHeading(headingEvent ?? "Other", headingLabel)}
            </Text>
            {suggestions.map((suggestion, index) => (
              <View key={`${suggestion.icon}-${suggestion.text}`}>
                {index > 0 ? (
                  <View
                    style={styles.suggestionDivider}
                    testID="planned-suggestion-divider"
                  />
                ) : null}
                <View style={styles.suggestionRow}>
                  <View style={styles.iconBadge}>
                    <MaterialSymbol
                      color={colors.ink}
                      name={suggestion.icon}
                      size={20}
                    />
                  </View>
                  <Text style={[sosTextStyles.body, styles.suggestionCopy]}>
                    {suggestion.text}
                  </Text>
                </View>
              </View>
            ))}
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ busy: generating, disabled: generating }}
              disabled={generating}
              onPress={() => void loadMore()}
              style={[styles.save, generating && styles.disabled]}
            >
              <Text style={styles.saveText}>
                {generating ? PLAN_AHEAD_COPY.generating : PLAN_AHEAD_COPY.loadMore}
              </Text>
            </Pressable>
          </View>
        </SosCard>
      ) : null}

      <OtherToolsSection />

      {checkInError ? <ErrorBanner message={checkInError} /> : null}
      <SosButton
        disabled={checkInSaving || checkInSet}
        label={
          checkInSet
            ? CHECK_IN_DONE
            : checkInSaving
              ? CHECK_IN_SAVING_LABEL
              : CHECK_IN_LABEL
        }
        onPress={() => void setCheckIn()}
        size="large"
      />
      {checkInSet ? (
        <Text
          accessibilityLiveRegion={
            Platform.OS === "android" ? "polite" : "none"
          }
          role="status"
          style={styles.checkInNote}
        >
          It’s waiting in tomorrow’s tasks.
        </Text>
      ) : null}
    </SosScreen>
  );
}

const styles = StyleSheet.create({
  eventRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  eventChip: {
    alignItems: "center",
    backgroundColor: colors.canvas,
    borderColor: "#DCDEDE",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 48,
    paddingLeft: 16,
    paddingRight: 8,
  },
  eventChipPress: {
    justifyContent: "center",
    minHeight: 48,
    paddingRight: 8,
  },
  eventChipRemove: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    minWidth: 44,
  },
  eventChipSelected: {
    backgroundColor: colors.emberTint,
    borderColor: colors.ember,
  },
  eventChipText: { color: colors.ink, fontSize: 15, fontWeight: "700" },
  eventChipTextSelected: { color: colors.alert },
  pressed: { opacity: 0.72 },
  otherBlock: { gap: 12 },
  input: {
    backgroundColor: colors.canvas,
    borderColor: "#D7D9D9",
    borderRadius: 12,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  save: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
    borderColor: colors.ink,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: 14,
  },
  saveText: { color: colors.ink, fontSize: 14, fontWeight: "800" },
  suggestionTile: { gap: 12 },
  suggestionRow: {
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
  suggestionCopy: { flex: 1, paddingTop: 8 },
  suggestionDivider: {
    backgroundColor: "#E4E6E6",
    height: StyleSheet.hairlineWidth,
    marginVertical: 12,
  },
  checkInNote: { color: colors.body, fontSize: 14, textAlign: "center" },
  disabled: { opacity: 0.45 },
});
