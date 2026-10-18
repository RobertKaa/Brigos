// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Contact } from "./Contact";
import { sendContactMessage } from "../contact";
vi.mock("../components/ContactVerification", () => ({
  ContactVerification: ({ onToken }: { onToken: (token: string) => void }) =>
    createElement(
      "button",
      { type: "button", onClick: () => onToken("verified-token") },
      "Vérification de test",
    ),
}));
let root: Root;
let container: HTMLDivElement;
const config = {
  endpoint: "https://example.supabase.co/functions/v1/contact",
  siteKey: "public-site-key-for-tests",
};
beforeEach(() => {
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  document.body.replaceChildren();
  vi.restoreAllMocks();
});
async function mount(send: typeof sendContactMessage, configured = true) {
  await act(async () =>
    root.render(
      createElement(Contact, { send, config: configured ? config : null }),
    ),
  );
  for (const [name, value] of Object.entries({
    name: "Visiteur",
    email: "visitor@example.com",
    message: "Un message assez long pour être envoyé.",
  })) {
    const input = container.querySelector<HTMLInputElement>(`[name=${name}]`)!;
    input.value = value;
  }
}
async function verify() {
  await act(async () =>
    (
      container.querySelector(
        ".contact-card button[type=button]",
      ) as HTMLButtonElement
    ).click(),
  );
}
async function submit() {
  await act(async () => {
    container
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
}
describe("formulaire de contact", () => {
  it("bloque l’envoi sans configuration ou sans vérification anti-spam", async () => {
    const send = vi.fn<typeof sendContactMessage>().mockResolvedValue();
    await mount(send, false);
    expect(container.textContent).toContain("disponible prochainement");
    await submit();
    expect(send).not.toHaveBeenCalled();
    await mount(send);
    expect(
      container.querySelector<HTMLButtonElement>("button[type=submit]")
        ?.disabled,
    ).toBe(true);
    await submit();
    expect(send).not.toHaveBeenCalled();
  });
  it("conserve le texte et la clé d’envoi après un échec, puis confirme uniquement le succès", async () => {
    const send = vi
      .fn<typeof sendContactMessage>()
      .mockRejectedValueOnce(new Error("Envoi indisponible"))
      .mockResolvedValueOnce();
    await mount(send);
    await verify();
    await submit();
    expect(container.querySelector("[role=alert]")?.textContent).toBe(
      "Envoi indisponible",
    );
    expect(document.activeElement).toBe(
      container.querySelector("[role=alert]"),
    );
    expect(
      container.querySelector<HTMLTextAreaElement>("textarea")?.value,
    ).toContain("Un message assez long");
    const requestId = send.mock.calls[0][3];
    await verify();
    await submit();
    expect(send.mock.calls[1][3]).toBe(requestId);
    expect(container.textContent).toContain("Votre message a été envoyé.");
    expect(container.querySelector("form")).toBeNull();
  });
  it("verrouille les champs et empêche un double envoi pendant une requête", async () => {
    let resolve!: () => void;
    const send = vi.fn<typeof sendContactMessage>(
      () =>
        new Promise<void>((done) => {
          resolve = done;
        }),
    );
    await mount(send);
    await verify();
    await submit();
    await submit();
    expect(send).toHaveBeenCalledTimes(1);
    expect(
      container.querySelector<HTMLTextAreaElement>("textarea")?.disabled,
    ).toBe(true);
    await act(async () => resolve());
    expect(container.textContent).toContain("Votre message a été envoyé.");
  });
});
