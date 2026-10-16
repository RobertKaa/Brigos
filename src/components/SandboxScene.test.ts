import { Children, createElement, isValidElement } from "react";
import type {
  KeyboardEvent,
  KeyboardEventHandler,
  MouseEvent,
  MouseEventHandler,
  ReactElement,
  ReactNode,
} from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CATALOG } from "../game/catalog";
import { rotateModelPoint, rotatedSize } from "../game/geometry";
import type { Rotation } from "../game/geometry";
import type { SandboxPlacement } from "../game/sandbox";
import {
  prepareSandboxDrawing,
  projectSandboxPoint,
  sandboxCellAtPoint,
  sandboxCellOnPlacementAtPoint,
  SandboxScene,
} from "./SandboxScene";
import type { SandboxSceneProps } from "./SandboxScene";

const rotations: Rotation[] = [0, 90, 180, 270];
const brigo = CATALOG.find(
  (part) => part.model.width === 1 && part.model.depth === 2,
)!;
const piece: SandboxPlacement = {
  id: "first",
  brigoId: brigo.id,
  x: 8,
  y: 9,
  z: 3,
  rotation: 0,
};

// Render under React's dispatcher, then invoke the real retained handlers.
function sceneElement(props: SandboxSceneProps) {
  let rendered: ReactNode = null;
  function InspectScene() {
    rendered = (
      SandboxScene as unknown as {
        type: (props: SandboxSceneProps) => ReactElement;
      }
    ).type(props);
    return rendered;
  }
  renderToStaticMarkup(createElement(InspectScene));
  return rendered;
}

function findElement(
  node: ReactNode,
  predicate: (element: ReactElement<Record<string, unknown>>) => boolean,
): ReactElement<Record<string, unknown>> | undefined {
  if (!isValidElement<Record<string, unknown>>(node)) return;
  if (predicate(node)) return node;
  for (const child of Children.toArray(node.props.children as ReactNode)) {
    const result = findElement(child, predicate);
    if (result) return result;
  }
}

function placementClick(screen: { x: number; y: number }) {
  const focus = vi.fn();
  const stopPropagation = vi.fn();
  const svg = {
    getScreenCTM: () => ({ inverse: () => ({}) }),
    createSVGPoint: () => ({
      x: 0,
      y: 0,
      matrixTransform: () => screen,
    }),
    parentElement: { focus },
  };
  const event = {
    currentTarget: { ownerSVGElement: svg },
    clientX: 100,
    clientY: 200,
    stopPropagation,
  } as unknown as MouseEvent<SVGGElement>;
  return { event, focus, stopPropagation };
}

