import { ASSEMBLIES } from "./assemblies";
import type { AssemblyPlacement } from "./assemblies";
export const BOX_DROP_COUNT = 10;
export const RARITIES = [
  "common",
  "uncommon",
  "rare",
  "epic",
  "legendary",
] as const;
export type Rarity = (typeof RARITIES)[number];

export const RARITY_INFO: Record<
  Rarity,
  { name: string; color: string; symbol: string }
> = {
  common: { name: "Commun", color: "#697785", symbol: "●" },
  uncommon: { name: "Peu commun", color: "#27846d", symbol: "◆" },
  rare: { name: "Rare", color: "#3979c4", symbol: "✦" },
  epic: { name: "Épique", color: "#9865c5", symbol: "✧" },
  legendary: { name: "Légendaire", color: "#a36b08", symbol: "★" },
};

export const COLORS = [
  { id: "coral", name: "Corail", hex: "#ee6558" },
  { id: "yellow", name: "Soleil", hex: "#f9c449" },
  { id: "blue", name: "Océan", hex: "#548bd8" },
  { id: "mint", name: "Menthe", hex: "#58b89c" },
  { id: "violet", name: "Iris", hex: "#a78ad2" },
  { id: "orange", name: "Mandarine", hex: "#ed954c" },
  { id: "ivory", name: "Nuage", hex: "#e5e6e5" },
  { id: "charcoal", name: "Graphite", hex: "#4e5b6d" },
  { id: "brown", name: "Noisette", hex: "#9b6a47" },
  { id: "green", name: "Feuille", hex: "#479257" },
] as const;
export type ColorId = (typeof COLORS)[number]["id"];
export type Family =
  "brick" | "plate" | "tile" | "slope" | "round" | "arch" | "special";
export type Shape =
  | "block"
  | "slope"
  | "round"
  | "cone"
  | "arch"
  | "corner"
  | "window"
  | "door"
  | "cross"
  | "wheel"
  | "axle"
  | "bearing"
  | "hinge";
export const FAMILY_NAMES: Record<Family, string> = {
  brick: "Briques",
  plate: "Plaques",
  tile: "Tuiles",
  slope: "Pentes",
  round: "Arrondis",
  arch: "Arches",
  special: "Spéciales",
};

export interface BrigoModel {
  id: string;
  name: string;
  family: Family;
  shape: Shape;
  width: number;
  depth: number;
  height: number;
  studs: boolean;
  tier: number;
  archived?: boolean;
}
export interface Brigo {
  id: string;
  number: number;
  model: BrigoModel;
  color: (typeof COLORS)[number];
  rarity: Rarity;
  name: string;
}

const models = (
  family: Family,
  name: string,
  sizes: [number, number, number][],
  height: number,
  shape: Shape = "block",
  studs = true,
): BrigoModel[] =>
  sizes.map(([width, depth, tier]) => ({
    id: `${family}-${width}x${depth}`,
    name: `${name} ${width} × ${depth}`,
    family,
    shape,
    width,
    depth,
    height,
    studs,
    tier,
  }));

