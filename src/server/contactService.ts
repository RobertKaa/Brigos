import { CONTACT_TOPICS, parseContactMessage } from "../contact";

type Configuration = {
  allowedOrigins: string[];
  recipient: string;
  from: string;
  resendKey: string;
  turnstileSecret: string;
  fetcher?: typeof fetch;
};
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_BYTES = 32_768;
async function readBody(request: Request): Promise<unknown> {
  if (!request.body) throw new Error("invalid");
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let length = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_BYTES) {
        await reader.cancel();
        throw new Error("too-large");
      }
      text += decoder.decode(value, { stream: true });
    }
    return JSON.parse(text + decoder.decode());
  } finally {
    reader.releaseLock();
  }
}
export function createContactHandler(config: Configuration) {
  const fetcher = config.fetcher ?? fetch;
  return async (request: Request): Promise<Response> => {
    const origin = request.headers.get("origin") ?? "";
    const headers = new Headers({
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      Vary: "Origin",
      "X-Content-Type-Options": "nosniff",
    });
    const response = (status: number, code: string) =>
      new Response(
        JSON.stringify(status === 200 ? { ok: true } : { error: code }),
        { status, headers },
      );
    if (!config.allowedOrigins.includes(origin))
      return response(403, "origin-denied");
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "content-type");
    if (request.method === "OPTIONS")
      return new Response(null, { status: 204, headers });
    if (request.method !== "POST") {
      headers.set("Allow", "POST, OPTIONS");
      return response(405, "method-not-allowed");
    }
    if (
      !request.headers
        .get("content-type")
        ?.toLowerCase()
        .startsWith("application/json")
    )
      return response(415, "json-required");
    if (
      !config.recipient ||
      !config.from ||
      !config.resendKey ||
      !config.turnstileSecret
    )
      return response(503, "unavailable");
    let data;
    let input: Record<string, unknown>;
    try {
      input = (await readBody(request)) as Record<string, unknown>;
      data = parseContactMessage(input);
      if (typeof input.website === "string" && input.website.trim())
        return response(200, "ok");
      if (
        typeof input.requestId !== "string" ||
        !UUID.test(input.requestId) ||
        typeof input.turnstileToken !== "string" ||
        input.turnstileToken.length < 1 ||
        input.turnstileToken.length > 2048
      )
        throw new Error("invalid");
    } catch (error) {
      return response(
        error instanceof Error && error.message === "too-large" ? 413 : 400,
        "invalid-message",
      );
    }
    try {
      const verified = await fetcher(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            secret: config.turnstileSecret,
            response: input.turnstileToken,
          }),
          signal: AbortSignal.timeout(10_000),
        },
      );
      if (!verified.ok) return response(503, "verification-unavailable");
      const verification = await verified.json();
      if (
        verification.success !== true ||
        verification.action !== "contact" ||
        verification.hostname !== new URL(origin).hostname
      )
        return response(400, "verification-failed");
      // Fixed destination and sender: browser fields cannot turn this into an open relay.
      const sent = await fetcher("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.resendKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `brigos-contact/${input.requestId}`,
        },
        body: JSON.stringify({
          from: config.from,
          to: [config.recipient],
          reply_to: data.email,
          subject: `Brigos · ${CONTACT_TOPICS[data.topic]}`,
          text: `Pseudo : ${data.name}\nAdresse de réponse : ${data.email}\n\n${data.message}`,
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!sent.ok)
        return response(
          sent.status === 429 ? 429 : 502,
          "delivery-unavailable",
        );
      const result = await sent.json();
      return typeof result.id === "string" && result.id.length > 0
        ? response(200, "ok")
        : response(502, "delivery-unconfirmed");
    } catch {
      return response(503, "unavailable");
    }
  };
}
