// Frozen from the 65 published v5 recipes before any construction review.
// Packed indexes reduce shipped data; the complete originals are reconstructed
// independently from the current catalog or assembly generators.
import packedData from "./v5RecipeSnapshots.data.json";
import type { ColorId, Recipe } from "./catalog";
import type { AssemblyRotation, AssemblySpec } from "./assemblies";

export type V5RecipeSnapshot = Recipe;
interface PackedLibrary {
  models: string[];
  colors: (ColorId | null)[];
  keys: string[];
  recipes: Record<
    string,
    Omit<Recipe, "placements"> & {
      placements: [
        number,
        number,
        number,
        number,
        number,
        AssemblyRotation,
        number,
      ][];
    }
  >;
}
const packed = packedData as unknown as PackedLibrary;
export const V5_RECIPE_SNAPSHOTS: Readonly<Record<string, V5RecipeSnapshot>> =
  Object.fromEntries(
    Object.entries(packed.recipes).map(([id, { placements, ...metadata }]) => [
      id,
      {
        ...metadata,
        requirements: metadata.requirements.map((requirement) => ({
          ...requirement,
        })),
        placements: placements.map(
          ([model, color, x, y, z, rotation, key]) => ({
            key: packed.keys[key],
            modelId: packed.models[model],
            ...(packed.colors[color] ? { colorId: packed.colors[color]! } : {}),
            x,
            y,
            z,
            rotation,
          }),
        ),
      },
    ]),
  );
export const V5_ASSEMBLIES: AssemblySpec[] = Object.values(
  V5_RECIPE_SNAPSHOTS,
).map(({ requirements: _requirements, ...assembly }) => ({
  ...assembly,
  placements: assembly.placements.map((placement) => ({ ...placement })),
}));
