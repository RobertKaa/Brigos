import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { FormEvent } from "react";
import {
  ArrowLeft,
  Check,
  Cloud,
  Eye,
  EyeOff,
  LogIn,
  LogOut,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import type { Auth } from "../auth/useAuth";
import type { AuthResult } from "../auth/actions";
import { PASSWORD_HINT } from "../auth/actions";
import { Modal } from "./Modal";
import "./account-panel.css";

type AccountMode = "login" | "signup" | "reset" | "confirm";
type Props = { auth: Auth; onClose: () => void };
const onlineSnapshot = () =>
  typeof navigator === "undefined" || navigator.onLine;
const subscribeOnline = (notify: () => void) => {
  window.addEventListener("online", notify);
  window.addEventListener("offline", notify);
  return () => {
    window.removeEventListener("online", notify);
    window.removeEventListener("offline", notify);
  };
};

/** Exported separately so visual fixtures never need a real Auth client. */
export function AccountContent({
  auth,
  onClose,
  initialMode = "login",
}: Props & { initialMode?: AccountMode }) {
  const [mode, setMode] = useState<AccountMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [feedback, setFeedback] = useState<AuthResult | null>(null);
  const feedbackNode = useRef<HTMLParagraphElement>(null);
  const rawName: unknown = auth.user?.user_metadata?.display_name;
  const displayName = typeof rawName === "string" ? rawName : "";
  const [name, setName] = useState(displayName);
  const formId = useId();
  const online = useSyncExternalStore(
    subscribeOnline,
    onlineSnapshot,
    () => true,
  );
  const disabled = auth.busy || !online || !auth.ready;
  const recovery = auth.recovery && !!auth.user;
  const compactIntro = recovery || (!auth.user && mode !== "login");
  useEffect(() => {
    setName(displayName);
    setPassword("");
    setConfirmation("");
    setShowPassword(false);
    setFeedback(null);
  }, [auth.user?.id, displayName, recovery]);
  useEffect(() => {
    // A form can exceed the mobile viewport. Bring its result into view and
    // announce it instead of leaving an error above the current scroll position.
    if (feedback || auth.error) feedbackNode.current?.focus();
  }, [feedback, auth.error]);

  function changeMode(next: AccountMode) {
    setMode(next);
    setPassword("");
    setConfirmation("");
    setShowPassword(false);
    setFeedback(null);
    auth.clearError();
  }
  async function perform(operation: () => Promise<AuthResult>) {
    setFeedback(null);
    try {
      const result = await operation();
      setFeedback(result);
      return result;
    } finally {
      // Keep credentials only while editing or sending the form. Failed requests
      // must not leave a revealed password behind on a shared device either.
      setPassword("");
      setConfirmation("");
      setShowPassword(false);
    }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled) return;
    if ((mode === "signup" || recovery) && password !== confirmation) {
      setFeedback({
        ok: false,
        message: "Les deux mots de passe doivent être identiques.",
      });
      return;
    }
    if (recovery) return perform(() => auth.updatePassword(password));
    if (mode === "reset") return perform(() => auth.sendPasswordReset(email));
    if (mode === "confirm")
      return perform(() => auth.sendConfirmationEmail(email));
    if (mode === "signup") {
      const result = await perform(() => auth.signUp(email, password, name));
      if (result.ok) setMode("confirm");
      return;
    }
    return perform(() => auth.signIn(email, password));
  }
  const error = feedback?.ok === false ? feedback.message : auth.error;
  const passwordInput = (
    <div className="account-field">
      <label htmlFor={`${formId}-password`}>
        {recovery ? "Nouveau mot de passe" : "Mot de passe"}
      </label>
      <div className="account-password">
        <input
          id={`${formId}-password`}
          type={showPassword ? "text" : "password"}
          autoComplete={
            mode === "signup" || recovery ? "new-password" : "current-password"
          }
          minLength={mode === "signup" || recovery ? 12 : undefined}
          maxLength={mode === "signup" || recovery ? undefined : 1024}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          disabled={disabled}
          aria-describedby={
            mode === "signup" || recovery
              ? `${formId}-password-hint`
              : undefined
          }
        />
        <button
          type="button"
          className="account-password-toggle"
          aria-label={
            showPassword
              ? "Masquer le mot de passe"
              : "Afficher le mot de passe"
          }
          aria-pressed={showPassword}
          onClick={() => setShowPassword(!showPassword)}
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {(mode === "signup" || recovery) && (
        <small id={`${formId}-password-hint`}>{PASSWORD_HINT}</small>
      )}
    </div>
  );
  const confirmationInput = (
    <div className="account-field">
      <label htmlFor={`${formId}-confirmation`}>
        Confirmer le mot de passe
      </label>
      <input
        id={`${formId}-confirmation`}
        type={showPassword ? "text" : "password"}
        autoComplete="new-password"
        minLength={12}
        value={confirmation}
        onChange={(event) => setConfirmation(event.target.value)}
        required
        disabled={disabled}
      />
    </div>
  );
  const nameInput = (
    <div className="account-field">
      <label htmlFor={`${formId}-name`}>
        Pseudo <span>(facultatif)</span>
      </label>
      <input
        id={`${formId}-name`}
        autoComplete="nickname"
        maxLength={32}
        value={name}
        onChange={(event) => setName(event.target.value)}
        disabled={disabled}
      />
    </div>
  );

  return (
    <div
      className={`account-content${compactIntro ? " account-content-compact" : ""}`}
    >
      <div className="account-intro">
        <span className="account-emblem" aria-hidden="true">
          {auth.user ? <ShieldCheck size={26} /> : <Cloud size={26} />}
        </span>
        <div>
          <h3>
            {recovery
              ? "Choisir un nouveau mot de passe"
              : auth.user
                ? "Votre partie, avec vous"
                : mode === "signup"
                  ? "Créer votre compte"
                  : mode === "confirm"
                    ? "Confirmer votre email"
                    : mode === "reset"
                      ? "Retrouver votre compte"
                      : "Retrouvez votre partie partout"}
          </h3>
          <p>
            {recovery
              ? "Choisissez une phrase personnelle. Votre partie invitée reste sur cet appareil."
              : auth.user
                ? "Votre compte possède sa propre progression en ligne. Les actions de jeu nécessitent Internet."
                : mode === "signup"
                  ? "Une nouvelle partie en ligne. Votre partie invitée reste sur cet appareil, sans transfert ni fusion."
                  : mode === "confirm"
                    ? "Ouvrez le lien reçu par email dans ce même navigateur pour activer votre compte, puis connectez-vous. Votre partie invitée reste sur cet appareil."
                    : mode === "reset"
                      ? "Recevez un lien pour choisir un nouveau mot de passe. Votre partie invitée reste sur cet appareil."
                      : "Un compte ouvre une nouvelle partie en ligne, accessible sur ordinateur et téléphone."}
          </p>
        </div>
      </div>
      {!compactIntro && (
        <div className="account-separation">
          <UserRound size={17} aria-hidden="true" />
          <p>
            Votre partie invitée reste sur cet appareil. Elle n’est ni
            transférée ni fusionnée avec le compte.
          </p>
        </div>
      )}
      {!online && (
        <p className="account-feedback account-feedback-error" role="status">
          Vous êtes hors connexion. Retrouvez Internet pour utiliser votre
          compte.
        </p>
      )}
      {!auth.ready ? (
        <p className="account-feedback" role="status">
          Vérification de votre session…
        </p>
      ) : !auth.configured ? (
        <div className="account-unavailable">
          <p>
            Les comptes ne sont pas encore disponibles sur cette installation.
            Vous pouvez jouer en invité.
          </p>
          <button
            type="button"
            className="button button-primary"
            onClick={onClose}
          >
            Continuer en invité
          </button>
        </div>
      ) : (
        <>
          {error && (
            <p
              ref={feedbackNode}
              tabIndex={-1}
              className="account-feedback account-feedback-error"
              role="alert"
            >
              {error}
            </p>
          )}
          {feedback?.ok && (
            <p
              ref={feedbackNode}
              tabIndex={-1}
              className="account-feedback account-feedback-success"
              role="status"
            >
              <Check size={18} aria-hidden="true" />
              {feedback.message}
            </p>
          )}
          {auth.user && !recovery ? (
            <div className="account-connected">
              <div className="account-identity">
                <span className="eyebrow">Connecté avec</span>
                <strong>{auth.user.email ?? "Google"}</strong>
              </div>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!disabled)
                    void perform(() => auth.updateDisplayName(name));
                }}
              >
                {nameInput}
                <button
                  type="submit"
                  className="button button-secondary"
                  disabled={disabled || name.trim() === displayName}
                >
                  Enregistrer le pseudo
                </button>
              </form>
              <details className="account-details">
                <summary>Informations du compte</summary>
                <p>Identifiant du compte</p>
                <code>{auth.user.id}</code>
                <p>
                  Cet identifiant permet de retrouver votre compte auprès de
                  l’assistance. Le pseudo n’est pas un identifiant de connexion.
                </p>
              </details>
              <button
                type="button"
                className="button button-primary"
                onClick={onClose}
              >
                Reprendre ma partie en ligne
              </button>
              <button
                type="button"
                className="button button-secondary"
                disabled={disabled}
                onClick={() => void perform(auth.signOut)}
              >
                <LogOut size={18} aria-hidden="true" />
                Se déconnecter de cet appareil
              </button>
            </div>
          ) : (
            <>
              {!recovery && (mode === "login" || mode === "signup") && (
                <>
                  <div className="account-mode" aria-label="Accès au compte">
                    <button
                      type="button"
                      aria-pressed={mode === "login"}
                      onClick={() => changeMode("login")}
                      disabled={auth.busy}
                    >
                      Connexion
                    </button>
                    <button
                      type="button"
                      aria-pressed={mode === "signup"}
                      onClick={() => changeMode("signup")}
                      disabled={auth.busy}
                    >
                      Créer un compte
                    </button>
                  </div>
                  {auth.googleEnabled && (
                    <>
                      <button
                        type="button"
                        className="button button-secondary account-google"
                        disabled={disabled}
                        onClick={() => void perform(auth.signInWithGoogle)}
                      >
                        <LogIn size={18} aria-hidden="true" />
                        Continuer avec Google
                      </button>
                      <div className="account-divider">
                        <span>ou avec votre email</span>
                      </div>
                    </>
                  )}
                </>
              )}
              <form
                className="account-form"
                onSubmit={(event) => void submit(event)}
                aria-busy={auth.busy}
              >
                {!recovery && (
                  <div className="account-field">
                    <label htmlFor={`${formId}-email`}>Adresse email</label>
                    <input
                      id={`${formId}-email`}
                      type="email"
                      autoComplete="email"
                      inputMode="email"
                      autoCapitalize="none"
                      spellCheck={false}
                      maxLength={254}
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                      disabled={disabled}
                    />
                  </div>
                )}
                {((mode !== "reset" && mode !== "confirm") || recovery) &&
                  passwordInput}
                {(mode === "signup" || recovery) && confirmationInput}
                {mode === "signup" && !recovery && (
                  <p className="account-form-note">
                    Votre compte sera activé après confirmation de votre adresse
                    email.
                  </p>
                )}
                <button
                  type="submit"
                  className="button button-primary"
                  disabled={disabled}
                >
                  {auth.busy
                    ? "Un instant…"
                    : recovery
                      ? "Enregistrer le mot de passe"
                      : mode === "signup"
                        ? "Créer mon compte"
                        : mode === "reset"
                          ? "Envoyer le lien"
                          : mode === "confirm"
                            ? "Renvoyer l’email de confirmation"
                            : "Me connecter"}
                  {!auth.busy &&
                    (mode === "reset" || mode === "confirm" ? (
                      <Mail size={18} aria-hidden="true" />
                    ) : (
                      <LogIn size={18} aria-hidden="true" />
                    ))}
                </button>
              </form>
              {!recovery && mode !== "signup" && (
                <button
                  type="button"
                  className="account-link"
                  onClick={() =>
                    changeMode(
                      mode === "reset" || mode === "confirm"
                        ? "login"
                        : "reset",
                    )
                  }
                  disabled={auth.busy}
                >
                  {(mode === "reset" || mode === "confirm") && (
                    <ArrowLeft size={16} aria-hidden="true" />
                  )}
                  {mode === "reset"
                    ? "Revenir à la connexion"
                    : mode === "confirm"
                      ? "J’ai confirmé mon email, me connecter"
                      : "Mot de passe oublié ?"}
                </button>
              )}
              {!recovery && mode === "login" && (
                <button
                  type="button"
                  className="account-link"
                  onClick={() => changeMode("confirm")}
                  disabled={auth.busy}
                >
                  Email de confirmation non reçu ?
                </button>
              )}
              {!recovery && (
                <button
                  type="button"
                  className="account-guest"
                  onClick={onClose}
                >
                  Continuer en invité sur cet appareil
                </button>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

export function AccountPanel({ auth, onClose }: Props) {
  return (
    <Modal
      title="Mon compte"
      eyebrow="Votre espace Brigos"
      onClose={onClose}
      className="account-panel"
    >
      <AccountContent auth={auth} onClose={onClose} />
    </Modal>
  );
}
