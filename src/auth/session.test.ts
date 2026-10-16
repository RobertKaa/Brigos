import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sdk = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock("@supabase/supabase-js", () => ({ createClient: sdk.createClient }));
type Callback = (
  event: string,
  session: { user: { id: string } } | null,
) => void;

beforeEach(() => {
  vi.resetModules();
  sdk.createClient.mockReset();
  vi.stubEnv("VITE_SUPABASE_URL", "https://project.supabase.co");
  vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
});
afterEach(() => vi.unstubAllEnvs());

function setupSession(initialUser: string | null = null) {
  let onChange: Callback = () => undefined;
  const client = {
    auth: {
      onAuthStateChange: vi.fn((callback: Callback) => {
        onChange = callback;
      }),
      getSession: vi.fn(async () => ({
        data: { session: initialUser ? { user: { id: initialUser } } : null },
        error: null,
      })),
    },
  };
  sdk.createClient.mockReturnValue(client);
  return {
    client,
    change: (event: string, user: string | null) =>
      onChange(event, user ? { user: { id: user } } : null),
  };
}

describe("session Auth partagée", () => {
  it("ne crée aucun client si la configuration est absente", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "");
    const auth = await import("./client");
    expect(auth.getSupabaseClient()).toBeNull();
    expect(auth.getAuthSnapshot()).toMatchObject({ ready: true, user: null });
    expect(sdk.createClient).not.toHaveBeenCalled();
  });
  it("utilise un seul client PKCE et charge la session existante", async () => {
    const { client } = setupSession("existing");
    const auth = await import("./client");
    expect(auth.getSupabaseClient()).toBe(client);
    expect(auth.getSupabaseClient()).toBe(client);
    await Promise.resolve();
    expect(sdk.createClient).toHaveBeenCalledTimes(1);
    expect(sdk.createClient.mock.calls[0][2]).toMatchObject({
      auth: {
        flowType: "pkce",
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    expect(auth.getAuthSnapshot()).toMatchObject({
      ready: true,
      user: { id: "existing" },
    });
  });
  it("capte la récupération avant le montage React, sans callback asynchrone ni écrasement par une ancienne lecture", async () => {
    const { client, change } = setupSession("old");
    const auth = await import("./client");
    const notify = vi.fn();
    const unsubscribe = auth.subscribeAuthSnapshot(notify);
    auth.getSupabaseClient();
    expect(change("PASSWORD_RECOVERY", "recovery-user")).toBeUndefined();
    await Promise.resolve();
    expect(auth.getAuthSnapshot()).toMatchObject({
      user: { id: "recovery-user" },
      recovery: true,
    });
    change("TOKEN_REFRESHED", "recovery-user");
    expect(auth.getAuthSnapshot().recovery).toBe(true);
    auth.finishPasswordRecovery();
    expect(auth.getAuthSnapshot()).toMatchObject({
      user: { id: "recovery-user" },
      recovery: false,
    });
    change("SIGNED_OUT", null);
    expect(auth.getAuthSnapshot()).toMatchObject({
      ready: true,
      user: null,
      recovery: false,
    });
    expect(client.auth.getSession).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledTimes(4);
    unsubscribe();
    change("SIGNED_IN", "other");
    expect(notify).toHaveBeenCalledTimes(4);
  });
  it("ne transporte pas le mode récupération vers un autre compte", async () => {
    const { change } = setupSession();
    const auth = await import("./client");
    auth.getSupabaseClient();
    change("PASSWORD_RECOVERY", "account-a");
    expect(auth.getAuthSnapshot().recovery).toBe(true);
    change("SIGNED_IN", "account-b");
    expect(auth.getAuthSnapshot()).toMatchObject({
      user: { id: "account-b" },
      recovery: false,
    });
  });
  it("rend un échec initial sans exposer l’erreur réseau brute", async () => {
    const { client } = setupSession();
    client.auth.getSession.mockRejectedValueOnce(
      new Error("internal-sensitive-url"),
    );
    const auth = await import("./client");
    auth.getSupabaseClient();
    await Promise.resolve();
    expect(auth.getAuthSnapshot()).toMatchObject({ ready: true, user: null });
    expect(auth.getAuthSnapshot().error).toContain("Internet");
    expect(auth.getAuthSnapshot().error).not.toContain(
      "internal-sensitive-url",
    );
  });
});
