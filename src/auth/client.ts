import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { authErrorMessage } from "./actions";

export type PublicAuthConfiguration = { url: string; key: string };

/** Only public project credentials belong in the browser bundle. */
export function readAuthConfiguration(
  environment: Record<string, unknown>,
): PublicAuthConfiguration | null {
  const url = String(environment.VITE_SUPABASE_URL ?? "").trim();
  const key = String(
    environment.VITE_SUPABASE_PUBLISHABLE_KEY ??
      environment.VITE_SUPABASE_ANON_KEY ??
      "",
  ).trim();
  if (!url || !key || key.startsWith("sb_secret_")) return null;
  try {
    const parsed = new URL(url);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname);
    if (parsed.protocol !== "https:" && !(local && parsed.protocol === "http:"))
      return null;
    if (parsed.username || parsed.password || parsed.search || parsed.hash)
      return null;
    if (!key.startsWith("sb_publishable_")) {
      const payload = JSON.parse(
        atob(key.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
      ) as { role?: unknown };
      if (payload.role !== "anon") return null;
    }
    return { url: parsed.href.replace(/\/$/, ""), key };
  } catch {
    return null;
  }
}

/** The callback keeps the app's hash destination; PKCE returns its code in the query. */
export function authRedirectUrl(configuredUrl?: string, currentUrl?: string) {
  const fallback = new URL(currentUrl ?? window.location.href);
  let redirect = new URL(`${fallback.origin}${fallback.pathname}`);
  if (configuredUrl) {
    try {
      const candidate = new URL(configuredUrl);
      const local = ["localhost", "127.0.0.1", "[::1]"].includes(
        candidate.hostname,
      );
      if (
        !candidate.username &&
        !candidate.password &&
        candidate.origin === fallback.origin &&
        (candidate.protocol === "https:" ||
          (local && candidate.protocol === "http:"))
      )
        redirect = candidate;
    } catch {
      // Invalid deployment configuration falls back to this app's origin.
    }
  }
  redirect.search = "";
  redirect.hash = "account";
  return redirect.href;
}

export type AuthSnapshot = {
  ready: boolean;
  user: User | null;
  recovery: boolean;
  error: string | null;
};

const configuration = readAuthConfiguration(import.meta.env);
let client: SupabaseClient | null = null;
let snapshot: AuthSnapshot = {
  ready: !configuration,
  user: null,
  recovery: false,
  error: null,
};
const listeners = new Set<() => void>();

function publish(next: AuthSnapshot) {
  snapshot = next;
  for (const listener of listeners) listener();
}

export function getSupabaseClient(): SupabaseClient | null {
  if (!configuration) return null;
  if (!client) {
    client = createClient(configuration.url, configuration.key, {
      auth: {
        flowType: "pkce",
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    const authClient = client.auth;
    let events = 0;
    let meaningfulEvents = 0;
    // Register immediately: recovery can happen before React mounts. Never await
    // another Auth call in this callback (the SDK holds its session lock).
    authClient.onAuthStateChange((event, session) => {
      events += 1;
      if (event === "INITIAL_SESSION" && meaningfulEvents > 0) return;
      if (event !== "INITIAL_SESSION") meaningfulEvents += 1;
      publish({
        ready: true,
        user: session?.user ?? null,
        recovery:
          event === "PASSWORD_RECOVERY" ||
          (event !== "SIGNED_OUT" &&
            !!session &&
            session.user.id === snapshot.user?.id &&
            snapshot.recovery),
        // The SDK emits INITIAL_SESSION(null) even when callback initialization
        // failed. Keep that actionable error until the next real Auth action.
        error: event === "INITIAL_SESSION" && !session ? snapshot.error : null,
      });
    });
    const initialEvents = events;
    const initialMeaningfulEvents = meaningfulEvents;
    // createClient already starts initialization. Calling this public method
    // observes the same promise and its callback/PKCE errors, which getSession
    // alone does not report.
    void (async () => {
      let readingInitialSession = false;
      try {
        const { error: initializationError } = await authClient.initialize();
        if (initializationError) {
          if (meaningfulEvents === initialMeaningfulEvents)
            publish({
              ...snapshot,
              ready: true,
              error: authErrorMessage(initializationError),
            });
          return;
        }
        readingInitialSession = true;
        const { data, error } = await authClient.getSession();
        if (events !== initialEvents) return;
        publish({
          ...snapshot,
          ready: true,
          user: data.session?.user ?? null,
          error: error
            ? "La session n’a pas pu être vérifiée. Réessayez la connexion."
            : null,
        });
      } catch {
        if (
          readingInitialSession
            ? events === initialEvents
            : meaningfulEvents === initialMeaningfulEvents
        )
          publish({
            ...snapshot,
            ready: true,
            error:
              "La connexion est indisponible. Vérifiez votre accès Internet.",
          });
      }
    })();
  }
  return client;
}

export const getAuthSnapshot = () => snapshot;
export function subscribeAuthSnapshot(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function finishPasswordRecovery() {
  publish({ ...snapshot, recovery: false });
}
export function clearAuthError() {
  if (snapshot.error) publish({ ...snapshot, error: null });
}

export const authConfigured = !!configuration;
