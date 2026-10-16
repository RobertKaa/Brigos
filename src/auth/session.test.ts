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
      initialize: vi.fn<() => Promise<{ error: unknown }>>(async () => ({
        error: null,
      })),
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
async function flushInitialization() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}
function pendingInitialization() {
  let resolve!: (result: { error: unknown }) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<{ error: unknown }>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
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
    await flushInitialization();
    expect(client.auth.initialize).toHaveBeenCalledTimes(1);
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
    await flushInitialization();
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
    await flushInitialization();
    expect(auth.getAuthSnapshot()).toMatchObject({ ready: true, user: null });
    expect(auth.getAuthSnapshot().error).toContain("Internet");
    expect(auth.getAuthSnapshot().error).not.toContain(
      "internal-sensitive-url",
    );
  });
  it("annonce un lien expiré et ne charge pas une session nulle après l’échec d’initialisation", async () => {
    const { client, change } = setupSession();
    client.auth.initialize.mockResolvedValueOnce({
      error: {
        code: "flow_state_expired",
        message: "https://internal.example/token=secret",
      },
    });
    const auth = await import("./client");
    auth.getSupabaseClient();
    await flushInitialization();
    expect(auth.getAuthSnapshot()).toMatchObject({
      ready: true,
      user: null,
      error:
        "Ce lien a expiré ou a déjà été utilisé. Demandez un nouvel email.",
    });
    expect(client.auth.getSession).not.toHaveBeenCalled();
    change("INITIAL_SESSION", null);
    expect(auth.getAuthSnapshot().error).toContain("Ce lien a expiré");
    change("SIGNED_IN", "new-user");
    expect(auth.getAuthSnapshot()).toMatchObject({
      user: { id: "new-user" },
      error: null,
    });
  });
  it.each(["SIGNED_IN", "SIGNED_OUT", "PASSWORD_RECOVERY"])(
    "un échec d’initialisation tardif n’écrase pas %s",
    async (event) => {
      const { client, change } = setupSession();
      const initial = pendingInitialization();
      client.auth.initialize.mockReturnValueOnce(initial.promise);
      const auth = await import("./client");
      auth.getSupabaseClient();
      const user = event === "SIGNED_OUT" ? null : "current-user";
      change(event, user);
      initial.resolve({ error: { code: "flow_state_not_found" } });
      await flushInitialization();
      expect(auth.getAuthSnapshot()).toMatchObject({
        ready: true,
        user: user ? { id: user } : null,
        error: null,
        recovery: event === "PASSWORD_RECOVERY",
      });
      expect(client.auth.getSession).not.toHaveBeenCalled();
      change("INITIAL_SESSION", null);
      expect(auth.getAuthSnapshot()).toMatchObject({
        user: user ? { id: user } : null,
        error: null,
        recovery: event === "PASSWORD_RECOVERY",
      });
    },
  );
  it("la déconnexion efface aussi l’erreur d’un ancien lien", async () => {
    const { client, change } = setupSession();
    client.auth.initialize.mockResolvedValueOnce({
      error: { code: "otp_expired" },
    });
    const auth = await import("./client");
    auth.getSupabaseClient();
    await flushInitialization();
    expect(auth.getAuthSnapshot().error).toContain("expiré");
    change("SIGNED_OUT", null);
    expect(auth.getAuthSnapshot()).toMatchObject({
      ready: true,
      user: null,
      error: null,
    });
  });
  it("une promesse d’initialisation rejetée ne révèle aucun détail sensible", async () => {
    const { client, change } = setupSession();
    client.auth.initialize.mockRejectedValueOnce(
      new Error("https://internal.example/secret-token"),
    );
    const auth = await import("./client");
    auth.getSupabaseClient();
    await flushInitialization();
    expect(auth.getAuthSnapshot()).toMatchObject({ ready: true, user: null });
    expect(auth.getAuthSnapshot().error).toContain("Internet");
    expect(auth.getAuthSnapshot().error).not.toContain("secret-token");
    expect(client.auth.getSession).not.toHaveBeenCalled();
    change("INITIAL_SESSION", null);
    expect(auth.getAuthSnapshot().error).toContain("Internet");
  });
  it("explique un lien non vérifiable sans afficher l’erreur du fournisseur", async () => {
    const { client } = setupSession();
    client.auth.initialize.mockResolvedValueOnce({
      error: { code: "bad_code_verifier", message: "internal-secret-verifier" },
    });
    const auth = await import("./client");
    auth.getSupabaseClient();
    await flushInitialization();
    expect(auth.getAuthSnapshot().error).toContain(
      "Demandez un nouvel email depuis ce navigateur",
    );
    expect(auth.getAuthSnapshot().error).not.toContain(
      "internal-secret-verifier",
    );
    expect(client.auth.getSession).not.toHaveBeenCalled();
  });
  it("une erreur réseau tardive n’écrase pas une nouvelle connexion", async () => {
    const { client, change } = setupSession();
    const initial = pendingInitialization();
    client.auth.initialize.mockReturnValueOnce(initial.promise);
    const auth = await import("./client");
    auth.getSupabaseClient();
    change("SIGNED_IN", "current-user");
    initial.reject(new TypeError("secret-network-url"));
    await flushInitialization();
    expect(auth.getAuthSnapshot()).toMatchObject({
      user: { id: "current-user" },
      error: null,
    });
  });
});
