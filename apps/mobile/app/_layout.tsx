import type { Session } from "@supabase/supabase-js";
import { Slot, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";

import { explainError } from "../src/lib/errors";
import { getSession, onAuthChange } from "../src/lib/session";

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [session, setSession] = useState<Session | null | undefined>();

  useEffect(() => {
    let active = true;
    let subscription: ReturnType<typeof onAuthChange> | undefined;

    const showSignInError = (error: unknown) => {
      if (!active) {
        return;
      }

      setSession(null);
      router.replace({
        pathname: "/sign-in",
        params: { authError: explainError(error) },
      });
    };

    try {
      subscription = onAuthChange((nextSession) => {
        if (active) {
          setSession(nextSession);
        }
      });
    } catch (error) {
      showSignInError(error);
    }

    const initializeAuth = async () => {
      try {
        const currentSession = await getSession();

        if (active) {
          setSession(currentSession);
        }
      } catch (error) {
        showSignInError(error);
      }
    };

    void initializeAuth();

    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    if (session === undefined) {
      return;
    }

    const isInApp = segments[0] === "(app)";
    const isSigningIn = segments[0] === "sign-in";

    if (!session && !isSigningIn) {
      router.replace("/sign-in");
    } else if (session && !isInApp) {
      router.replace("/(app)/(tabs)/home");
    }
  }, [router, segments, session]);

  return <Slot />;
}
