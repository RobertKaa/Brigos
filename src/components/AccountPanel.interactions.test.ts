// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Auth } from "../auth/useAuth";
import { SIGNUP_MESSAGE } from "../auth/actions";
import { AccountContent } from "./AccountPanel";

const roots: Root[] = [];
function auth(overrides: Partial<Auth> = {}): Auth {
  const success = () => vi.fn(async () => ({ ok: true, message: "Terminé" }));
  return {
    configured: true,
    googleEnabled: false,
    ready: true,
    user: null,
    recovery: false,
    busy: false,
    error: null,
    clearError: vi.fn(),
    signUp: success(),
    signIn: success(),
    signInWithGoogle: success(),
    sendPasswordReset: success(),
    sendConfirmationEmail: success(),
    updatePassword: success(),
    updateDisplayName: success(),
    signOut: success(),
    ...overrides,
  };
}
async function mount(value: Auth, initialMode: "login" | "signup" = "login") {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);
  await act(async () => {
    root.render(
      createElement(AccountContent, {
        auth: value,
        initialMode,
        onClose: vi.fn(),
      }),
    );
  });
  return container;
}
function input(container: HTMLElement, label: string) {
  const element = [...container.querySelectorAll("label")].find(
    (node) => node.textContent?.trim() === label,
  );
  const control = element ? document.getElementById(element.htmlFor) : null;
  expect(control).toBeInstanceOf(HTMLInputElement);
  return control as HTMLInputElement;
}
async function fill(container: HTMLElement, label: string, value: string) {
  const control = input(container, label);
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(control, value);
    control.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
async function click(container: HTMLElement, text: string) {
  const button = [...container.querySelectorAll("button")].find(
    (element) => element.textContent?.trim() === text,
  );
  expect(button).toBeDefined();
  await act(async () => {
    button!.click();
  });
}
async function submit(container: HTMLElement) {
  await act(async () => {
    container
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
}

beforeEach(() => {
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});
afterEach(async () => {
  for (const root of roots.splice(0)) await act(async () => root.unmount());
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe("formulaire de compte", () => {
  it("attend deux mots de passe identiques, puis guide vers la confirmation sans conserver le secret", async () => {
    const value = auth({
      signUp: vi.fn(async () => ({ ok: true, message: SIGNUP_MESSAGE })),
    });
    const container = await mount(value, "signup");
    await fill(container, "Adresse email", "a@example.test");
    await fill(container, "Mot de passe", "une phrase privée Brigo");
    await fill(container, "Confirmer le mot de passe", "une phrase différente");
    await submit(container);
    expect(value.signUp).not.toHaveBeenCalled();
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "identiques",
    );
    await fill(
      container,
      "Confirmer le mot de passe",
      "une phrase privée Brigo",
    );
    await submit(container);
    expect(value.signUp).toHaveBeenCalledWith(
      "a@example.test",
      "une phrase privée Brigo",
      "",
    );
    expect(container.textContent).toContain("Confirmer votre email");
    expect(container.querySelector('input[type="password"]')).toBeNull();
    expect(container.innerHTML).not.toContain("une phrase privée Brigo");
    expect(document.activeElement?.getAttribute("role")).toBe("status");
    await click(container, "J’ai confirmé mon email, me connecter");
    expect(input(container, "Adresse email").value).toBe("a@example.test");
    expect(input(container, "Mot de passe").value).toBe("");
    expect(input(container, "Mot de passe").type).toBe("password");
  });
  it("efface et masque le mot de passe après un échec de connexion", async () => {
    const value = auth({
      signIn: vi.fn(async () => ({
        ok: false,
        message: "Vérifiez vos identifiants et la confirmation de votre email.",
      })),
    });
    const container = await mount(value);
    await fill(container, "Adresse email", "a@example.test");
    await fill(container, "Mot de passe", "un secret uniquement saisi");
    await act(async () => {
      container
        .querySelector<HTMLButtonElement>(
          '[aria-label="Afficher le mot de passe"]',
        )!
        .click();
    });
    expect(input(container, "Mot de passe").type).toBe("text");
    await submit(container);
    expect(value.signIn).toHaveBeenCalledWith(
      "a@example.test",
      "un secret uniquement saisi",
    );
    expect(input(container, "Mot de passe").value).toBe("");
    expect(input(container, "Mot de passe").type).toBe("password");
    expect(container.innerHTML).not.toContain("un secret uniquement saisi");
    expect(document.activeElement?.getAttribute("role")).toBe("alert");
  });
  it("permet le renvoi de confirmation et la récupération sans demander un mot de passe", async () => {
    const value = auth();
    const container = await mount(value);
    await fill(container, "Adresse email", "a@example.test");
    await click(container, "Email de confirmation non reçu ?");
    expect(container.querySelector('input[type="password"]')).toBeNull();
    await submit(container);
    expect(value.sendConfirmationEmail).toHaveBeenCalledWith("a@example.test");
    await click(container, "J’ai confirmé mon email, me connecter");
    await click(container, "Mot de passe oublié ?");
    expect(container.querySelector('input[type="password"]')).toBeNull();
    await submit(container);
    expect(value.sendPasswordReset).toHaveBeenCalledWith("a@example.test");
    expect(value.signIn).not.toHaveBeenCalled();
  });
});
