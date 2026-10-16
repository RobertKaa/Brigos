import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createAuthActions } from "./actions";
import type { AuthResult } from "./actions";
import {
  authConfigured,
  authRedirectUrl,
  clearAuthError,
  finishPasswordRecovery,
  getAuthSnapshot,
  getSupabaseClient,
  subscribeAuthSnapshot,
} from "./client";

export function useAuth() {
  const client = getSupabaseClient();
  const snapshot = useSyncExternalStore(
    subscribeAuthSnapshot,
    getAuthSnapshot,
    getAuthSnapshot,
  );
  const actions = useMemo(
    () =>
      createAuthActions(
        client,
        typeof window === "undefined"
          ? ""
          : authRedirectUrl(import.meta.env.VITE_AUTH_REDIRECT_URL),
      ),
    [client],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lock = useRef(false);
  async function run(
    action: () => Promise<AuthResult>,
    finishRecovery = false,
  ) {
    if (lock.current)
      return { ok: false, message: "Une opération est déjà en cours." };
    lock.current = true;
    setBusy(true);
    setError(null);
    clearAuthError();
    try {
      const result = await action();
      if (!result.ok) setError(result.message);
      if (result.ok && finishRecovery) finishPasswordRecovery();
      return result;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return {
    configured: authConfigured,
    ...snapshot,
    error: error ?? snapshot.error,
    busy,
    clearError: () => {
      setError(null);
      clearAuthError();
    },
    signUp: (email: string, password: string, displayName?: string) =>
      run(() => actions.signUp(email, password, displayName)),
    signIn: (email: string, password: string) =>
      run(() => actions.signIn(email, password)),
    signInWithGoogle: () => run(actions.signInWithGoogle),
    sendPasswordReset: (email: string) =>
      run(() => actions.sendPasswordReset(email)),
    updatePassword: (password: string) =>
      run(() => actions.updatePassword(password), true),
    updateDisplayName: (name: string) =>
      run(() => actions.updateDisplayName(name)),
    signOut: () => run(actions.signOut, true),
  };
}

export type Auth = ReturnType<typeof useAuth>;