export const MODELS: BrigoModel[] = [
  ...models(
    "brick",
    "Brique",
    [
      [1, 1, 0],
      [1, 2, 0],
      [1, 3, 0],
      [1, 4, 0],
      [2, 2, 0],
      [2, 3, 0],
      [2, 4, 0],
      [2, 6, 1],
    ],
    3,
  ),
  ...models(
    "plate",
    "Plaque",
    [
      [1, 1, 0],
      [1, 2, 0],
      [1, 3, 0],
      [1, 4, 0],
      [2, 2, 0],
      [2, 3, 0],
      [2, 4, 0],
      [4, 4, 1],
    ],
    1,
  ),
  ...models(
    "tile",
    "Tuile",
    [
      [1, 1, 0],
      [1, 2, 1],
      [1, 3, 1],
      [1, 4, 1],
      [2, 2, 1],
      [2, 4, 1],
    ],
    1,
    "block",
    false,
  ),
  ...models(
    "slope",
    "Pente",
    [
      [1, 1, 1],
      [1, 2, 1],
      [1, 3, 2],
      [2, 2, 1],
      [2, 3, 2],
      [2, 4, 2],
    ],
    3,
    "slope",
    false,
  ),
  ...models(
    "round",
    "Arrondi",
    [
      [1, 1, 1],
      [2, 2, 1],
      [1, 2, 2],
      [4, 4, 2],
    ],
    3,
    "round",
  ),
  ...models(
    "arch",
    "Arche",
    [
      [1, 3, 2],
      [1, 4, 2],
      [1, 6, 3],
      [2, 4, 2],
    ],
    6,
    "arch",
  ),
  {
    id: "special-corner",
    name: "Angle 2 × 2",
    family: "special",
    shape: "corner",
    width: 2,
    depth: 2,
    height: 3,
    studs: true,
    tier: 1,
  },
  {
    id: "special-window",
    name: "Fenêtre 1 × 2",
    family: "special",
    shape: "window",
    width: 1,
    depth: 2,
    height: 6,
    studs: true,
    tier: 2,
  },
  {
    id: "special-door",
    name: "Porte 1 × 3",
    family: "special",
    shape: "door",
    width: 1,
    depth: 3,
    height: 9,
    studs: true,
    tier: 3,
  },
  {
    id: "special-cross",
    name: "Étoile 3 × 3",
    family: "special",
    shape: "cross",
    width: 3,
    depth: 3,
    height: 1,
    studs: true,
    tier: 4,
  },
  ...models(
    "brick",
    "Brique",
    [
      [1, 6, 1],
      [1, 8, 1],
      [2, 8, 1],
      [3, 3, 1],
      [3, 4, 1],
      [4, 4, 1],
    ],
    3,
  ),
  ...models(
    "plate",
    "Plaque",
    [
      [2, 6, 1],
      [2, 8, 1],
      [4, 6, 1],
      [6, 6, 2],
    ],
    1,
  ),
  ...models("tile", "Tuile", [[4, 4, 2]], 1, "block", false),
  ...([2, 4, 6] as const).map((size, index): BrigoModel => ({
    id: `cone-${size}x${size}`,
    name: `Cône ${size} × ${size}`,
    family: "round",
    shape: "cone",
    width: size,
    depth: size,
    height: 6,
    studs: size > 2,
    tier: index + 1,
    archived: true,
  })),
  // New references are append-only: existing collection numbers and saves keep
  // their identity. These mechanisms use the original Brigo faceted language.
  {
    id: "special-wheel",
    name: "Roue Orbitale",
    family: "special",
    shape: "wheel",
    width: 1,
    depth: 2,
    height: 6,
    studs: false,
    tier: 2,
  },
  {
    id: "special-axle",
    name: "Essieu Traverse",
    family: "special",
    shape: "axle",
    width: 4,
    depth: 1,
    height: 1,
    studs: false,
    tier: 1,
  },
  {
    id: "special-hinge",
    name: "Articulation Éclat",
    family: "special",
    shape: "hinge",
    width: 2,
    depth: 2,
    height: 2,
    studs: true,
    tier: 3,
  },
  {
    id: "special-bearing",
    name: "Palier Losange",
    family: "special",
    shape: "bearing",
    width: 2,
    depth: 2,
    height: 2,
    studs: true,
    tier: 1,
  },
];

// Historical editions stay in place when either the palette or models grow.
const editions = [
  { models: MODELS.slice(0, 51), colors: COLORS.slice(0, 8) },
  { models: MODELS.slice(0, 51), colors: COLORS.slice(8) },
  { models: MODELS.slice(51), colors: COLORS },
];
let referenceNumber = 0;
export const CATALOG: Brigo[] = editions.flatMap((edition) =>
  edition.models.flatMap((model) =>
    edition.colors.map((color) => ({
      id: `${model.id}:${color.id}`,
      number: ++referenceNumber,
      model,
      color,
      rarity: RARITIES[model.tier],
      name: `${model.name} · ${color.name}`,
    })),
  ),
);
export const BRIGO_BY_ID = new Map(CATALOG.map((brigo) => [brigo.id, brigo]));
export const ACTIVE_CATALOG = CATALOG.filter((brigo) => !brigo.model.archived);
export const albumCatalog = (discovered: readonly string[]) => {
  const known = new Set(discovered);
  return CATALOG.filter(
    (brigo) => !brigo.model.archived || known.has(brigo.id),
  );
};
export const BY_RARITY = Object.fromEntries(
  RARITIES.map((rarity) => [
    rarity,
    ACTIVE_CATALOG.filter((brigo) => brigo.rarity === rarity),
  ]),
) as Record<Rarity, Brigo[]>;

