// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Faq } from "./Faq";

let root: Root;
let container: HTMLDivElement;
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
});
async function mount() {
  await act(async () =>
    root.render(createElement(Faq, { returnHref: "#workshop?view=built" })),
  );
}
async function search(value: string) {
  const input = container.querySelector<HTMLInputElement>("input")!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
describe("page FAQ", () => {
  it("utilise des volets natifs sans masquer leur ouverture derrière un contrôle personnalisé", async () => {
    await mount();
    const detail = container.querySelector("details")!;
    expect(detail.open).toBe(false);
    await act(async () => container.querySelector("summary")!.click());
    expect(detail.open).toBe(true);
    expect(container.querySelector(".legal-return")?.getAttribute("href")).toBe(
      "#workshop?view=built",
    );
  });
  it("affiche et déplie les réponses recherchées, puis restaure la liste et le focus", async () => {
    await mount();
    const count = container.querySelectorAll("details").length;
    await search("72 heures");
    expect(container.querySelectorAll("details")).toHaveLength(1);
    expect(container.querySelector("details")?.open).toBe(true);
    expect(container.querySelector("[role=status]")?.textContent).toBe(
      "1 réponse trouvée.",
    );
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>(
          '[aria-label="Effacer la recherche"]',
        )!
        .click(),
    );
    expect(container.querySelectorAll("details")).toHaveLength(count);
    expect(container.querySelectorAll("details[open]")).toHaveLength(0);
    expect(document.activeElement).toBe(container.querySelector("input"));
  });
  it("présente un état vide utile et n’interprète jamais la recherche comme du HTML", async () => {
    await mount();
    await search('<img src=x onerror="alert(1)">');
    expect(container.querySelector("[role=status]")?.textContent).toBe(
      "Aucune réponse trouvée.",
    );
    expect(container.querySelector("img")).toBeNull();
    const reset =
      container.querySelector<HTMLButtonElement>(".faq-empty button")!;
    await act(async () => reset.click());
    expect(container.querySelectorAll("details").length).toBeGreaterThan(0);
    expect(document.activeElement).toBe(container.querySelector("input"));
  });
});
