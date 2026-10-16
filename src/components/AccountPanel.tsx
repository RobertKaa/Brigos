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

type AccountMode = "login" | "signup" | "reset";
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
  useEffect(() => {
    setName(displayName);
    setPassword("");
    setConfirmation("");
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
    setFeedback(null);
    auth.clearError();
  }
  async function perform(operation: () => Promise<AuthResult>) {
    setFeedback(null);
    const result = await operation();
    setFeedback(result);
    if (result.ok) {
      setPassword("");
      setConfirmation("");
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
    if (mode === "signup")
      return perform(() => auth.signUp(email, password, name));
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
          maxLength={mode === "signup" || recovery ? 128 : 1024}
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
        maxLength={128}
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
    <div className="account-content">
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
                : "Retrouvez votre partie partout"}
          </h3>
          <p>
            {auth.user
              ? "Votre compte possède sa propre progression en ligne. Les actions de jeu nécessitent Internet."
              : "Un compte ouvre une nouvelle partie en ligne, accessible sur ordinateur et téléphone."}
          </p>
        </div>
      </div>
      <div className="account-separation">
        <UserRound size={17} aria-hidden="true" />
        <p>
          Votre partie invitée reste sur cet appareil. Elle n’est ni transférée
          ni fusionnée avec le compte.
        </p>
      </div>
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
              {!recovery && mode !== "reset" && (
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
              {!recovery && mode === "reset" && (
                <div className="account-reset-heading">
                  <h3>Mot de passe oublié</h3>
                  <p>Recevez un lien pour choisir un nouveau mot de passe.</p>
                </div>
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
                {mode === "signup" && !recovery && nameInput}
                {(mode !== "reset" || recovery) && passwordInput}
                {(mode === "signup" || recovery) && confirmationInput}
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
                          : "Me connecter"}
                  {!auth.busy &&
                    (mode === "reset" ? (
                      <Mail size={18} aria-hidden="true" />
                    ) : (
                      <LogIn size={18} aria-hidden="true" />
                    ))}
                </button>
              </form>
              {!recovery && (
                <button
                  type="button"
                  className="account-link"
                  onClick={() =>
                    changeMode(mode === "reset" ? "login" : "reset")
                  }
                  disabled={auth.busy}
                >
                  {mode === "reset" && (
                    <ArrowLeft size={16} aria-hidden="true" />
                  )}
                  {mode === "reset"
                    ? "Revenir à la connexion"
                    : "Mot de passe oublié ?"}
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
      eyebrow="Votre espace Brigo"
      onClose={onClose}
      className="account-panel"
    >
      <AccountContent auth={auth} onClose={onClose} />
    </Modal>
  );
}
