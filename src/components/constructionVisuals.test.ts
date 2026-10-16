import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BRIGO_BY_ID, MODELS, RECIPE_BY_ID } from "../game/catalog";
import {
  BrigoArt,
  ConstructionArt,
  brigoGeometry,
  prepareConstructionScene,
  serializeConstructionFrame,
} from "./BrigoScene";

type Point = [number, number];

// Independent 2D coverage check: the final polygon at a pixel is what is painted.
function contains(polygon: [number, number][], [x, y]: [number, number]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i],
      [xj, yj] = polygon[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
      inside = !inside;
  }
  return inside;
}

// Paths round projected points to hundredths. Treat only that rounding margin
// as an edge hit; do not use the renderer's clipping or point-in-polygon helper.
function onPaintedFace(polygon: Point[], point: Point) {
  if (contains(polygon, point)) return true;
  return polygon.some((a, index) => {
    const b = polygon[(index + 1) % polygon.length];
    const dx = b[0] - a[0],
      dy = b[1] - a[1];
    const length2 = dx * dx + dy * dy;
    const t = length2
      ? Math.max(
          0,
          Math.min(
            1,
            ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / length2,
          ),
        )
      : 0;
    return (
      Math.hypot(point[0] - a[0] - t * dx, point[1] - a[1] - t * dy) < 0.02
    );
  });
}

function pathSegments(d: string) {
  return d.match(/M[^M]+/g)!.flatMap((subpath) => {
    const points = [...subpath.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map(
      (match) => [Number(match[1]), Number(match[2])] as Point,
    );
    if (subpath.endsWith("Z")) points.push(points[0]);
    return points.slice(1).map((end, index) => [points[index], end] as const);
  });
}

// Compare rendered paint, including inherited width, after expanding batched
// paths. Class names and serializer path batching must not affect appearance.
function renderedPaths(markup: string) {
  return [...markup.matchAll(/<path ([^>]+)\/?\s*>/g)].flatMap((match) => {
    const attributes = Object.fromEntries(
      [...match[1].matchAll(/([\w-]+)="([^"]*)"/g)].map((attr) => [
        attr[1],
        attr[2],
      ]),
    );
    return (attributes.d.match(/M[^M]*/g) ?? []).map((d) => ({
      d: d.trim(),
      fill: attributes.fill ?? "none",
      stroke: attributes.stroke ?? "none",
      width: Number(attributes["stroke-width"] ?? 1.55),
      opacity: Number(attributes.opacity ?? 1),
    }));
  });
}