describe("plateau libre isométrique", () => {
  it.each(rotations)(
    "retrouve chaque cellule et hauteur avec la caméra à %s°",
    (rotation) => {
      for (const z of [0, 3, 18, 35])
        for (let x = 0; x < 24; x++)
          for (let y = 0; y < 24; y++) {
            const projected = projectSandboxPoint(
              { x: x + 0.5, y: y + 0.5, z },
              rotation,
            );
            expect(sandboxCellAtPoint(projected, z, rotation)).toEqual({
              x,
              y,
            });
          }
    },
  );

  it("ignore les clics hors plateau et les coordonnées non finies", () => {
    for (const point of [
      { x: -1, y: 5, z: 0 },
      { x: 24.2, y: 8, z: 2 },
      { x: 5, y: 24.1, z: 0 },
    ])
      expect(
        sandboxCellAtPoint(projectSandboxPoint(point), point.z),
      ).toBeNull();
    expect(sandboxCellAtPoint({ x: NaN, y: 0 }, 0)).toBeNull();
    expect(sandboxCellAtPoint({ x: 0, y: Infinity }, 0)).toBeNull();
    expect(sandboxCellAtPoint({ x: 0, y: 0 }, NaN)).toBeNull();
  });

  it.each(rotations)(
    "vise les cellules du dessus avec la caméra à %s°, même en hauteur",
    (cameraRotation) => {
      for (const rotation of rotations)
        for (const z of [0, 3, 35 - brigo.model.height]) {
          const placement = { ...piece, rotation, z };
          const size = rotatedSize(brigo.model, rotation);
          for (let x = placement.x; x < placement.x + size.width; x++)
            for (let y = placement.y; y < placement.y + size.depth; y++) {
              const screen = projectSandboxPoint(
                { x: x + 0.25, y: y + 0.75, z: z + brigo.model.height },
                cameraRotation,
              );
              expect(
                sandboxCellOnPlacementAtPoint(
                  screen,
                  placement,
                  cameraRotation,
                ),
              ).toEqual({ x, y });
            }
          expect(placement).toEqual({ ...piece, rotation, z });
        }
    },
  );

  it.each(rotations)(
    "garde les clics sur les côtés et les connecteurs dans l’empreinte à %s°",
    (cameraRotation) => {
      for (const rotation of rotations) {
        const size = rotatedSize(brigo.model, rotation);
        for (const origin of [
          { x: 0, y: 0 },
          { x: 24 - size.width, y: 24 - size.depth },
        ]) {
          const placement = { ...piece, ...origin, rotation };
          for (const point of [
            { x: origin.x, y: origin.y, z: placement.z },
            {
              x: origin.x + size.width,
              y: origin.y + size.depth,
              z: placement.z,
            },
            {
              x: origin.x + 0.5,
              y: origin.y + 0.5,
              z: placement.z + brigo.model.height + 0.5,
            },
          ]) {
            const cell = sandboxCellOnPlacementAtPoint(
              projectSandboxPoint(point, cameraRotation),
              placement,
              cameraRotation,
            );
            expect(cell).not.toBeNull();
            expect(cell!.x).toBeGreaterThanOrEqual(origin.x);
            expect(cell!.x).toBeLessThan(origin.x + size.width);
            expect(cell!.y).toBeGreaterThanOrEqual(origin.y);
            expect(cell!.y).toBeLessThan(origin.y + size.depth);
          }
        }
      }
    },
  );

  it("refuse les références et coordonnées invalides pour viser une pièce", () => {
    const screen = projectSandboxPoint({ x: 8.5, y: 9.5, z: 5 });
    expect(
      sandboxCellOnPlacementAtPoint(screen, { ...piece, brigoId: "__proto__" }),
    ).toBeNull();
    for (const key of ["x", "y", "z", "rotation"] as const)
      expect(
        sandboxCellOnPlacementAtPoint(screen, { ...piece, [key]: NaN }),
      ).toBeNull();
    expect(sandboxCellOnPlacementAtPoint({ x: NaN, y: 0 }, piece)).toBeNull();
    expect(
      sandboxCellOnPlacementAtPoint({ x: 0, y: Infinity }, piece),
    ).toBeNull();
    expect(
      sandboxCellOnPlacementAtPoint(screen, piece, NaN as Rotation),
    ).toBeNull();
    expect(
      sandboxCellOnPlacementAtPoint(screen, { ...piece, z: Number.MAX_VALUE }),
    ).toBeNull();
  });

  it.each(rotations)(
    "le clic sur une pièce vise son dessus sans la sélectionner à %s°",
    (cameraRotation) => {
      const onCell = vi.fn();
      const onSelect = vi.fn();
      const tree = sceneElement({
        placements: [piece],
        selectedId: null,
        cursor: { x: 0, y: 0, z: 0 },
        onCell,
        onSelect,
        cameraRotation,
      });
      const placed = findElement(
        tree,
        (element) => element.props["data-placement-id"] === piece.id,
      )!;
      const click = placementClick(
        projectSandboxPoint(
          {
            x: piece.x + 0.5,
            y: piece.y + 1.5,
            z: piece.z + brigo.model.height,
          },
          cameraRotation,
        ),
      );
      (placed.props.onClick as MouseEventHandler<SVGGElement>)(click.event);
      expect(onCell).toHaveBeenCalledExactlyOnceWith(piece.x, piece.y + 1);
      expect(onSelect).not.toHaveBeenCalled();
      expect(click.stopPropagation).toHaveBeenCalledOnce();
      expect(click.focus).toHaveBeenCalledExactlyOnceWith({
        preventScroll: true,
      });
    },
  );

  it("le mode sélection sélectionne sans déplacer le repère et reprend le focus", () => {
    const onCell = vi.fn();
    const onSelect = vi.fn();
    const tree = sceneElement({
      placements: [piece],
      selectedId: null,
      cursor: { x: 0, y: 0, z: 0 },
      interactionMode: "select",
      onCell,
      onSelect,
    });
    const placed = findElement(
      tree,
      (element) => element.props["data-placement-id"] === piece.id,
    )!;
    const click = placementClick({ x: 0, y: 0 });
    (placed.props.onClick as MouseEventHandler<SVGGElement>)(click.event);
    expect(onSelect).toHaveBeenCalledExactlyOnceWith(piece.id);
    expect(onCell).not.toHaveBeenCalled();
    expect(click.stopPropagation).toHaveBeenCalledOnce();
    expect(click.focus).toHaveBeenCalledExactlyOnceWith({
      preventScroll: true,
    });
  });

  it("le clic sur une pièce respecte le plan manuel quand l’empilage est désactivé", () => {
    const onCell = vi.fn();
    const onSelect = vi.fn();
    const pickHeight = 12;
    const screen = projectSandboxPoint({ x: 6.5, y: 7.5, z: pickHeight });
    const tree = sceneElement({
      placements: [piece],
      selectedId: null,
      cursor: { x: 0, y: 0, z: pickHeight },
      stackAutomatically: false,
      pickHeight,
      onCell,
      onSelect,
    });
    const placed = findElement(
      tree,
      (element) => element.props["data-placement-id"] === piece.id,
    )!;
    (placed.props.onClick as MouseEventHandler<SVGGElement>)(
      placementClick(screen).event,
    );
    expect(onCell).toHaveBeenCalledExactlyOnceWith(6, 7);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it.each(["place", "select"] as const)(
    "Entrée et Espace confirment uniquement un candidat valide en mode %s",
    (interactionMode) => {
      for (const candidateValid of [false, true])
        for (const key of ["Enter", " "]) {
          const onPlace = vi.fn();
          const tree = sceneElement({
            placements: [piece],
            selectedId: interactionMode === "select" ? piece.id : null,
            cursor: { x: 0, y: 0, z: 0 },
            interactionMode,
            candidateValid,
            onCell: vi.fn(),
            onSelect: vi.fn(),
            onPlace,
          });
          const root = findElement(
            tree,
            (element) => element.props.role === "group",
          )!;
          const preventDefault = vi.fn();
          (root.props.onKeyDown as KeyboardEventHandler<HTMLDivElement>)({
            key,
            preventDefault,
          } as unknown as KeyboardEvent<HTMLDivElement>);
          expect(onPlace).toHaveBeenCalledTimes(candidateValid ? 1 : 0);
          expect(preventDefault).toHaveBeenCalledOnce();
        }
    },
  );

  it("normalise chaque quart de tour sans décaler la pièce par rapport au curseur", () => {
    for (const cameraRotation of rotations)
      for (const rotation of rotations) {
        const layer = prepareSandboxDrawing(
          [{ ...piece, rotation }],
          cameraRotation,
        )[0];
        for (const local of [
          { x: 0, y: 0, z: 0 },
          { x: brigo.model.width, y: brigo.model.depth, z: brigo.model.height },
        ]) {
          const worldLocal = rotateModelPoint(brigo.model, local, rotation);
          const expected = projectSandboxPoint(
            {
              x: piece.x + worldLocal.x,
              y: piece.y + worldLocal.y,
              z: piece.z + worldLocal.z,
            },
            cameraRotation,
          );
          const meshLocal = rotateModelPoint(
            brigo.model,
            local,
            ((rotation + cameraRotation) % 360) as Rotation,
          );
          expect(layer.offset.x + (meshLocal.x - meshLocal.y) * 25).toBeCloseTo(
            expected.x,
          );
          expect(
            layer.offset.y +
              (meshLocal.x + meshLocal.y) * 12.5 -
              meshLocal.z * 7,
          ).toBeCloseTo(expected.y);
        }
      }
  });

  it.each(rotations)(
    "dessine une pile de bas en haut avec la caméra à %s°",
    (cameraRotation) => {
      const bottom = { ...piece, id: "bottom", z: 0 };
      const top = { ...piece, id: "top", z: brigo.model.height };
      const ordered = prepareSandboxDrawing([top, bottom], cameraRotation);
      expect(ordered.map((layer) => layer.placement.id)).toEqual([
        "bottom",
        "top",
      ]);
      expect(ordered[0].mesh).toBe(ordered[1].mesh);
    },
  );

  it("réutilise un seul dessin pour 500 exemplaires et n'injecte aucun filtre", () => {
    const placements = Array.from({ length: 500 }, (_, index) => ({
      ...piece,
      id: `piece-${index}`,
      x: index % 20,
      y: Math.floor(index / 20),
      z: 0,
    }));
    const html = renderToStaticMarkup(
      createElement(SandboxScene, {
        placements,
        cursor: { x: 0, y: 0, z: 0 },
        selectedId: null,
        onCell: vi.fn(),
        onSelect: vi.fn(),
      }),
    );
    expect(html.match(/<use /g)).toHaveLength(500);
    expect(html.match(/<path /g)!.length).toBeLessThan(60);
    expect(html).not.toContain("<filter");
    expect(html).not.toContain("<mask");
    expect(html).toContain('tabindex="0" role="group"');
    expect(html).toContain("Plateau de 24 par 24, 500 Brigos posés");
    expect(html).toContain("les flèches");
    expect(html).toContain('data-interaction-mode="place"');
    expect(html).toContain("un Brigo posé");
    expect(html).toContain("au-dessus");
  });

  it("annonce la sélection et la confirmation de modification par Entrée", () => {
    const html = renderToStaticMarkup(
      createElement(SandboxScene, {
        placements: [piece],
        cursor: { x: 0, y: 0, z: 0 },
        selectedId: piece.id,
        interactionMode: "select",
        onCell: vi.fn(),
        onSelect: vi.fn(),
      }),
    );
    expect(html).toContain('data-interaction-mode="select"');
    expect(html).toContain("pour la sélectionner et la modifier");
    expect(html).not.toContain("Entrée place");
    expect(html).toContain("Entrée confirme la modification");
    expect(html).toContain('class="sandbox-selection-outline"');
  });

  it("annonce le plan actif lorsque l’empilage automatique est désactivé", () => {
    const html = renderToStaticMarkup(
      createElement(SandboxScene, {
        placements: [piece],
        cursor: { x: 2, y: 4, z: 12 },
        selectedId: null,
        stackAutomatically: false,
        pickHeight: 12,
        onCell: vi.fn(),
        onSelect: vi.fn(),
      }),
    );
    expect(html).toContain("sur le plan actif");
    expect(html).toContain('class="sandbox-elevation-plane"');
  });

  it("montre la prévisualisation invalide et le plan élevé sans changer les placements", () => {
    const placements = [piece];
    const html = renderToStaticMarkup(
      createElement(SandboxScene, {
        placements,
        cursor: { x: 2, y: 4, z: 3 },
        selectedId: piece.id,
        candidate: { ...piece, x: 2, y: 4 },
        candidateValid: false,
        onCell: vi.fn(),
        onSelect: vi.fn(),
      }),
    );
    expect(html).toContain('class="sandbox-candidate" data-valid="false"');
    expect(html).toContain('class="sandbox-selection-outline"');
    expect(html).toContain('class="sandbox-elevation-plane"');
    expect(placements).toEqual([piece]);
  });

  it("vise le sol en empilage automatique même avec une prévisualisation élevée", () => {
    const screen = projectSandboxPoint({ x: 11.5, y: 7.5, z: 0 }, 90);
    expect(sandboxCellAtPoint(screen, 0, 90)).toEqual({ x: 11, y: 7 });
    expect(sandboxCellAtPoint(screen, 30, 90)).not.toEqual({ x: 11, y: 7 });
    const html = renderToStaticMarkup(
      createElement(SandboxScene, {
        placements: [],
        cursor: { x: 11, y: 7, z: 30 },
        pickHeight: 0,
        selectedId: null,
        candidate: { ...piece, x: 11, y: 7, z: 30 },
        candidateValid: true,
        onCell: vi.fn(),
        onSelect: vi.fn(),
      }),
    );
    expect(html).not.toContain('class="sandbox-elevation-plane"');
    expect(html).toContain('class="sandbox-candidate" data-valid="true"');
    expect(html).toContain("hauteur 30.");
  });

  it("ignore proprement une référence inconnue", () => {
    expect(prepareSandboxDrawing([{ ...piece, brigoId: "__proto__" }])).toEqual(
      [],
    );
  });
});
