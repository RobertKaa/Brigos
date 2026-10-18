export const CONTACT_TOPICS = {
  question: "Une question sur Brigos",
  problem: "Signaler un problème",
  legal: "Une demande concernant les mentions légales",
} as const;
export type ContactMessage = {
  name: string;
  email: string;
  topic: keyof typeof CONTACT_TOPICS;
  message: string;
};
export function parseContactMessage(value: unknown): ContactMessage {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("invalid");
  const data = value as Record<string, unknown>;
  const field = (
    name: string,
    min: number,
    max: number,
    singleLine = false,
  ) => {
    const value = typeof data[name] === "string" ? data[name].trim() : "";
    if (
      value.length < min ||
      value.length > max ||
      /\u0000/.test(value) ||
      (singleLine && /[\r\n]/.test(value))
    )
      throw new Error("invalid");
    return value;
  };
  const name = field("name", 1, 80, true);
  const email = field("email", 3, 254, true);
  if (!/^[^\s<>@,;:]+@[^\s<>@,;:]+\.[^\s<>@,;:]+$/.test(email))
    throw new Error("invalid");
  if (
    typeof data.topic !== "string" ||
    !Object.hasOwn(CONTACT_TOPICS, data.topic)
  )
    throw new Error("invalid");
  return {
    name,
    email,
    topic: data.topic as ContactMessage["topic"],
    message: field("message", 20, 5000),
  };
}
export type ContactConfiguration = { endpoint: string; siteKey: string };
export function readContactConfiguration(
  environment: Record<string, unknown>,
): ContactConfiguration | null {
  const siteKey = String(
    environment.VITE_CONTACT_TURNSTILE_SITE_KEY ?? "",
  ).trim();
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(siteKey)) return null;
  try {
    const url = new URL(String(environment.VITE_SUPABASE_URL ?? ""));
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== "/"
    )
      return null;
    return { endpoint: `${url.origin}/functions/v1/contact`, siteKey };
  } catch {
    return null;
  }
}
export async function sendContactMessage(
  configuration: ContactConfiguration,
  data: ContactMessage,
  token: string,
  requestId: string,
  fetcher: typeof fetch = fetch,
) {
  let response: Response;
  try {
    response = await fetcher(configuration.endpoint, {
      method: "POST",
      credentials: "omit",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, turnstileToken: token, requestId }),
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    throw new Error(
      "L’envoi n’a pas pu être confirmé. Votre message est conservé ; réessayez dans un instant.",
    );
  }
  if (!response.ok)
    throw new Error(
      response.status === 429
        ? "Trop de messages rapprochés. Patientez avant de réessayer."
        : "Le message n’a pas pu être envoyé. Votre texte est conservé ; réessayez dans un instant.",
    );
  const result = await response.json().catch(() => null);
  if (result?.ok !== true)
    throw new Error(
      "L’envoi n’a pas pu être confirmé. Votre message est conservé.",
    );
}
