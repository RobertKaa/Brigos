import type { ColorId, Recipe } from "../catalog";

export type AssemblyRotation = 0 | 90 | 180 | 270;

/** Brigo XY grid and plate-height Z units; only axles may use validated half-steps. */
export interface AssemblyPlacement {
  key: string;
  modelId: string;
  colorId?: ColorId;
  x: number;
  y: number;
  z: number;
  rotation: AssemblyRotation;
}

export interface AssemblySpec {
  id: string;
  name: string;
  description: string;
  difficulty: Recipe["difficulty"];
  theme?: Recipe["theme"];
  color: string;
  placements: AssemblyPlacement[];
  previewRotation?: AssemblyRotation;
}

type AddPart = (
  modelId: string,
  colorId: ColorId | undefined,
  x: number,
  y: number,
  z: number,
  rotation?: AssemblyRotation,
) => void;

export function layout(build: (add: AddPart) => void): AssemblyPlacement[] {
  const pieces: AssemblyPlacement[] = [];
  build((modelId, colorId, x, y, z, rotation = 0) => {
    pieces.push({
      key: `piece-${String(pieces.length + 1).padStart(3, "0")}`,
      modelId,
      ...(colorId ? { colorId } : {}),
      x,
      y,
      z,
      rotation,
    });
  });
  // The instructions always place a support before the piece that clips onto it.
  return pieces.sort((a, b) => a.z - b.z || a.x + a.y - b.x - b.y);
}
