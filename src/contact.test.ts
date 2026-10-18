import { describe, expect, it, vi } from "vitest";
import {
  parseContactMessage,
  readContactConfiguration,
  sendContactMessage,
} from "./contact";
const valid = {
  name: "Pseudo",
  email: "person@example.com",
  topic: "legal",
  message: "Une question à propos des mentions légales.",
};
describe("validation du contact", () => {
  it("limite les champs transmis et refuse les injections d’en-têtes et les textes trop longs", () => {
    expect(
      parseContactMessage({ ...valid, to: "attacker@example.com" }),
    ).toEqual(valid);
    for (const data of [
      { ...valid, email: "person@example.com\r\nBcc:x@example.com" },
      { ...valid, name: "a\nb" },
      { ...valid, message: "court" },
      { ...valid, message: "x".repeat(5001) },
      { ...valid, topic: "__proto__" },
      null,
    ]) {
      expect(() => parseContactMessage(data)).toThrow();
    }
  });
  it("désactive l’envoi sans clé publique et refuse les URL non sûres", () => {
    const env = {
      VITE_SUPABASE_URL: "https://example.supabase.co",
      VITE_CONTACT_TURNSTILE_SITE_KEY: "public-site-key-for-tests",
    };
    expect(readContactConfiguration(env)?.endpoint).toBe(
      "https://example.supabase.co/functions/v1/contact",
    );
    expect(
      readContactConfiguration({ ...env, VITE_CONTACT_TURNSTILE_SITE_KEY: "" }),
    ).toBeNull();
    for (const url of [
      "http://example.com",
      "https://secret@example.com",
      "https://example.com/?secret=1",
      "https://example.com/other",
    ])
      expect(
        readContactConfiguration({ ...env, VITE_SUPABASE_URL: url }),
      ).toBeNull();
  });
  it("ne confirme jamais un échec ni une réponse sans confirmation explicite", async () => {
    const config = {
      endpoint: "https://example.supabase.co/functions/v1/contact",
      siteKey: "public-site-key-for-tests",
    };
    for (const response of [
      new Response("{}", { status: 502 }),
      new Response("{}"),
      new Response("invalid"),
    ]) {
      const fetcher = vi.fn(async () => response);
      await expect(
        sendContactMessage(
          config,
          parseContactMessage(valid),
          "token",
          "id",
          fetcher,
        ),
      ).rejects.toThrow();
    }
    const fetcher = vi.fn<typeof fetch>(async () =>
      Response.json({ ok: true }),
    );
    await expect(
      sendContactMessage(
        config,
        parseContactMessage(valid),
        "token",
        "same-id",
        fetcher,
      ),
    ).resolves.toBeUndefined();
    expect(JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body))).toMatchObject({
      requestId: "same-id",
    });
  });
});
