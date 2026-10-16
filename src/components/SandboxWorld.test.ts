import { Children, createElement, isValidElement } from "react";
import type {
  KeyboardEvent,
  KeyboardEventHandler,
  MouseEventHandler,
  ReactElement,
  ReactNode,
} from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSandboxWorld } from "./sandbox3d/world";
import { SandboxWorld } from "./SandboxWorld";
import type { SandboxWorldProps } from "./SandboxWorld";

const rendering = vi.hoisted(() => ({
  status: "loading" as "loading" | "ready" | "fallback",
}));

// Seed GPU availability without mounting a real WebGL context in unit tests.
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useState: ((initial: unknown) =>
      actual.useState(
        initial === "loading" ? rendering.status : initial,
      )) as typeof actual.useState,
  };
});
vi.mock("./sandbox3d/world", () => ({
  createSandboxWorld: vi.fn(() => {
    throw new Error("Aucun contexte WebGL ne doit être créé pendant le SSR.");
  }),
}));

const makeProps = (
  overrides: Partial<SandboxWorldProps> = {},
): SandboxWorldProps => ({
  placements: [],
  selectedId: null,
  cursor: { x: 11, y: 11, z: 3 },
  candidateValid: true,
  interactionMode: "place",
  onCell: vi.fn(),
  onSelect: vi.fn(),
  onPlace: vi.fn(),
  ...overrides,
});

