import { describe, expect, it } from "vitest";
import { RECIPE_BY_ID } from "../game/catalog";
import {
  prepareConstructionScene,
  serializeConstructionFrame,
} from "./BrigoScene";

describe("rendu préparé du lecteur de montage", () => {
  it("partage les maillages répétés et réutilise les préfixes déjà préparés", () => {
    const scene = prepareConstructionScene({ recipeId: "high-citadel" })!;
    const first = scene.layers[0];
    const identical = scene.layers.find(
      (layer, index) =>
        index > 0 &&
        layer.brigo === first.brigo &&
        layer.placement.rotation === first.placement.rotation,
    )!;
    expect(identical).toBeDefined();
    expect(identical.primitives).toBe(first.primitives);
    expect(identical.offset).not.toEqual(first.offset);
    expect(scene.frame(150)).toBe(scene.frame(150.9));
    expect(scene.frame()).toBe(scene.frame(scene.layers.length));
    const snapshot = serializeConstructionFrame(scene, scene.layers.length - 1);
    expect(snapshot.match(/<use /g)).toHaveLength(scene.layers.length - 1);
    expect(snapshot.match(/<g id=/g)!.length).toBeLessThan(200);
    expect(snapshot.length).toBeLessThan(350_000);
  });
  it.each(["astreval-gardens", "aurora-palace", "high-citadel"])(
    "%s conserve les mêmes objets de dessin lors des avances et retours arrière",
    (recipeId) => {
      const scene = prepareConstructionScene({ recipeId })!;
      const originals = new Map(
        scene.layers.map((layer) => [layer.placement.key, layer]),
      );
      const total = scene.layers.length;
      for (const step of [total, total - 1, 150, 151, 150, 0, total]) {
        const frame = scene.frame(step);
        expect(frame.visibleCount).toBe(step);
        expect(frame.orderedLayers).toHaveLength(step);
        for (const layer of frame.orderedLayers)
          expect(layer).toBe(originals.get(layer.placement.key));
        expect(
          new Set(frame.orderedLayers.map((layer) => layer.placement.key)),
        ).toEqual(
          new Set(
            scene.layers.slice(0, step).map((layer) => layer.placement.key),
          ),
        );
      }
    },
  );

  it("révèle à nouveau les tenons d’une pièce après le retrait de celle qui la couvre", () => {
    const scene = prepareConstructionScene({ recipeId: "totem" })!;
    const bottomKey = scene.layers[0].placement.key;
    const bottom = (step: number) =>
      scene
        .frame(step)
        .orderedLayers.find((layer) => layer.placement.key === bottomKey)!;
    expect(bottom(1).visibleStudCount).toBe(4);
    expect(bottom(2).visibleStudCount).toBe(0);
    expect(bottom(scene.layers.length).visibleStudCount).toBe(0);
    expect(bottom(1).visibleStudCount).toBe(4);
    expect(scene.layers[0].visibleStudCount).toBe(0);
  });

  it("utilise une nouvelle allocation de couleurs sans modifier les quantités fournies", () => {
    const modelId = RECIPE_BY_ID.get("totem")!.placements[0].modelId;
    const pieces = { [`${modelId}:blue`]: 5 };
    const scene = prepareConstructionScene({ recipeId: "totem", pieces })!;
    expect(scene.layers.every((layer) => layer.brigo.color.id === "blue")).toBe(
      true,
    );
    expect(pieces).toEqual({ [`${modelId}:blue`]: 5 });
    const changed = prepareConstructionScene({
      recipeId: "totem",
      pieces: { [`${modelId}:yellow`]: 5 },
    })!;
    expect(
      changed.layers.every((layer) => layer.brigo.color.id === "yellow"),
    ).toBe(true);
    expect(scene.layers.every((layer) => layer.brigo.color.id === "blue")).toBe(
      true,
    );
  });

  it("borne les étapes sans perdre le cadrage ni les données du plan", () => {
    const scene = prepareConstructionScene({
      recipeId: "high-citadel",
      rotation: 90,
    })!;
    expect(scene.frame(-1).visibleCount).toBe(0);
    expect(scene.frame(Number.NaN).visibleCount).toBe(0);
    expect(scene.frame(Number.POSITIVE_INFINITY).visibleCount).toBe(0);
    expect(scene.frame(150.9).visibleCount).toBe(150);
    expect(scene.frame(scene.layers.length + 1).visibleCount).toBe(
      scene.layers.length,
    );
    expect(scene.frame().visibleCount).toBe(scene.layers.length);
    expect(
      prepareConstructionScene({ recipeId: "__unknown-plan__" }),
    ).toBeNull();
  });
});
