import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { User } from "@supabase/supabase-js";
import type { Auth } from "../auth/useAuth";
import { AccountContent } from "./AccountPanel";

function auth(overrides: Partial<Auth> = {}): Auth {
  const success = vi.fn(async () => ({ ok: true, message: "Terminé" }));
  return {
    configured: true,
    ready: true,
    user: null,
    recovery: false,
    busy: false,
    error: null,
    clearError: vi.fn(),
    signUp: success,
    signIn: success,
    signInWithGoogle: success,
    sendPasswordReset: success,
    updatePassword: success,
    updateDisplayName: success,
    signOut: success,
    ...overrides,
  };
}
const player: User = {
  id: "account-1",
  email: "a@example.test",
  user_metadata: { display_name: "Noé" },
  app_metadata: {},
  aud: "authenticated",
  created_at: "2026-10-16T00:00:00Z",
};
function render(
  overrides: Partial<Auth> = {},
  initialMode?: "login" | "signup" | "reset",
) {
  return renderToStaticMarkup(
    createElement(AccountContent, {
      auth: auth(overrides),
      onClose: vi.fn(),
      initialMode,
    }),
  );
}
describe("Mon compte : parcours et accessibilité", () => {
  it("présente Google, email et partie invitée séparée", () => {
    const html = render();
    expect(html).toContain("Continuer avec Google");
    expect(html).toContain('type="email"');
    expect(html).toContain('autoComplete="current-password"');
    expect(html).toContain("ni transférée ni fusionnée");
    expect(html).toContain("Continuer en invité sur cet appareil");
    expect(html).toContain('aria-pressed="true"');
  });
  it("rend la politique et la confirmation de mot de passe à l’inscription", () => {
    const html = render({}, "signup");
    expect(html).toContain('minLength="12"');
    expect(html).toContain('maxLength="128"');
    expect(html).toContain("Confirmer le mot de passe");
    expect(html).toContain("Créer mon compte");
    expect(html).toContain("facultatif");
  });
  it("une configuration absente ne propose aucune fausse connexion", () => {
    const html = render({ configured: false });
    expect(html).toContain("Les comptes ne sont pas encore disponibles");
    expect(html).toContain("Continuer en invité");
    expect(html).not.toContain('type="email"');
    expect(html).not.toContain("Continuer avec Google");
  });
  it("la session attendue et une opération en cours sont annoncées", () => {
    expect(render({ ready: false })).toContain(
      'role="status">Vérification de votre session',
    );
    const html = render({ busy: true });
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('disabled=""');
    expect(html).toContain("Un instant…");
  });
  it("la récupération est prioritaire sur la session connectée et n’expose pas l’ancien mot de passe", () => {
    const html = render({ user: player, recovery: true });
    expect(html).toContain("Nouveau mot de passe");
    expect(html).toContain("Enregistrer le mot de passe");
    expect(html).not.toContain("Continuer avec Google");
    expect(html).not.toContain('type="email"');
    expect(html).not.toContain("Reprendre ma partie en ligne");
  });
  it("la récupération d’email ne demande pas de mot de passe", () => {
    const html = render({}, "reset");
    expect(html).toContain("Envoyer le lien");
    expect(html).not.toContain('type="password"');
    expect(html).toContain("Revenir à la connexion");
  });
  it("le compte connecté garde un identifiant stable, sans interpoler le profil en HTML", () => {
    const html = render({
      user: {
        ...player,
        user_metadata: { display_name: '<script>alert("x")</script>' },
      },
    });
    expect(html).toContain("account-1");
    expect(html).toContain("a@example.test");
    expect(html).toContain("Reprendre ma partie en ligne");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
  it("les erreurs sont annoncées aux lecteurs d’écran", () => {
    expect(render({ error: "Connexion indisponible" })).toContain(
      'role="alert">Connexion indisponible',
    );
  });
});
