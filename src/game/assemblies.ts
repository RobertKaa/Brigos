import { NATURE_ASSEMBLIES } from "./assemblies/nature";
import { OBJECTS_ASSEMBLIES } from "./assemblies/objects";
import { ARCHITECTURE_ASSEMBLIES } from "./assemblies/architecture";
import { VEHICLES_ASSEMBLIES } from "./assemblies/vehicles";
import { LEGENDARY_GARDEN_ASSEMBLIES } from "./assemblies/legendaryGardens";
import { LEGENDARY_ARCHITECTURE_ASSEMBLIES } from "./assemblies/legendaryArchitecture";
import { INTERMEDIATE_ARCHITECTURE_ASSEMBLIES } from "./assemblies/intermediateArchitecture";
import { INTERMEDIATE_WORLD_ASSEMBLIES } from "./assemblies/intermediateWorlds";
import { WHEELED_ASSEMBLIES } from "./assemblies/wheeled";
import { ARTICULATED_ASSEMBLIES } from "./assemblies/articulated";
import { CURRENT_SAVE_VERSION } from "./releaseVersion";
import { V5_ASSEMBLIES } from "./v5RecipeSnapshots";
export type {
  AssemblyPlacement,
  AssemblyRotation,
  AssemblySpec,
} from "./assemblies/layout";

const order = [
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
  "mushroom",
  "flower",
  "penguin",
  "duck",
  "snail",
  "turtle",
  "boat",
  "airplane",
  "submarine",
  "well",
  "mailbox",
  "hourglass",
  "arcade",
  "piano",
  "library",
  "greenhouse",
  "pagoda",
  "chalet",
  "spacegate",
  "windmill",
  "armchair",
  "pyramid",
  "starter-bridge",
];
const all = [
  ...NATURE_ASSEMBLIES.map((assembly) => ({
    ...assembly,
    theme: "nature" as const,
  })),
  ...OBJECTS_ASSEMBLIES.map((assembly) => ({
    ...assembly,
    theme: "objects" as const,
  })),
  ...ARCHITECTURE_ASSEMBLIES.map((assembly) => ({
    ...assembly,
    theme: "architecture" as const,
  })),
  ...VEHICLES_ASSEMBLIES.map((assembly) => ({
    ...assembly,
    theme: "vehicles" as const,
  })),
  ...LEGENDARY_GARDEN_ASSEMBLIES.map((assembly) => ({
    ...assembly,
    theme: "nature" as const,
  })),
  ...LEGENDARY_ARCHITECTURE_ASSEMBLIES.map((assembly) => ({
    ...assembly,
    theme: "architecture" as const,
  })),
  ...INTERMEDIATE_ARCHITECTURE_ASSEMBLIES.map((assembly) => ({
    ...assembly,
    theme: "architecture" as const,
  })),
  ...INTERMEDIATE_WORLD_ASSEMBLIES,
  ...WHEELED_ASSEMBLIES,
  ...ARTICULATED_ASSEMBLIES,
];
// Existing identifiers keep their place; new plans are appended after the series.
export const ASSEMBLIES = (
  CURRENT_SAVE_VERSION === 5 ? V5_ASSEMBLIES : all
).sort(
  (a, b) =>
    (order.includes(a.id) ? order.indexOf(a.id) : order.length) -
    (order.includes(b.id) ? order.indexOf(b.id) : order.length),
);