describe("lisibilité des détails de construction", () => {
  it.each(MODELS.map((model) => [model.id] as const))(
    "%s garde ses rehauts et traits de pinceau dans les faces sous tous les angles",
    (modelId) => {
      for (const color of ["ivory", "charcoal"]) {
        for (const rotation of [0, 90, 180, 270] as const) {
          const geometry = brigoGeometry(
            BRIGO_BY_ID.get(`${modelId}:${color}`)!,
            rotation,
          );
          const context = `${modelId}:${color} à ${rotation}°`;
          expect(
            [
              geometry.minX,
              geometry.minY,
              geometry.width,
              geometry.height,
            ].every(Number.isFinite),
            context,
          ).toBe(true);
          expect(geometry.width, context).toBeGreaterThan(0);
          expect(geometry.height, context).toBeGreaterThan(0);
          for (const primitive of geometry.primitives) {
            expect(
              primitive.points.flat().every(Number.isFinite),
              context,
            ).toBe(true);
            expect(Number.isFinite(primitive.depth), context).toBe(true);
            expect(Number.isFinite(primitive.strokeWidth), context).toBe(true);
            expect(primitive.strokeWidth, context).toBeGreaterThan(0);
            expect(primitive.d, context).not.toMatch(/NaN|Infinity/);
            if (primitive.opacity !== undefined) {
              expect(primitive.opacity, context).toBeGreaterThan(0);
              expect(primitive.opacity, context).toBeLessThanOrEqual(1);
            }
            for (const style of ["brush", "highlight", "hatching"] as const) {
              const d = primitive[style];
              if (!d) continue;
              expect(d, context).not.toMatch(/NaN|Infinity/);
              const segments = pathSegments(d);
              expect(segments.length, `${context} ${style}`).toBeGreaterThan(0);
              for (const [start, end] of segments) {
                // A segment can cross a concave opening even with both ends in
                // the material, so sample the entire stroke, not just vertices.
                for (const t of [
                  0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1,
                ]) {
                  const sample: Point = [
                    start[0] + (end[0] - start[0]) * t,
                    start[1] + (end[1] - start[1]) * t,
                  ];
                  expect(
                    onPaintedFace(primitive.points, sample),
                    `${context} ${style} sort de sa face à ${sample.join(",")}`,
                  ).toBe(true);
                }
              }
            }
          }
        }
      }
    },
  );

  it("marque le volume par des chanfreins larges, des aplats contrastés et une hiérarchie d’encre", () => {
    const geometry = brigoGeometry(BRIGO_BY_ID.get("brick-2x2:blue")!);
    const body = geometry.primitives.filter((p) => p.surface === "body");
    const top = body.find((p) => p.points.length === 8)!;
    expect(top).toBeDefined();
    // Projecting the .18 unit corner cuts independently gives two horizontal
    // 9 px cuts and two vertical 4.5 px cuts in this isometric presentation.
    const bevelLengths = top.points
      .map((p, i) => {
        const next = top.points[(i + 1) % top.points.length];
        return Math.hypot(next[0] - p[0], next[1] - p[1]);
      })
      .sort((a, b) => a - b)
      .slice(0, 4);
    for (const [index, expected] of [4.5, 4.5, 9, 9].entries())
      expect(bevelLengths[index]).toBeCloseTo(expected, 8);
    expect(body.every((p) => p.stroke === "#252127")).toBe(true);
    expect(
      body
        .filter((p) => p.points.length === 8 || p.hatching)
        .every((p) => p.strokeWidth === 1.55),
    ).toBe(true);
    expect(
      geometry.primitives
        .filter((p) => p.surface === "stud")
        .every((p) => p.strokeWidth === 0.9),
    ).toBe(true);
    expect(body.some((p) => p.brush)).toBe(true);
    expect(top.highlight).toBeTruthy();
    const hatchedFace = body.find((p) => p.hatching)!;
    expect(pathSegments(hatchedFace.hatching!)).toHaveLength(6);
    for (const channel of [1, 3, 5]) {
      const values = body.map((p) =>
        parseInt(p.fill.slice(channel, channel + 2), 16),
      );
      expect(Math.max(...values) - Math.min(...values)).toBeGreaterThan(45);
    }
    const rendered = renderToStaticMarkup(
      createElement(BrigoArt, {
        brigo: BRIGO_BY_ID.get("brick-2x2:blue")!,
      }),
    );
    const inkPaths = renderedPaths(rendered);
    expect(
      inkPaths.some((p) => p.fill === "#252127" && p.opacity === 0.85),
    ).toBe(true);
    expect(
      inkPaths.some(
        (p) => p.stroke === "#fff5d9" && p.width === 0.9 && p.opacity === 0.82,
      ),
    ).toBe(true);
  });

  it.each([0, 90, 180, 270] as const)(
    "conserve exactement les traits et rehauts dans l’image préparée à %s°",
    (rotation) => {
      const source = RECIPE_BY_ID.get("totem")!;
      const id = "review-manga-paint";
      try {
        for (const color of ["blue", "ivory", "charcoal"] as const) {
          const placement = {
            ...source.placements[0],
            x: 0,
            y: 0,
            z: 0,
            rotation,
            colorId: color,
          };
          RECIPE_BY_ID.set(id, {
            ...source,
            id,
            previewRotation: 0,
            placements: [placement],
          });
          const scene = prepareConstructionScene({ recipeId: id })!;
          const snapshot = serializeConstructionFrame(scene);
          const brigo = BRIGO_BY_ID.get(`${placement.modelId}:${color}`)!;
          const svg = renderToStaticMarkup(
            createElement(BrigoArt, { brigo, rotation }),
          );
          expect(renderedPaths(snapshot)).toEqual(renderedPaths(svg));
          expect(snapshot).not.toMatch(/<filter|<mask|<clipPath|NaN|Infinity/);
        }
      } finally {
        RECIPE_BY_ID.delete(id);
      }
    },
  );

  it("dessine des fermoirs losange bas et des silhouettes chanfreinées à l’encre", () => {
    const brigo = BRIGO_BY_ID.get("brick-2x2:blue")!;
    const primitives = brigoGeometry(brigo).primitives;
    const connectors = primitives.filter(
      (primitive) => primitive.surface === "stud",
    );
    expect(connectors.length).toBeGreaterThan(0);
    expect(connectors.every((primitive) => primitive.points.length <= 6)).toBe(
      true,
    );
    expect(
      primitives.some(
        (primitive) =>
          primitive.surface === "body" && primitive.points.length === 8,
      ),
    ).toBe(true);
    expect(primitives.some((primitive) => primitive.hatching)).toBe(true);
    const markup = renderToStaticMarkup(
      createElement(BrigoArt, { brigo, title: "Brigo bleu" }),
    );
    expect(markup).toContain('data-connector-style="diamond"');
    expect(markup).toContain('aria-label="Brigo bleu"');
    expect(markup).toContain('class="brigo-hatching"');
  });

  it("distingue roue, essieu et articulation avec des silhouettes finies dans les quatre vues", () => {
    const silhouettes = new Set<string>();
    for (const modelId of ["special-wheel", "special-axle", "special-hinge"]) {
      const brigo = BRIGO_BY_ID.get(`${modelId}:blue`)!;
      for (const rotation of [0, 90, 180, 270] as const) {
        const geometry = brigoGeometry(brigo, rotation);
        expect(geometry.width).toBeGreaterThan(0);
        expect(geometry.height).toBeGreaterThan(0);
        expect(
          geometry.primitives.every(
            (primitive) => !/NaN|Infinity/.test(primitive.d),
          ),
        ).toBe(true);
      }
      silhouettes.add(
        brigoGeometry(brigo)
          .primitives.map((primitive) => primitive.d)
          .join(" "),
      );
      if (modelId !== "special-hinge")
        expect(
          brigoGeometry(brigo).primitives.every(
            (primitive) => primitive.surface !== "stud",
          ),
        ).toBe(true);
    }
    expect(silhouettes.size).toBe(3);
  });

  it("ajoute un décor propre au thème puis libère le lecteur d’étapes", () => {
    for (const theme of ["nature", "architecture", "vehicles", "objects"]) {
      const recipe = [...RECIPE_BY_ID.values()].find(
        (candidate) => candidate.theme === theme,
      )!;
      const preview = renderToStaticMarkup(
        createElement(ConstructionArt, { recipeId: recipe.id }),
      );
      const instruction = renderToStaticMarkup(
        createElement(ConstructionArt, { recipeId: recipe.id, step: 1 }),
      );
      expect(preview).toContain(`data-scene-decoration="${theme}"`);
      expect(instruction).not.toContain("data-scene-decoration");
      expect(preview.match(/viewBox="([^"]+)"/)?.[1]).toBe(
        instruction.match(/viewBox="([^"]+)"/)?.[1],
      );
    }
  });

  it.each([0, 90, 180, 270] as const)(
    "garde les panneaux et la poignée visibles à %s°",
    (rotation) => {
      for (const color of ["ivory", "blue", "charcoal"]) {
        const primitives = brigoGeometry(
          BRIGO_BY_ID.get(`special-door:${color}`)!,
          rotation,
        ).primitives;
        const details = primitives.filter((p) => p.surface === "detail");
        expect(details).toHaveLength(3);
        for (const detail of details) {
          const center: [number, number] = [
            detail.points.reduce((sum, p) => sum + p[0], 0) /
              detail.points.length,
            detail.points.reduce((sum, p) => sum + p[1], 0) /
              detail.points.length,
          ];
          const painted = primitives
            .filter((p) => contains(p.points, center))
            .at(-1);
          expect(painted?.fill).toBe(detail.fill);
        }
      }
    },
  );

  it("applique l’angle de présentation sans modifier le montage ni les étapes", () => {
    const original = RECIPE_BY_ID.get("totem")!;
    const id = "review-camera-offset";
    const presented = { ...original, id, previewRotation: 90 as const };
    RECIPE_BY_ID.set(id, presented);
    try {
      const straight = prepareConstructionScene({ recipeId: "totem" })!;
      const offset = prepareConstructionScene({ recipeId: id, rotation: 270 })!;
      expect(offset.framing).toEqual(straight.framing);
      expect(offset.layers.map((p) => p.primitives)).toEqual(
        straight.layers.map((p) => p.primitives),
      );
      expect(offset.frame(3).orderedLayers.map((p) => p.placement.key)).toEqual(
        straight.frame(3).orderedLayers.map((p) => p.placement.key),
      );
      expect(presented.placements).toBe(original.placements);
    } finally {
      RECIPE_BY_ID.delete(id);
    }
  });
});
