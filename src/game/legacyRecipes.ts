import type { Requirement } from "./catalog";

// Version 1 plans are retained only to validate and refund existing saves.
const part = (
  modelId: string,
  quantity: number,
  colorId?: Requirement["colorId"],
): Requirement => ({ modelId, quantity, colorId, label: "Ancien plan" });
export const LEGACY_REQUIREMENTS: Record<string, Requirement[]> = {
  totem: [{ family: "brick", quantity: 5, label: "Ancien totem" }],
  bench: [part("brick-1x2", 4), part("tile-1x4", 1)],
  tree: [
    part("brick-1x1", 1, "orange"),
    part("slope-2x2", 3, "mint"),
    part("plate-2x2", 1, "mint"),
  ],
  car: [
    part("plate-2x4", 1, "yellow"),
    part("brick-1x2", 2, "blue"),
    part("tile-1x2", 1, "charcoal"),
    part("round-1x1", 4, "charcoal"),
  ],
  house: [
    part("brick-1x2", 6, "coral"),
    part("brick-2x2", 2, "ivory"),
    part("slope-2x2", 4, "coral"),
    part("plate-4x4", 1, "blue"),
    part("special-window", 1, "ivory"),
  ],
  lighthouse: [
    part("round-2x2", 4, "ivory"),
    part("round-2x2", 2, "coral"),
    part("plate-2x2", 1, "blue"),
    part("tile-2x2", 1, "yellow"),
  ],
  robot: [
    part("brick-2x2", 1, "blue"),
    part("brick-1x2", 3, "ivory"),
    part("round-1x1", 2, "orange"),
    part("tile-1x2", 1, "charcoal"),
  ],
  bridge: [
    part("arch-1x4", 2, "ivory"),
    part("plate-2x4", 2, "blue"),
    part("tile-1x4", 2, "charcoal"),
  ],
  rocket: [
    part("round-2x2", 3, "ivory"),
    part("slope-2x2", 2, "coral"),
    part("round-1x1", 1, "orange"),
    part("plate-2x2", 1, "blue"),
  ],
};
export const V2_TREE_REQUIREMENTS: Requirement[] = [
  part("plate-4x4", 1, "ivory"),
  part("brick-2x2", 1, "orange"),
  part("plate-6x6", 1, "mint"),
  part("brick-2x2", 2, "mint"),
  part("plate-4x4", 1, "mint"),
  part("plate-2x2", 1, "mint"),
  part("round-1x1", 1, "mint"),
  part("slope-1x1", 1, "mint"),
];

// These are the fourteen plans shipped with schema v2. Later plans must not be
// accepted by an older schema, even if their ID now exists in the live catalog.
export const V2_RECIPE_IDS = new Set([
  "totem",
  "bench",
  "tree",
  "car",
  "house",
  "lighthouse",
  "robot",
  "bridge",
  "rocket",
  "castle",
  "dinosaur",
  "cafe",
  "spaceship",
  "mosaic",
]);
