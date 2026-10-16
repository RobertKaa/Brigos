import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import {
  authErrorMessage,
  CONFIRMATION_MESSAGE,
  createAuthActions,
  RESET_MESSAGE,
  SIGNUP_MESSAGE,
  validatePassword,
} from "./actions";

function mockClient(error: unknown = null) {
  const auth = {
    signUp: vi.fn(async () => ({ error })),
    signInWithPassword: vi.fn(async () => ({ error })),
    signInWithOAuth: vi.fn(async () => ({ error })),
    resetPasswordForEmail: vi.fn(async () => ({ error })),
    resend: vi.fn(async () => ({ error })),
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
    expect((await actions.signUp("a@example.test", "x".repeat(73))).ok).toBe(
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
  it.each([
    ["ASCII", "x", 72, 73],
    ["accents", "é", 36, 37],
    ["emojis", "🧱", 18, 19],
  ] as const)(
    "respecte la limite du fournisseur sans tronquer : %s",
    async (_kind, character, allowedCount, rejectedCount) => {
      const { auth, client } = mockClient();
      const actions = createAuthActions(client, redirect);
      const allowed = character.repeat(allowedCount);
      const rejected = character.repeat(rejectedCount);
      expect(validatePassword(allowed)).toBeNull();
      expect(validatePassword(rejected)).toContain("trop long");
      expect((await actions.signUp("a@example.test", allowed)).ok).toBe(true);
      expect(auth.signUp).toHaveBeenCalledWith(
        expect.objectContaining({ password: allowed }),
      );
      expect((await actions.updatePassword(allowed)).ok).toBe(true);
      expect(auth.updateUser).toHaveBeenCalledWith({ password: allowed });
      auth.signUp.mockClear();
      auth.updateUser.mockClear();
      expect((await actions.signUp("a@example.test", rejected)).ok).toBe(false);
      expect((await actions.updatePassword(rejected)).ok).toBe(false);
      expect(auth.signUp).not.toHaveBeenCalled();
      expect(auth.updateUser).not.toHaveBeenCalled();
    },
  );
  it("compte les caractères Unicode entiers pour le minimum", () => {
    expect(validatePassword("🧱".repeat(11))).toContain("au moins 12");
    expect(validatePassword("🧱".repeat(12))).toBeNull();
    expect(validatePassword("é".repeat(11))).toContain("au moins 12");
    expect(validatePassword("é".repeat(12))).toBeNull();
  });
  it("conserve exactement la phrase saisie sans enlever les espaces ni normaliser les accents", async () => {
    const { auth, client } = mockClient();
    const password = "  une phrase de\u0301compose\u0301e  ";
    const actions = createAuthActions(client, redirect);
    expect((await actions.signUp("a@example.test", password)).ok).toBe(true);
    expect(auth.signUp).toHaveBeenCalledWith(
      expect.objectContaining({ password }),
    );
    await actions.updatePassword(password);
    expect(auth.updateUser).toHaveBeenCalledWith({ password });
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
  it("renvoie uniquement un lien de confirmation signup, avec une réponse sans énumération de comptes", async () => {
    for (const error of [
      null,
      { code: "user_not_found" },
      { code: "email_already_confirmed" },
    ]) {
      const { auth, client } = mockClient(error);
      expect(
        await createAuthActions(client, redirect).sendConfirmationEmail(
          " a@example.test ",
        ),
      ).toEqual({
        ok: true,
        message: CONFIRMATION_MESSAGE,
      });
      expect(auth.resend).toHaveBeenCalledWith({
        type: "signup",
        email: "a@example.test",
        options: { emailRedirectTo: redirect },
      });
    }
    const { auth, client } = mockClient();
    expect(
      (
        await createAuthActions(client, redirect).sendConfirmationEmail(
          "invalid",
        )
      ).ok,
    ).toBe(false);
    expect(auth.resend).not.toHaveBeenCalled();
  });
  it.each(["signUp", "sendConfirmationEmail", "sendPasswordReset"] as const)(
    "signale un refus d’envoi sans annoncer de succès : %s",
    async (operation) => {
      for (const [code, message] of [
        [
          "over_email_send_rate_limit",
          "L’envoi des emails est temporairement limité. Réessayez plus tard. Répéter la demande maintenant ne débloquera pas l’envoi.",
        ],
        [
          "email_address_not_authorized",
          "L’envoi des emails n’est pas encore disponible pour cette adresse sur cet environnement de test.",
        ],
      ]) {
        const { client } = mockClient({
          code,
          status: 429,
          message: "secret-token https://internal.example a@example.test",
        });
        const actions = createAuthActions(client, redirect);
        const result =
          operation === "signUp"
            ? await actions.signUp("a@example.test", "une phrase unique Brigo")
            : await actions[operation]("a@example.test");
        expect(result).toEqual({ ok: false, message });
        expect(result.message).not.toContain(code);
        expect(result.message).not.toContain("secret-token");
        expect(result.message).not.toContain("https://");
        expect(result.message).not.toContain("a@example.test");
      }
    },
  );
  it.each([
    { code: "over_request_rate_limit" },
    { status: 429 },
    { code: "unknown_provider_error", status: 429 },
  ])("ne donne pas de délai inventé pour une limite générale : %j", (error) => {
    expect(authErrorMessage(error)).toBe(
      "Trop de tentatives. Réessayez plus tard.",
    );
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
  it.each([
    { code: "bad_code_verifier" },
    { name: "AuthPKCEGrantCodeExchangeError" },
  ])(
    "explique comment renouveler un lien ouvert dans un autre navigateur",
    (error) => {
      const message = authErrorMessage({
        ...error,
        message: "internal-secret-verifier",
      });
      expect(message).toContain(
        "Demandez un nouvel email depuis ce navigateur",
      );
      expect(message).toContain("ce même navigateur");
      expect(message).not.toContain("internal-secret-verifier");
    },
  );
});
