import { describe, expect, it } from "vitest";
import { NATURE_ASSEMBLIES } from "./assemblies/nature";
import { OBJECTS_ASSEMBLIES } from "./assemblies/objects";
import { MODELS } from "./catalog";
import { rotatedSize } from "./geometry";
import { validateAssembly } from "./assemblyValidation";
import type { AssemblyPlacement } from "./assemblies";

const plan = (id: string) =>
  [...NATURE_ASSEMBLIES, ...OBJECTS_ASSEMBLIES].find(
    (candidate) => candidate.id === id,
  )!;
const size = (piece: AssemblyPlacement) =>
  rotatedSize(
    MODELS.find((model) => model.id === piece.modelId)!,
    piece.rotation,
  );

describe("recognisable toy silhouettes", () => {
  for (const assembly of [...NATURE_ASSEMBLIES, ...OBJECTS_ASSEMBLIES]) {
    it(`${assembly.id}: keeps every piece connected and every support before its load`, () => {
      expect(
        validateAssembly(assembly, MODELS, { checkInstructionOrder: true }),
      ).toEqual([]);
    });
  }

  for (const id of ["penguin", "duck", "owl", "snowman"]) {
    it(`${id}: the beak points out of the same face as its two eyes`, () => {
      const pieces = plan(id).placements;
      const beak = pieces
        .filter(
          (piece) =>
            ["orange", "yellow"].includes(piece.colorId ?? "") &&
            ["plate-1x2", "plate-2x2"].includes(piece.modelId),
        )
        .sort((a, b) => b.z - a.z)[0]!;
      const eyes = pieces.filter(
        (piece) =>
          piece.colorId === "charcoal" && piece.modelId === "brick-1x1",
      );
      expect(eyes).toHaveLength(2);
      expect(eyes.every((eye) => eye.y === beak.y)).toBe(true);
      expect(eyes[0].x).toBeLessThan(beak.x);
      expect(eyes[1].x).toBeGreaterThanOrEqual(beak.x + size(beak).width);
      expect(
        eyes.every(
          (eye) => eye.y + size(eye).depth < beak.y + size(beak).depth,
        ),
      ).toBe(true);
      expect(eyes.every((eye) => eye.z >= beak.z)).toBe(true);
    });
  }

  it("places arcade controls above the lower cabinet and in front of the screen", () => {
    const pieces = plan("arcade").placements;
    const joystick = pieces.find(
      (piece) => piece.modelId === "round-1x1" && piece.colorId === "coral",
    )!;
    const console = pieces.find(
      (piece) => piece.modelId === "plate-2x4" && piece.colorId === "yellow",
    )!;
    const screen = pieces.filter(
      (piece) => piece.colorId === "blue" && piece.modelId.startsWith("brick-"),
    );
    expect(console.z).toBeGreaterThanOrEqual(7);
    expect(joystick.z).toBe(console.z + 1);
    expect(screen.length).toBeGreaterThan(0);
    expect(screen.every((piece) => piece.y < joystick.y)).toBe(true);
    expect(Math.max(...screen.map((piece) => piece.z + 3))).toBeGreaterThan(
      joystick.z + 3,
    );
  });

  it("puts short black piano keys at the back of long white keys, only one plate higher", () => {
    const pieces = plan("piano").placements;
    const blackKeys = pieces.filter(
      (piece) => piece.colorId === "charcoal" && piece.modelId === "tile-1x1",
    );
    const whiteKeys = pieces.filter(
      (piece) =>
        piece.colorId === "ivory" &&
        ["tile-1x2", "plate-1x2"].includes(piece.modelId) &&
        piece.rotation === 0,
    );
    expect(whiteKeys).toHaveLength(6);
    expect(blackKeys).toHaveLength(3);
    for (const black of blackKeys) {
      const white = whiteKeys.find((piece) => piece.x === black.x)!;
      expect(black.z - white.z).toBe(1);
      expect(black.y).toBe(white.y);
      expect(black.y + size(black).depth).toBeLessThan(
        white.y + size(white).depth,
      );
    }
  });

  it("centres the sand waist while the upper half widens away from it", () => {
    const sand = plan("hourglass").placements.filter(
      (piece) => piece.colorId === "yellow",
    );
    const waist = sand.find(
      (piece) => piece.modelId === "brick-1x2" && piece.z === 5,
    )!;
    const widths: number[] = [];
    for (const z of [1, 8, 12]) {
      const course = sand.filter((piece) => piece.z === z);
      const minX = Math.min(...course.map((piece) => piece.x));
      const maxX = Math.max(
        ...course.map((piece) => piece.x + size(piece).width),
      );
      expect((minX + maxX) / 2).toBe(waist.x + size(waist).width / 2);
      widths.push(maxX - minX);
    }
    expect(widths).toEqual([5, 3, 5]);
    expect(size(waist).width).toBeLessThan(widths[1]);
    expect(
      plan("hourglass")
        .placements.filter((piece) => piece.colorId === "brown")
        .every((piece) => size(piece).width === 1 && size(piece).depth === 1),
    ).toBe(true);
  });

  it("gives the fir three decreasing crowns with depth, above a visible trunk", () => {
    const tree = plan("tree").placements;
    const foliagePlates = tree.filter(
      (piece) =>
        piece.colorId === "green" && piece.modelId.startsWith("plate-"),
    );
    const crowns = [6, 4, 2].map((span) => {
      const branches = foliagePlates.filter(
        (piece) => Math.max(size(piece).width, size(piece).depth) === span,
      );
      return {
        width:
          Math.max(...branches.map((piece) => piece.x + size(piece).width)) -
          Math.min(...branches.map((piece) => piece.x)),
        depth:
          Math.max(...branches.map((piece) => piece.y + size(piece).depth)) -
          Math.min(...branches.map((piece) => piece.y)),
      };
    });
    expect(crowns).toEqual([
      { width: 6, depth: 6 },
      { width: 4, depth: 4 },
      { width: 2, depth: 2 },
    ]);
    expect(Math.min(...foliagePlates.map((piece) => piece.z))).toBeGreaterThan(
      3,
    );
    expect(
      tree.some(
        (piece) => piece.colorId === "brown" && piece.modelId === "round-2x2",
      ),
    ).toBe(true);
  });

  it("gives the dinosaur four separated feet, a long body and side-facing eyes", () => {
    const dinosaur = plan("dinosaur").placements;
    const feet = dinosaur.filter((piece) => piece.z === 0);
    expect(feet).toHaveLength(4);
    expect(new Set(feet.map((piece) => piece.x)).size).toBe(2);
    expect(new Set(feet.map((piece) => piece.y)).size).toBe(2);
    expect(
      Math.max(...feet.map((piece) => piece.x)) -
        Math.min(...feet.map((piece) => piece.x)),
    ).toBeGreaterThan(
      Math.max(...feet.map((piece) => piece.y)) -
        Math.min(...feet.map((piece) => piece.y)),
    );
    const eyes = dinosaur.filter((piece) => piece.colorId === "charcoal");
    expect(eyes).toHaveLength(2);
    expect(eyes.every((piece) => piece.modelId === "brick-1x1")).toBe(true);
    expect(eyes[0].x).toBe(eyes[1].x);
    expect(eyes[0].y).not.toBe(eyes[1].y);
  });

  it("gives the cup a vertical handle projecting from the side rather than across the front", () => {
    const cup = plan("cup").placements;
    const handle = cup.find((piece) => piece.modelId.startsWith("arch-"))!;
    const coffee = cup.find(
      (piece) => piece.modelId === "tile-2x2" && piece.colorId === "brown",
    )!;
    expect(size(handle).width).toBeGreaterThan(size(handle).depth);
    expect(handle.x).toBeGreaterThanOrEqual(coffee.x + size(coffee).width);
    expect(handle.z).toBeGreaterThan(0);
    expect(handle.z).toBeLessThan(coffee.z);
  });

  it("leaves a two-stud passage between the beginner bridge guardrails", () => {
    const bridge = plan("starter-bridge");
    const rails = bridge.placements.filter(
      (piece) => piece.modelId === "brick-1x4",
    );
    expect(rails).toHaveLength(2);
    expect(rails[0].y).toBe(rails[1].y);
    expect(rails[1].x - (rails[0].x + size(rails[0]).width)).toBe(2);
    expect(rails.every((rail) => size(rail).depth > size(rail).width)).toBe(
      true,
    );
    expect(bridge.placements.every((piece) => !piece.colorId)).toBe(true);
  });
});
