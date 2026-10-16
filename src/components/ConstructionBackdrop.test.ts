import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RECIPES } from "../game/catalog";
import {
  CONSTRUCTION_SETTINGS,
  ConstructionBackdrop,
  getConstructionSetting,
} from "./ConstructionBackdrop";

const framing = {
  minX: -180,
  minY: -240,
  width: 500,
  height: 350,
  viewBox: "-180 -240 500 350",
};
const render = (recipeId: string) =>
  renderToStaticMarkup(
    createElement(ConstructionBackdrop, { recipeId, framing }),
  );

describe("les environnements illustrés des constructions", () => {
  it("donne un contexte intentionnel à chaque recette, sans modifier le catalogue", () => {
    expect(Object.keys(CONSTRUCTION_SETTINGS).sort()).toEqual(
      RECIPES.map((recipe) => recipe.id).sort(),
    );
    expect(
      new Set(
        Object.values(CONSTRUCTION_SETTINGS).map((scene) => scene.vignette),
      ).size,
    ).toBe(RECIPES.length);
    expect(
      new Set(
        Object.values(CONSTRUCTION_SETTINGS).map((scene) => scene.setting),
      ).size,
    ).toBeGreaterThanOrEqual(20);
  });

  it.each([
    ["chalet", "alpine", "pine"],
    ["star-observatory", "alpine", "constellation"],
    ["boat", "canal", "buoy"],
    ["ocean-schooner", "ocean", "sails"],
    ["discovery-museum", "civic", "museum"],
    ["cargo-shuttle", "orbital", "cargo"],
    ["concert-grand-piano", "stage", "curtains"],
    ["tropical-conservatory", "botanical", "palms"],
    ["aurora-palace", "polar", "aurora"],
  ])("situe %s dans son propre univers", (id, setting, motif) => {
    expect(getConstructionSetting(id)).toMatchObject({ setting, motif });
    const markup = render(id);
    expect(markup).toContain(`data-scene-setting="${setting}"`);
    expect(markup).toContain(`data-scene-motif="${motif}"`);
  });

  it.each(RECIPES.map((recipe) => [recipe.id, recipe.theme] as const))(
    "%s reste léger, stable, compatible jour/nuit et sans ressource distante",
    (id, theme) => {
      const markup = render(id);
      expect(markup).toBe(render(id));
      expect(markup).toContain(`data-scene-decoration="${theme}"`);
      expect(markup).toContain('pointer-events="none"');
      expect(markup).toContain('aria-hidden="true"');
      expect(markup).toContain(
        'transform="translate(-180 -240) scale(0.5 0.5)"',
      );
      expect(markup).toContain("var(--scene-ink");
      expect(markup).toContain("var(--scene-ground");
      expect(markup).not.toMatch(
        /NaN|Infinity|<image|<filter|<mask|<animate|href=|url\(/,
      );
      // A large recipe has exactly the same small decoration budget as a tiny
      // one. Detail is batched into pen paths rather than hundreds of DOM nodes.
      expect((markup.match(/<\w/g) ?? []).length).toBeLessThanOrEqual(16);
    },
  );

  it("garde des scènes différentes au sein d’une même famille", () => {
    expect(render("chalet")).not.toBe(render("star-observatory"));
    expect(render("greenhouse")).not.toBe(render("tropical-conservatory"));
    expect(render("cafe")).not.toBe(render("arcade-bookshop"));
  });

  it("dessine les ombres et matières de chaque environnement sans réutiliser une trame générique", () => {
    const settings = new Map(
      Object.entries(CONSTRUCTION_SETTINGS).map(([id, scene]) => [
        scene.setting,
        id,
      ]),
    );
    const shadows = new Set<string>();
    const hatching = new Set<string>();
    for (const id of settings.values()) {
      const markup = render(id);
      const shadow = markup.match(
        /data-scene-pass="shadow-facets" d="([^"]+)"/,
      )?.[1];
      const hatch = markup.match(
        /data-scene-pass="material-hatching" d="([^"]+)"/,
      )?.[1];
      expect(shadow, id).toBeTruthy();
      expect(hatch, id).toBeTruthy();
      shadows.add(shadow!);
      hatching.add(hatch!);
      // Pen strokes are batched, local and finite even on the largest card.
      expect((hatch!.match(/[Mm]/g) ?? []).length).toBeLessThan(40);
      expect(markup.indexOf('data-scene-pass="shadow-facets"')).toBeLessThan(
        markup.indexOf('data-scene-pass="material-hatching"'),
      );
    }
    expect(shadows.size).toBe(settings.size);
    expect(hatching.size).toBe(settings.size);
  });

  it.each(["future-original-model", "__proto__", "constructor"])(
    "utilise un atelier neutre pour une recette inconnue : %s",
    (id) => {
      expect(getConstructionSetting(id)).toMatchObject({
        setting: "atelier",
        motif: "tools",
      });
      expect(render(id)).toContain('data-scene-decoration="objects"');
    },
  );
});
