import * as Linking from "expo-linking";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ErrorBanner } from "../../../components/ErrorBanner";
import {
  SosButton,
  SosCard,
  SosLoading,
  SosScreen,
  sosTextStyles,
  useSosPath,
} from "../../../components/SosUi";
import { YourPeopleSection } from "../../../components/YourPeopleSection";
import {
  createAccountabilityContact,
  fetchAccountabilityContacts,
  type AccountabilityContact,
  type CreateAccountabilityContactInput,
} from "../../../src/data/accountabilityContacts";
import { logSosEvent } from "../../../src/data/sos";
import { explainError } from "../../../src/lib/errors";
import {
  CALL_COPY,
  getRelationshipLabel,
  phoneHrefForCall,
  phoneHrefForSms,
} from "../../../src/presentation/accountabilityContacts";
import { colors } from "../../../src/theme/colors";

export default function CallScreen() {
  const path = useSosPath();
  const [contacts, setContacts] = useState<AccountabilityContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyHref, setBusyHref] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addVisible, setAddVisible] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setContacts(await fetchAccountabilityContacts());
      setError(null);
    } catch (caughtError) {
      setError(explainError(caughtError));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void logSosEvent(path, "call").catch((caughtError) => {
        if (active) {
          setError(explainError(caughtError));
        }
      });
      void load();
      return () => {
        active = false;
      };
    }, [load, path]),
  );

  const openHref = async (href: string, unavailable: string) => {
    setBusyHref(href);
    setError(null);
    try {
      const canOpen = await Linking.canOpenURL(href);
      if (!canOpen) {
        setError(unavailable);
        return;
      }
      await Linking.openURL(href);
    } catch (caughtError) {
      setError(explainError(caughtError));
    } finally {
      setBusyHref(null);
    }
  };

  const onCreate = async (
    input: CreateAccountabilityContactInput,
  ): Promise<AccountabilityContact> => {
    const created = await createAccountabilityContact(input);
    setContacts((current) => [...current, created]);
    setError(null);
    return created;
  };

  return (
    <SosScreen
      eyebrow="TALK TO SOMEONE"
      showBack
      subtitle={CALL_COPY.subtitle}
      title={CALL_COPY.title}
    >
      {error ? <ErrorBanner message={error} /> : null}
      {loading ? <SosLoading label="Loading your people" /> : null}
      {!loading && contacts.length === 0 ? (
        <SosCard>
          <Text style={sosTextStyles.sectionTitle}>{CALL_COPY.emptyTitle}</Text>
          <Text style={sosTextStyles.body}>{CALL_COPY.emptyBody}</Text>
        </SosCard>
      ) : null}
      {!loading
        ? contacts.map((contact) => (
            <SosCard key={contact.id}>
              <Text style={sosTextStyles.sectionTitle}>{contact.name}</Text>
              <Text style={sosTextStyles.body}>
                {getRelationshipLabel(contact.relationship)}
              </Text>
              <Text style={sosTextStyles.body}>{contact.phone}</Text>
              <View style={styles.actions}>
                <Pressable
                  accessibilityLabel={`Call ${contact.name}`}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: busyHref !== null }}
                  disabled={busyHref !== null}
                  onPress={() =>
                    void openHref(
                      phoneHrefForCall(contact.phone),
                      "Phone calls are not available on this device. Please call someone safe from another phone.",
                    )
                  }
                  style={({ pressed }) => [
                    styles.action,
                    busyHref !== null && styles.disabled,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.actionText}>{CALL_COPY.call}</Text>
                </Pressable>
                <Pressable
                  accessibilityLabel={`Text ${contact.name}`}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: busyHref !== null }}
                  disabled={busyHref !== null}
                  onPress={() =>
                    void openHref(
                      phoneHrefForSms(contact.phone),
                      "Text messages are not available on this device.",
                    )
                  }
                  style={({ pressed }) => [
                    styles.action,
                    busyHref !== null && styles.disabled,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.actionText}>{CALL_COPY.text}</Text>
                </Pressable>
              </View>
            </SosCard>
          ))
        : null}
      {!loading ? (
        <SosButton
          label={
            contacts.length === 0 ? CALL_COPY.addContact : CALL_COPY.addAnother
          }
          onPress={() => setAddVisible(true)}
        />
      ) : null}
      <YourPeopleSection
        contacts={contacts}
        loading={false}
        loadError={null}
        modalVisible={addVisible}
        onCreate={onCreate}
        onModalVisibleChange={setAddVisible}
        onRemove={async () => undefined}
        onRetry={() => undefined}
        status={null}
        variant="form"
      />
    </SosScreen>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", gap: 10 },
  action: {
    alignItems: "center",
    backgroundColor: colors.ember,
    borderRadius: 12,
    flex: 1,
    justifyContent: "center",
    minHeight: 50,
    paddingHorizontal: 18,
  },
  actionText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.72 },
});
