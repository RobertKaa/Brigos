import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import {
  authErrorMessage,
  createAuthActions,
  RESET_MESSAGE,
  SIGNUP_MESSAGE,
} from "./actions";

function mockClient(error: unknown = null) {
  const auth = {
    signUp: vi.fn(async () => ({ error })),
    signInWithPassword: vi.fn(async () => ({ error })),
    signInWithOAuth: vi.fn(async () => ({ error })),
    resetPasswordForEmail: vi.fn(async () => ({ error })),
    updateUser: vi.fn(async () => ({ error })),
    signOut: vi.fn(async () => ({ error })),
  };
  return { auth, client: { auth } as unknown as SupabaseClient };
}
const redirect = "https://brigo.example/#account";

describe("comptes : actions Auth", () => {
  it("normalise l’email et ne transmet que le profil facultatif à Auth", async () => {
    const { auth, client } = mockClient();
    const result = await createAuthActions(client, redirect).signUp(
      "  joueur@example.test  ",
      "une phrase unique Brigo",
      "  Noé  ",
    );
    expect(result).toEqual({ ok: true, message: SIGNUP_MESSAGE });
    expect(auth.signUp).toHaveBeenCalledWith({
      email: "joueur@example.test",
      password: "une phrase unique Brigo",
      options: { emailRedirectTo: redirect, data: { display_name: "Noé" } },
    });
  });
  it("refuse les entrées invalides avant toute requête", async () => {
    const { auth, client } = mockClient();
    const actions = createAuthActions(client, redirect);
    expect(
      (await actions.signUp("invalide", "une phrase suffisamment longue")).ok,
    ).toBe(false);
    expect((await actions.signUp("a@example.test", "court")).ok).toBe(false);
    expect((await actions.signUp("a@example.test", "x".repeat(129))).ok).toBe(
      false,
    );
    expect(
      (
        await actions.signUp(
          "a@example.test",
          "une phrase suffisamment longue",
          "x\nadmin",
        )
      ).ok,
    ).toBe(false);
    expect((await actions.updateDisplayName("x".repeat(33))).ok).toBe(false);
    expect(auth.signUp).not.toHaveBeenCalled();
    expect(auth.updateUser).not.toHaveBeenCalled();
  });
  it("autorise le mot de passe existant à la connexion sans lui imposer la politique d’inscription", async () => {
    const { auth, client } = mockClient();
    expect(
      (
        await createAuthActions(client, redirect).signIn(
          "a@example.test",
          "ancien",
        )
      ).ok,
    ).toBe(true);
    expect(auth.signInWithPassword).toHaveBeenCalledWith({
      email: "a@example.test",
      password: "ancien",
    });
  });
  it("n’indique pas si une adresse existe lors de la création ou récupération", async () => {
    for (const error of [
      null,
      { code: "user_already_exists" },
      { code: "email_exists" },
    ]) {
      const { client } = mockClient(error);
      expect(
        await createAuthActions(client, redirect).signUp(
          "a@example.test",
          "mot de passe très long",
        ),
      ).toEqual({ ok: true, message: SIGNUP_MESSAGE });
    }
    for (const error of [null, { code: "user_not_found" }]) {
      const { client, auth } = mockClient(error);
      expect(
        await createAuthActions(client, redirect).sendPasswordReset(
          " a@example.test ",
        ),
      ).toEqual({ ok: true, message: RESET_MESSAGE });
      expect(auth.resetPasswordForEmail).toHaveBeenCalledWith(
        "a@example.test",
        { redirectTo: redirect },
      );
    }
  });
  it("redirige Google et déconnecte seulement l’appareil courant", async () => {
    const { client, auth } = mockClient();
    const actions = createAuthActions(client, redirect);
    await actions.signInWithGoogle();
    expect(auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: redirect,
        queryParams: { prompt: "select_account" },
      },
    });
    await actions.signOut();
    expect(auth.signOut).toHaveBeenCalledWith({ scope: "local" });
  });
  it("la récupération envoie le nouveau mot de passe uniquement à Auth", async () => {
    const { client, auth } = mockClient();
    const actions = createAuthActions(client, redirect);
    expect((await actions.updatePassword("court")).ok).toBe(false);
    expect(auth.updateUser).not.toHaveBeenCalled();
    expect((await actions.updatePassword("une autre phrase Brigo")).ok).toBe(
      true,
    );
    expect(auth.updateUser).toHaveBeenCalledWith({
      password: "une autre phrase Brigo",
    });
  });
  it("ne simule jamais une connexion sans configuration", async () => {
    const actions = createAuthActions(null, redirect);
    expect((await actions.signIn("a@example.test", "un mot de passe")).ok).toBe(
      false,
    );
    expect((await actions.signOut()).ok).toBe(false);
  });
  it("traduit les erreurs sans exposer les détails du fournisseur", async () => {
    const secret = "secret-token-https://internal.example";
    expect(authErrorMessage({ message: secret })).not.toContain(secret);
    expect(
      authErrorMessage({ code: "invalid_credentials", message: secret }),
    ).toBe(authErrorMessage({ code: "user_not_found" }));
    expect(authErrorMessage({ status: 429 })).toContain("Trop de tentatives");
    const { client, auth } = mockClient();
    auth.signInWithPassword.mockRejectedValueOnce(new TypeError(secret));
    const result = await createAuthActions(client, redirect).signIn(
      "a@example.test",
      "secret",
    );
    expect(result.ok).toBe(false);
    expect(result.message).toContain("Internet");
    expect(result.message).not.toContain(secret);
  });
});
