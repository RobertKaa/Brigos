import fs from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RECIPES, RECIPE_BY_ID } from "../game/catalog";
import previews from "./construction-previews.json";
import { ConstructionArt, constructionPreviewFingerprint } from "./BrigoScene";
import type { ConstructionPreviewAsset } from "./BrigoScene";

const manifest = previews as Record<string, ConstructionPreviewAsset>;
const render = (props: Parameters<typeof ConstructionArt>[0]) =>
  renderToStaticMarkup(createElement(ConstructionArt, props));

describe("aperçus de constructions sans géométrie dans le DOM", () => {
  it("couvre chaque plan avec un WebP local transparent exporté et un digest à jour", () => {
    expect(Object.keys(manifest).sort()).toEqual(
      RECIPES.map((recipe) => recipe.id).sort(),
    );
    let bytes = 0;
    for (const recipe of RECIPES) {
      const asset = manifest[recipe.id];
      expect(asset.fingerprint, recipe.id).toBe(
        constructionPreviewFingerprint(recipe.id),
      );
      expect(asset.placements, recipe.id).toBe(recipe.placements.length);
      expect(asset.src).toMatch(
        /^\/constructions\/[a-z0-9-]+-[a-f0-9]{10}\.webp$/,
      );
      expect(asset.framing.width).toBeGreaterThan(0);
      expect(asset.framing.height).toBeGreaterThan(0);
      expect(asset.center).toHaveLength(2);
      expect(asset.center.every(Number.isFinite)).toBe(true);
      const file = fs.readFileSync(
        path.join(process.cwd(), "public", asset.src),
      );
      expect(file.toString("ascii", 0, 4)).toBe("RIFF");
      expect(file.toString("ascii", 8, 12)).toBe("WEBP");
      expect(file.includes(Buffer.from("ALPH")), recipe.id).toBe(true);
      bytes += file.length;
    }
    expect(bytes).toBeLessThan(5 * 1024 * 1024);
  });

  it.each([
    "high-citadel",
    "aurora-palace",
    "astreval-gardens",
    "four-seasons-theatre",
  ])("%s utilise une image préparée sans dessiner chaque pièce", (recipeId) => {
    const markup = render({ recipeId, quality: "preview" });
    expect(markup).toContain('data-renderer="precompiled"');
    expect(markup).toContain(`href="${manifest[recipeId].src}"`);
    expect(markup).toContain(
      `data-placements="${RECIPE_BY_ID.get(recipeId)!.placements.length}"`,
    );
    expect(markup).not.toContain("data-piece=");
    expect(markup.match(/<path /g)?.length ?? 0).toBeLessThan(25);
    expect(markup.length).toBeLessThan(25_000);
  });

  it("réutilise l’image préparée des plans à couleurs fixes dans la galerie personnelle", () => {
    const recipe = RECIPE_BY_ID.get("high-citadel")!;
    expect(recipe.placements.every((placement) => placement.colorId)).toBe(
      true,
    );
    const markup = render({
      recipeId: recipe.id,
      quality: "preview",
      pieces: { "brick-2x2:blue": 3 },
    });
    expect(markup).toContain('data-renderer="precompiled"');
  });

  it("conserve les variantes de couleur, les rotations et les préfixes dans une image locale", () => {
    const blue = render({
      recipeId: "totem",
      quality: "preview",
      pieces: { "brick-2x2:blue": 5 },
      rotation: 90,
      step: 2,
    });
    const yellow = render({
      recipeId: "totem",
      quality: "preview",
      pieces: { "brick-2x2:yellow": 5 },
      rotation: 90,
      step: 2,
    });
    expect(blue).toContain('data-renderer="snapshot"');
    expect(blue).toContain('data-placements="2"');
    expect(blue).toContain('data-rotation="90"');
    expect(blue).toContain('href="data:image/svg+xml;charset=utf-8,');
    expect(blue).not.toContain("data-scene-decoration");
    expect(blue).not.toBe(yellow);
    const empty = render({ recipeId: "totem", quality: "preview", step: 0 });
    expect(empty).toContain('data-placements="0"');
  });

  it("ignore un aperçu devenu obsolète quand les placements d’un plan changent", () => {
    const original = RECIPE_BY_ID.get("totem")!;
    RECIPE_BY_ID.set(original.id, {
      ...original,
      placements: original.placements.slice(0, 1),
    });
    try {
      const markup = render({ recipeId: original.id, quality: "preview" });
      expect(markup).toContain('data-renderer="snapshot"');
      expect(markup).toContain('data-placements="1"');
    } finally {
      RECIPE_BY_ID.set(original.id, original);
    }
  });
});
