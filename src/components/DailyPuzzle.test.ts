import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DailyPuzzle } from "./DailyPuzzle";

function render(completed = false, disabled = false) {
  const onComplete = vi.fn();
  const html = renderToStaticMarkup(
    createElement(DailyPuzzle, {
      dayKey: "2026-10-15",
      completed,
      disabled,
      onComplete,
    }),
  );
  return { html, onComplete };
}

describe("interface du circuit gratuit", () => {
  it("présente 16 boutons nommés, les deux ports et une aide clavier", () => {
    const { html, onComplete } = render();
    expect(html.match(/aria-label="Ligne \d, colonne \d/g)).toHaveLength(16);
    expect(html).toContain("Entrée");
    expect(html).toContain("Sortie");
    expect(html).toContain("Entrée ou Espace pour tourner");
    expect(html).toContain("Aucun coût");
    expect(html).toContain('aria-live="polite"');
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("attend un circuit valide puis une réclamation explicite", () => {
    const { html, onComplete } = render();
    expect(html).toContain('class="daily-puzzle-claim" disabled=""');
    expect(html).toContain("Réclamer 150 pièces");
    expect(html).toContain("Afficher un indice");
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("affiche une récompense déjà obtenue sans interdire de continuer à jouer", () => {
    const { html, onComplete } = render(true);
    expect(html).toContain("150 pièces reçues");
    expect(html).toContain("Vous pouvez continuer à jouer");
    expect(html.match(/disabled=""/g)).toHaveLength(1);
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("verrouille toutes les commandes pendant une action du jeu", () => {
    const { html } = render(false, true);
    expect(html.match(/disabled=""/g)).toHaveLength(18);
  });
});