// Retain the actual handlers while React supplies the hooks dispatcher.
function worldElement(props: SandboxWorldProps) {
  let rendered: ReactNode = null;
  function InspectWorld() {
    rendered = (
      SandboxWorld as unknown as {
        type: (props: SandboxWorldProps) => ReactElement;
      }
    ).type(props);
    return rendered;
  }
  renderToStaticMarkup(createElement(InspectWorld));
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

function keyEvent(key: string, overrides: Record<string, unknown> = {}) {
  const currentTarget = { tagName: "DIV" };
  return {
    key,
    currentTarget,
    target: currentTarget,
    preventDefault: vi.fn(),
    ctrlKey: false,
    altKey: false,
    metaKey: false,
    ...overrides,
  } as unknown as KeyboardEvent<HTMLDivElement>;
}

function keyboard(props: SandboxWorldProps) {
  const root = findElement(
    worldElement(props),
    (element) => element.props.className === "sandbox-world-stage",
  )!;
  return root.props.onKeyDown as KeyboardEventHandler<HTMLDivElement>;
}

beforeEach(() => {
  vi.clearAllMocks();
  rendering.status = "loading";
});

describe("espace de construction 3D", () => {
  it("rend un chargement accessible sans créer de canvas ni de contexte WebGL au SSR", () => {
    const html = renderToStaticMarkup(createElement(SandboxWorld, makeProps()));
    expect(html).toContain('data-status="loading"');
    expect(html).toContain('aria-label="Caméra 3D"');
    expect(html).toContain('aria-label="Espace 3D de construction libre"');
    expect(html).toContain('tabindex="0" role="group"');
    expect(html).toContain('class="sandbox-world-loading" role="status"');
    expect(html).toContain("Préparation de votre espace 3D…");
    expect(html).toContain("Flèches pour viser et Entrée pour confirmer.");
    expect(html).toMatch(/aria-label="Rapprocher la caméra"[^>]*disabled=""/);
    expect(html).not.toContain("<canvas");
    expect(createSandboxWorld).not.toHaveBeenCalled();
  });

  it("explique la vue de secours et fournit une action de nouvel essai nommée", () => {
    rendering.status = "fallback";
    const html = renderToStaticMarkup(createElement(SandboxWorld, makeProps()));
    expect(html).toContain('data-status="fallback"');
    expect(html).toContain("La 3D n’est pas disponible sur cet appareil.");
    expect(html).toContain("les coordonnées restent utilisables.");
    expect(html).toMatch(/<button type="button">Réessayer la 3D<\/button>/);
    expect(html).not.toContain("<canvas");
    expect(createSandboxWorld).not.toHaveBeenCalled();
  });

  it.each(["place", "select"] as const)(
    "confirme au clavier seulement une position valide et non verrouillée en mode %s",
    (interactionMode) => {
      for (const candidateValid of [false, true])
        for (const disabled of [false, true])
          for (const key of ["Enter", " "]) {
            const props = makeProps({
              interactionMode,
              selectedId: interactionMode === "select" ? "placed" : null,
              candidateValid,
              disabled,
            });
            const event = keyEvent(key);
            keyboard(props)(event);
            expect(props.onPlace).toHaveBeenCalledTimes(
              candidateValid && !disabled ? 1 : 0,
            );
            expect(event.preventDefault).toHaveBeenCalledOnce();
            expect(props.onCell).not.toHaveBeenCalled();
            expect(props.onSelect).not.toHaveBeenCalled();
          }
    },
  );

  it.each([
    ["ArrowLeft", 0, 0, 0, 0],
    ["ArrowRight", 23, 23, 23, 23],
    ["ArrowUp", 0, 0, 0, 0],
    ["ArrowDown", 23, 23, 23, 23],
    ["ArrowLeft", 11, 11, 10, 11],
    ["ArrowRight", 11, 11, 12, 11],
    ["ArrowUp", 11, 11, 11, 10],
    ["ArrowDown", 11, 11, 11, 12],
  ] as const)(
    "%s vise depuis (%s, %s) vers (%s, %s) en conservant la hauteur",
    (key, x, y, nextX, nextY) => {
      const onCursorMove = vi.fn();
      const props = makeProps({ cursor: { x, y, z: 12 }, onCursorMove });
      const event = keyEvent(key);
      keyboard(props)(event);
      expect(onCursorMove).toHaveBeenCalledExactlyOnceWith({
        x: nextX,
        y: nextY,
        z: 12,
      });
      expect(props.onCell).not.toHaveBeenCalled();
      expect(props.onPlace).not.toHaveBeenCalled();
      expect(event.preventDefault).toHaveBeenCalledOnce();
    },
  );

  it("accepte le focus canvas et conserve le callback de cellule sans onCursorMove", () => {
    const props = makeProps();
    keyboard(props)(keyEvent("ArrowRight", { target: { tagName: "CANVAS" } }));
    expect(props.onCell).toHaveBeenCalledExactlyOnceWith(12, 11);
  });

  it("empêche les flèches de modifier le repère pendant une sauvegarde", () => {
    const onCursorMove = vi.fn();
    const props = makeProps({ disabled: true, onCursorMove });
    const event = keyEvent("ArrowRight");
    keyboard(props)(event);
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(onCursorMove).not.toHaveBeenCalled();
    expect(props.onCell).not.toHaveBeenCalled();
  });

  it.each(["INPUT", "SELECT", "BUTTON", "TEXTAREA"])(
    "laisse les touches et le focus d’un %s imbriqué à son contrôle",
    (tagName) => {
      for (const key of ["Enter", " ", "ArrowRight", "+", "f", "t"]) {
        const props = makeProps();
        const event = keyEvent(key, { target: { tagName } });
        keyboard(props)(event);
        expect(event.preventDefault).not.toHaveBeenCalled();
        expect(props.onPlace).not.toHaveBeenCalled();
        expect(props.onCell).not.toHaveBeenCalled();
      }
    },
  );

  it.each(["ctrlKey", "altKey", "metaKey"])(
    "préserve les raccourcis système avec %s",
    (modifier) => {
      const props = makeProps();
      const event = keyEvent("Enter", { [modifier]: true });
      keyboard(props)(event);
      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(props.onPlace).not.toHaveBeenCalled();
    },
  );

  it("les raccourcis de caméra ne placent pas de Brigo et restent inoffensifs avant le chargement", () => {
    const props = makeProps();
    const handle = keyboard(props);
    for (const key of ["+", "=", "-", "f", "F", "t", "T"]) {
      const event = keyEvent(key);
      expect(() => handle(event)).not.toThrow();
      expect(event.preventDefault).toHaveBeenCalledOnce();
    }
    expect(props.onPlace).not.toHaveBeenCalled();
    expect(props.onCell).not.toHaveBeenCalled();
    expect(createSandboxWorld).not.toHaveBeenCalled();
  });

  it.each([false, true])(
    "la confirmation proche du terrain respecte validité et verrouillage (pièce sélectionnée : %s)",
    (selected) => {
      rendering.status = "ready";
      for (const candidateValid of [false, true])
        for (const disabled of [false, true]) {
          const props = makeProps({
            selectedId: selected ? "placed" : null,
            candidateValid,
            disabled,
          });
          const tree = worldElement(props);
          const button = findElement(
            tree,
            (element) => element.props.className === "sandbox-world-place",
          )!;
          expect(button.props.disabled).toBe(disabled || !candidateValid);
          (button.props.onClick as MouseEventHandler<HTMLButtonElement>)(
            {} as never,
          );
          expect(props.onPlace).toHaveBeenCalledTimes(
            candidateValid && !disabled ? 1 : 0,
          );
          const html = renderToStaticMarkup(createElement(SandboxWorld, props));
          expect(html).toContain(selected ? "Déplacer ici" : "Poser ici");
          expect(html).toContain('aria-label="Position visée"');
        }
    },
  );
});
