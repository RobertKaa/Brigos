/** Development-only, in-memory Auth fixture. Never imports useAuth or its client. */
import { useState } from "react";
import { createRoot } from "react-dom/client";
import type { User } from "@supabase/supabase-js";
import type { Auth } from "../src/auth/useAuth";
import type { AuthResult } from "../src/auth/actions";
import { RESET_MESSAGE, SIGNUP_MESSAGE } from "../src/auth/actions";
import { AccountContent } from "../src/components/AccountPanel";
import { Modal } from "../src/components/Modal";
import "@fontsource-variable/dm-sans";
import "@fontsource-variable/outfit";
import "../src/styles.css";
import "../src/accessibility.css";
import "../src/studio-theme.css";

if (!import.meta.env.DEV) throw new Error("Essai réservé au développement.");
const player: User = {
  id: "00000000-0000-4000-a000-000000000001",
  email: "joueur@example.test",
  user_metadata: { display_name: "Noé" },
  app_metadata: {},
  aud: "authenticated",
  created_at: "2026-10-16T00:00:00Z",
};
const scenarios = [
  "login",
  "signup",
  "reset",
  "connected",
  "recovery",
  "unconfigured",
  "error",
  "busy",
] as const;
type Scenario = (typeof scenarios)[number];
const labels: Record<Scenario, string> = {
  login: "Connexion",
  signup: "Inscription",
  reset: "Email de récupération",
  connected: "Compte connecté",
  recovery: "Nouveau mot de passe",
  unconfigured: "Non configuré",
  error: "Erreur réseau",
  busy: "En cours",
};
const requested = new URLSearchParams(location.search).get("state");

function ReviewAccount() {
  const [scenario, setScenario] = useState<Scenario>(
    scenarios.includes(requested as Scenario)
      ? (requested as Scenario)
      : "login",
  );
  const [user, setUser] = useState<User | null>(null);
  const [closed, setClosed] = useState(false);
  const [recovered, setRecovered] = useState(false);
  const result = (message: string): Promise<AuthResult> =>
    Promise.resolve({ ok: true, message });
  const auth: Auth = {
    configured: scenario !== "unconfigured",
    ready: true,
    user:
      user ?? (["connected", "recovery"].includes(scenario) ? player : null),
    recovery: scenario === "recovery" && !recovered,
    error:
      scenario === "error"
        ? "La connexion est indisponible. Vérifiez votre accès Internet puis réessayez."
        : null,
    busy: scenario === "busy",
    clearError: () => undefined,
    signUp: async () => result(SIGNUP_MESSAGE),
    signIn: async () => {
      setUser(player);
      return result(
        "Connexion simulée. Aucune session réelle n’a été ouverte.",
      );
    },
    signInWithGoogle: () =>
      result("Aperçu local : aucune connexion Google n’est ouverte."),
    sendPasswordReset: () => result(RESET_MESSAGE),
    updatePassword: async () => {
      setRecovered(true);
      return result(
        "Votre mot de passe a été mis à jour dans cet aperçu uniquement.",
      );
    },
    updateDisplayName: async (name) => {
      setUser({ ...player, user_metadata: { display_name: name } });
      return result("Pseudo enregistré dans cet aperçu uniquement.");
    },
    signOut: async () => {
      setUser(null);
      setScenario("login");
      return result("Déconnexion simulée.");
    },
  };
  return (
    <main style={{ padding: "24px", maxWidth: 800, margin: "auto" }}>
      <h1>Aperçu des comptes</h1>
      <p style={{ margin: "12px 0 24px" }}>
        Aucune session, aucun email, aucune lecture ou écriture de sauvegarde.
      </p>
      <label>
        Scénario
        <select
          value={scenario}
          onChange={(event) => {
            setScenario(event.target.value as Scenario);
            setUser(null);
            setRecovered(false);
            setClosed(false);
          }}
        >
          {scenarios.map((item) => (
            <option key={item} value={item}>
              {labels[item]}
            </option>
          ))}
        </select>
      </label>
      <button
        className="button button-secondary"
        style={{ margin: "20px 8px 20px 0" }}
        onClick={() => {
          document.documentElement.dataset.theme =
            document.documentElement.dataset.theme === "dark"
              ? "light"
              : "dark";
        }}
      >
        Changer de thème
      </button>
      <button
        className="button button-primary"
        onClick={() => setClosed(false)}
      >
        Ouvrir Mon compte
      </button>
      {!closed && (
        <Modal
          title="Mon compte"
          eyebrow="Votre espace Brigo"
          onClose={() => setClosed(true)}
          className="account-panel"
        >
          <AccountContent
            key={scenario}
            auth={auth}
            initialMode={
              scenario === "signup" || scenario === "reset" ? scenario : "login"
            }
            onClose={() => setClosed(true)}
          />
        </Modal>
      )}
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<ReviewAccount />);
