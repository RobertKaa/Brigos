import type { SupabaseClient } from "@supabase/supabase-js";

export type AuthResult = { ok: boolean; message: string };
export const SIGNUP_MESSAGE =
  "Si cette adresse peut être utilisée, un email de confirmation vous sera envoyé. Consultez aussi les courriers indésirables. Si vous avez déjà un compte, connectez-vous.";
export const RESET_MESSAGE =
  "Si un compte correspond à cette adresse, un email de récupération vous sera envoyé. Consultez aussi les courriers indésirables.";
export const PASSWORD_HINT = "Au moins 12 caractères, jusqu’à 128.";

export function validateEmail(email: string): string | null {
  const value = email.trim();
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    ? null
    : "Saisissez une adresse email valide.";
}
export function validatePassword(password: string): string | null {
  return password.length >= 12 && password.length <= 128
    ? null
    : `Choisissez un mot de passe de 12 à 128 caractères.`;
}
export function validateDisplayName(name: string): string | null {
  return name.trim().length <= 32 && !/[\u0000-\u001f\u007f]/.test(name)
    ? null
    : "Le pseudo doit contenir au plus 32 caractères, sans caractère de contrôle.";
}

/** Never render provider messages, addresses, URLs or raw HTTP errors. */
export function authErrorMessage(error: unknown): string {
  const detail =
    error && typeof error === "object"
      ? (error as { code?: unknown; status?: unknown; name?: unknown })
      : {};
  if (
    detail.status === 429 ||
    ["over_request_rate_limit", "over_email_send_rate_limit"].includes(
      String(detail.code),
    )
  )
    return "Trop de tentatives. Patientez quelques minutes avant de réessayer.";
  if (
    ["invalid_credentials", "email_not_confirmed", "user_not_found"].includes(
      String(detail.code),
    )
  )
    return "Connexion impossible. Vérifiez vos identifiants et la confirmation de votre email.";
  if (detail.code === "weak_password")
    return "Ce mot de passe est trop faible. Choisissez une phrase plus longue et unique.";
  if (
    ["same_password", "reauthentication_needed"].includes(String(detail.code))
  )
    return "Choisissez un autre mot de passe ou reconnectez-vous avant de réessayer.";
  if (
    ["otp_expired", "flow_state_expired", "flow_state_not_found"].includes(
      String(detail.code),
    )
  )
    return "Ce lien a expiré ou a déjà été utilisé. Demandez un nouvel email.";
  if (detail.name === "AuthRetryableFetchError" || detail.name === "TypeError")
    return "La connexion est indisponible. Vérifiez votre accès Internet puis réessayez.";
  return "L’opération n’a pas abouti. Réessayez dans quelques instants.";
}

export function createAuthActions(
  client: SupabaseClient | null,
  redirectTo: string,
) {
  const execute = async (
    operation: (available: SupabaseClient) => Promise<{ error: unknown }>,
    message: string,
    genericCodes: string[] = [],
  ): Promise<AuthResult> => {
    if (!client)
      return {
        ok: false,
        message:
          "Les comptes ne sont pas encore configurés. Vous pouvez continuer en invité.",
      };
    try {
      const { error } = await operation(client);
      if (
        error &&
        !genericCodes.includes(String((error as { code?: unknown }).code))
      )
        return { ok: false, message: authErrorMessage(error) };
      return { ok: true, message };
    } catch (error) {
      return { ok: false, message: authErrorMessage(error) };
    }
  };
  const invalid = (message: string): Promise<AuthResult> =>
    Promise.resolve({ ok: false, message });

  return {
    signUp(email: string, password: string, displayName = "") {
      const validation =
        validateEmail(email) ||
        validatePassword(password) ||
        validateDisplayName(displayName);
      if (validation) return invalid(validation);
      return execute(
        (available) =>
          available.auth.signUp({
            email: email.trim(),
            password,
            options: {
              emailRedirectTo: redirectTo,
              data: { display_name: displayName.trim() },
            },
          }),
        SIGNUP_MESSAGE,
        ["user_already_exists", "email_exists"],
      );
    },
    signIn(email: string, password: string) {
      const validation = validateEmail(email);
      if (validation) return invalid(validation);
      if (!password || password.length > 1024)
        return invalid("Saisissez votre mot de passe.");
      return execute(
        (available) =>
          available.auth.signInWithPassword({ email: email.trim(), password }),
        "Connexion réussie. Votre partie en ligne est chargée séparément de votre partie invitée.",
      );
    },
    signInWithGoogle() {
      return execute(
        (available) =>
          available.auth.signInWithOAuth({
            provider: "google",
            options: { redirectTo, queryParams: { prompt: "select_account" } },
          }),
        "Ouverture de Google…",
      );
    },
    sendPasswordReset(email: string) {
      const validation = validateEmail(email);
      if (validation) return invalid(validation);
      return execute(
        (available) =>
          available.auth.resetPasswordForEmail(email.trim(), { redirectTo }),
        RESET_MESSAGE,
        ["user_not_found"],
      );
    },
    updatePassword(password: string) {
      const validation = validatePassword(password);
      if (validation) return invalid(validation);
      return execute(
        (available) => available.auth.updateUser({ password }),
        "Votre mot de passe a été mis à jour.",
      );
    },
    updateDisplayName(displayName: string) {
      const validation = validateDisplayName(displayName);
      if (validation) return invalid(validation);
      return execute(
        (available) =>
          available.auth.updateUser({
            data: { display_name: displayName.trim() },
          }),
        "Votre pseudo a été enregistré.",
      );
    },
    signOut() {
      return execute(
        (available) => available.auth.signOut({ scope: "local" }),
        "Vous êtes déconnecté. Votre partie invitée est à nouveau disponible sur cet appareil.",
      );
    },
  };
}