export const BOX_IDS = ["discovery", "workshop", "prism"] as const;
export type BoxId = (typeof BOX_IDS)[number];
export type Weights = Record<Rarity, number>;
export const BOXES: Record<
  BoxId,
  {
    name: string;
    subtitle: string;
    cost: number;
    color: string;
    /** Shared illustrated packaging; colour indicates the range, never a guaranteed drop. */
    palette: { shadow: string; light: string; trim: string; accent: string };
    weights: Weights;
  }
> = {
  discovery: {
    name: "Découverte",
    subtitle: "Le début d’une grande collection.",
    cost: 100,
    color: "#b6c2d0",
    palette: {
      shadow: "#607082",
      light: "#e4eaf0",
      trim: "#4e5d6e",
      accent: RARITY_INFO.common.color,
    },
    weights: { common: 58, uncommon: 26, rare: 11, epic: 4, legendary: 1 },
  },
  workshop: {
    name: "Atelier",
    subtitle: "De nouvelles idées à assembler.",
    cost: 250,
    color: "#86b9ed",
    palette: {
      shadow: "#3a6ea6",
      light: "#d7e9fc",
      trim: "#2d5e9d",
      accent: RARITY_INFO.rare.color,
    },
    weights: { common: 30, uncommon: 36, rare: 22, epic: 10, legendary: 2 },
  },
  prism: {
    name: "Prisme",
    subtitle: "La surprise prend des couleurs.",
    cost: 500,
    color: "#bd94e2",
    palette: {
      shadow: "#78529e",
      light: "#ebdafa",
      trim: "#e9bf62",
      accent: RARITY_INFO.epic.color,
    },
    weights: { common: 10, uncommon: 30, rare: 35, epic: 20, legendary: 5 },
  },
};

export interface Requirement {
  label: string;
  quantity: number;
  modelId?: string;
  family?: Family;
  colorId?: ColorId;
}
export interface Recipe {
  id: string;
  name: string;
  description: string;
  difficulty: "Premiers pas" | "Créatif" | "Expert" | "Légendaire";
  color: string;
  requirements: Requirement[];
  placements: AssemblyPlacement[];
  theme?: keyof typeof RECIPE_THEMES;
  /** Camera offset only; this does not change the physical plan or saved pieces. */
  previewRotation?: 0 | 90 | 180 | 270;
}
export const RECIPE_THEMES = {
  nature: "Nature",
  objects: "Objets",
  architecture: "Lieux",
  vehicles: "Véhicules",
};
const need = (
  modelId: string,
  quantity: number,
  colorId?: ColorId,
): Requirement => ({
  modelId,
  quantity,
  colorId,
  label: `${MODELS.find((model) => model.id === modelId)!.name}${colorId ? ` · ${COLORS.find((color) => color.id === colorId)!.name}` : " · couleur libre"}`,
});
export const RECIPES: Recipe[] = ASSEMBLIES.map((assembly) => {
  const grouped = new Map<string, Requirement>();
  for (const placement of assembly.placements) {
    const key = `${placement.modelId}:${placement.colorId ?? "any"}`;
    const existing = grouped.get(key);
    if (existing) existing.quantity++;
    else grouped.set(key, need(placement.modelId, 1, placement.colorId));
  }
  return { ...assembly, requirements: [...grouped.values()] };
});
export const RECIPE_BY_ID = new Map(
  RECIPES.map((recipe) => [recipe.id, recipe]),
);
export const pieceCount = (recipe: Recipe) =>
  recipe.requirements.reduce(
    (sum, requirement) => sum + requirement.quantity,
    0,
  );
