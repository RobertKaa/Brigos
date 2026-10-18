import { describe, expect, it, vi } from "vitest";
import { createContactHandler } from "./contactService";
const origin = "https://brigoslab.com";
const message = {
  name: "Visiteur <test>",
  email: "visitor@example.com",
  topic: "legal",
  message: "Une question à propos de Brigos.",
  requestId: "19131824-c0d4-4a49-b37b-0a8c67fded43",
  turnstileToken: "verified-token",
};
const config = {
  allowedOrigins: [origin],
  recipient: "private@example.com",
  from: "Brigos <contact@example.com>",
  resendKey: "private-resend-key",
  turnstileSecret: "private-turnstile-secret",
};
function request(data: unknown = message, requestOrigin = origin) {
  return new Request("https://example.supabase.co/functions/v1/contact", {
    method: "POST",
    headers: { origin: requestOrigin, "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}
function provider() {
  return vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(
      Response.json({
        success: true,
        action: "contact",
        hostname: "brigoslab.com",
      }),
    )
    .mockResolvedValueOnce(Response.json({ id: "email-id" }));
}
describe("envoi sécurisé des messages de contact", () => {
  it("vérifie le jeton côté serveur avant d’envoyer à la destination fixe en texte brut", async () => {
    const fetcher = provider();
    const handler = createContactHandler({ ...config, fetcher });
    const response = await handler(
      request({
        ...message,
        to: "attacker@example.com",
        from: "attacker@example.com",
        html: "<script>",
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(fetcher.mock.calls[0][0]).toContain("siteverify");
    const [url, init] = fetcher.mock.calls[1];
    expect(url).toBe("https://api.resend.com/emails");
    const body = JSON.parse(String(init?.body));
    expect(body.to).toEqual([config.recipient]);
    expect(body.from).toBe(config.from);
    expect(body.reply_to).toBe(message.email);
    expect(body.text).toContain("Visiteur <test>");
    expect(body).not.toHaveProperty("html");
    expect(new Headers(init?.headers).get("Idempotency-Key")).toBe(
      `brigos-contact/${message.requestId}`,
    );
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
  it("refuse une origine étrangère, une configuration absente et les messages invalides sans appeler les prestataires", async () => {
    const fetcher = provider();
    const handler = createContactHandler({ ...config, fetcher });
    expect(
      (await handler(request(message, "https://attacker.example"))).status,
    ).toBe(403);
    expect(
      (
        await handler(
          request({ ...message, email: "x@example.com\r\nBcc:a@example.com" }),
        )
      ).status,
    ).toBe(400);
    expect(
      (await handler(request({ ...message, turnstileToken: "" }))).status,
    ).toBe(400);
    expect(
      (await handler(request({ ...message, requestId: "x" }))).status,
    ).toBe(400);
    expect(
      (await handler(request({ ...message, message: "é".repeat(33_000) })))
        .status,
    ).toBe(413);
    expect(
      (
        await createContactHandler({ ...config, recipient: "", fetcher })(
          request(),
        )
      ).status,
    ).toBe(503);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each([
    { success: false, action: "contact", hostname: "brigoslab.com" },
    { success: true, action: "login", hostname: "brigoslab.com" },
    { success: true, action: "contact", hostname: "attacker.example" },
  ])("rejette une preuve anti-spam invalide : %o", async (verification) => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json(verification));
    const response = await createContactHandler({ ...config, fetcher })(
      request(),
    );
    expect(response.status).toBe(400);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("ne transmet pas les erreurs du prestataire ni les secrets au navigateur", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json({
          success: true,
          action: "contact",
          hostname: "brigoslab.com",
        }),
      )
      .mockResolvedValueOnce(
        new Response("private-resend-key", { status: 500 }),
      );
    const response = await createContactHandler({ ...config, fetcher })(
      request(),
    );
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain("private");
  });
  it("accepte le précontrôle CORS sans envoi, refuse GET et neutralise le piège anti-bot", async () => {
    const fetcher = provider();
    const handler = createContactHandler({ ...config, fetcher });
    expect(
      (
        await handler(
          new Request("https://example.com", {
            method: "OPTIONS",
            headers: { origin },
          }),
        )
      ).status,
    ).toBe(204);
    expect(
      (
        await handler(
          new Request("https://example.com", { headers: { origin } }),
        )
      ).status,
    ).toBe(405);
    expect(
      (await handler(request({ ...message, website: "spam" }))).status,
    ).toBe(200);
    expect(fetcher).not.toHaveBeenCalled();
  });
});
