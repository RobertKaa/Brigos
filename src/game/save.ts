import {
  BOX_IDS,
  BOX_DROP_COUNT,
  BRIGO_BY_ID,
  RARITIES,
  RECIPE_BY_ID,
  pieceCount,
} from "./catalog";
import type { BoxId, Recipe, Requirement, Weights } from "./catalog";
import {
  GameError,
  MAX_VALUE,
  createGame,
  recipeProgress,
  validateWeights,
} from "./engine";
import type { Construction, GameState, Opening } from "./engine";
import {
  LEGACY_REQUIREMENTS,
  V2_RECIPE_IDS,
  V2_TREE_REQUIREMENTS,
} from "./legacyRecipes";
import { ACHIEVEMENT_IDS } from "./progression";
import { V3_RECIPE_SNAPSHOTS } from "./v3RecipeSnapshots";
import type { RecipeSnapshot } from "./v3RecipeSnapshots";
import { V4_RECIPE_SNAPSHOTS } from "./v4RecipeSnapshots";
import type { V4RecipeSnapshot } from "./v4RecipeSnapshots";
import { V5_RECIPE_SNAPSHOTS } from "./v5RecipeSnapshots";
import { CURRENT_SAVE_VERSION } from "./releaseVersion";
import { parseEngagement } from "./engagement";
import { parseSandboxProjects } from "./sandbox";
import {
  observeProduction,
  parseProduction,
  migrateV9Production,
} from "./production";

export const SAVE_IMPORT_MAX_BYTES = 3_000_000;

const v3Snapshots: Readonly<Record<string, RecipeSnapshot>> =
  V3_RECIPE_SNAPSHOTS;
const v4Snapshots: Readonly<Record<string, V4RecipeSnapshot>> =
  V4_RECIPE_SNAPSHOTS;

export interface SaveMigration {
  refundedConstructions: number;
  returnedPieces: number;
  clearedGoal: boolean;
}

const geometrySignature = (recipe: Recipe): string =>
  JSON.stringify(
    recipe.placements
      .map((p) => [p.modelId, p.colorId ?? null, p.x, p.y, p.z, p.rotation])
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b), "en")),
  );

const materialsSignature = (requirements: readonly Readonly<Requirement>[]) =>
  JSON.stringify(
    requirements
      .map((r) => [
        r.modelId ?? null,
        r.family ?? null,
        r.colorId ?? null,
        r.quantity,
      ])
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b), "en")),
  );

function historicalRequirements(
  recipeId: string,
  sourceVersion: number,
): readonly Readonly<Requirement>[] | undefined {
  if (sourceVersion === 1)
    return Object.hasOwn(LEGACY_REQUIREMENTS, recipeId)
      ? LEGACY_REQUIREMENTS[recipeId]
      : undefined;
  if (sourceVersion === 2 && !V2_RECIPE_IDS.has(recipeId)) return undefined;
  if (sourceVersion === 2 && recipeId === "tree") return V2_TREE_REQUIREMENTS;
  if (sourceVersion <= 3)
    return Object.hasOwn(v3Snapshots, recipeId)
      ? v3Snapshots[recipeId].requirements
      : undefined;
  if (sourceVersion === 4)
    return Object.hasOwn(v4Snapshots, recipeId)
      ? v4Snapshots[recipeId].requirements
      : undefined;
  if (sourceVersion === 5)
    return Object.hasOwn(V5_RECIPE_SNAPSHOTS, recipeId)
      ? V5_RECIPE_SNAPSHOTS[recipeId].requirements
      : undefined;
  return RECIPE_BY_ID.get(recipeId)?.requirements;
}

function shouldRefund(recipeId: string, sourceVersion: number): boolean {
  if (sourceVersion === 1) return true;
  if (sourceVersion === 2 && recipeId === "tree") return true;
  // v7 and v8 only add player metadata. Blueprints are exactly those of v6.
  if (sourceVersion >= 6) return false;
  const recipe = RECIPE_BY_ID.get(recipeId);
  const snapshot =
    sourceVersion === 5
      ? V5_RECIPE_SNAPSHOTS[recipeId]
      : sourceVersion === 4
        ? v4Snapshots[recipeId]
        : v3Snapshots[recipeId];
  const historicalGeometry =
    sourceVersion === 5
      ? geometrySignature(V5_RECIPE_SNAPSHOTS[recipeId])
      : (snapshot as RecipeSnapshot | V4RecipeSnapshot).geometry;
  return (
    !recipe ||
    historicalGeometry !== geometrySignature(recipe) ||
    materialsSignature(snapshot.requirements) !==
      materialsSignature(recipe.requirements)
  );
}

const fail = (detail: string): never => {
  throw new GameError(`Sauvegarde invalide : ${detail}.`);
};
const record = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return fail("format incorrect");
  return value as Record<string, unknown>;
};
const integer = (value: unknown, max = MAX_VALUE): number => {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 0 ||
    value > max
  )
    return fail("quantité incorrecte");
  return value;
};
const boolean = (value: unknown): boolean => {
  if (typeof value !== "boolean") return fail("option incorrecte");
  return value;
};
const identifier = (value: unknown): string => {
  if (typeof value !== "string" || !/^[a-zA-Z0-9-]{1,80}$/.test(value))
    return fail("identifiant incorrect");
  return value;
};
const date = (value: unknown): string => {
  if (
    typeof value !== "string" ||
    value.length > 30 ||
    Number.isNaN(Date.parse(value))
  )
    return fail("date incorrecte");
  return new Date(value).toISOString();
};
const array = (value: unknown, max: number): unknown[] => {
  if (!Array.isArray(value) || value.length > max)
    return fail("liste trop grande ou incorrecte");
  return value;
};
const inventory = (value: unknown): Record<string, number> =>
  Object.fromEntries(
    Object.entries(record(value))
      .map(([id, count]) => {
        if (!BRIGO_BY_ID.has(id)) return fail("Brigo inconnu");
        return [id, integer(count)];
      })
      .filter(([, count]) => (count as number) > 0),
  );
const boxId = (value: unknown): BoxId => {
  if (
    typeof value !== "string" ||
    !(BOX_IDS as readonly string[]).includes(value)
  )
    return fail("boîte inconnue");
  return value as BoxId;
};
function opening(value: unknown): Opening {
  const item = record(value);
  // A saved opening is already credited. Keep its original five or ten cards;
  // never top up an old box when resuming it or importing its history.
  const sourceDrops = array(item.drops, BOX_DROP_COUNT);
  if (sourceDrops.length !== 5 && sourceDrops.length !== BOX_DROP_COUNT)
    return fail("une ouverture doit contenir cinq ou dix Brigos");
  const drops = sourceDrops.map((value) => {
    const drop = record(value);
    if (typeof drop.brigoId !== "string" || !BRIGO_BY_ID.has(drop.brigoId))
      return fail("Brigo inconnu");
    return { brigoId: drop.brigoId, isNew: boolean(drop.isNew) };
  });
  if (
    item.testRarity !== undefined &&
    !(RARITIES as readonly unknown[]).includes(item.testRarity)
  )
    return fail("rareté de test inconnue");
  return {
    id: identifier(item.id),
    boxId: boxId(item.boxId),
    createdAt: date(item.createdAt),
    drops,
    ...(item.testRarity !== undefined
      ? { testRarity: item.testRarity as Opening["testRarity"] }
      : {}),
  };
}
function construction(value: unknown, sourceVersion: number): Construction {
  const item = record(value);
  if (typeof item.recipeId !== "string") return fail("construction inconnue");
  const requirements = historicalRequirements(item.recipeId, sourceVersion);
  if (!requirements) return fail("construction inconnue");
  const recipe: Recipe = {
    id: item.recipeId,
    name: "Validation de sauvegarde",
    description: "",
    color: "",
    difficulty: "Premiers pas",
    placements: [],
    requirements: requirements.map((requirement) => ({ ...requirement })),
  };
  const pieces = inventory(item.pieces);
  const count = Object.values(pieces).reduce(
    (sum, quantity) => sum + quantity,
    0,
  );
  if (
    count !== pieceCount(recipe) ||
    !recipeProgress({ ...createGame(), inventory: pieces }, recipe).canBuild
  )
    return fail("pièces incompatibles avec la construction");
  return {
    id: identifier(item.id),
    recipeId: item.recipeId,
    createdAt: date(item.createdAt),
    pieces,
  };
}
export function parseSaveResult(
  value: unknown,
  nowMs = Date.now(),
): {
  state: GameState;
  migration?: SaveMigration;
} {
  const data = record(value);
  if (
    data.version !== 1 &&
    data.version !== 2 &&
    data.version !== 3 &&
    data.version !== 4 &&
    data.version !== 5 &&
    data.version !== 6 &&
    data.version !== 7 &&
    data.version !== 8 &&
    data.version !== 9 &&
    data.version !== 10
  )
    return fail("version non prise en charge");
  if ((data.version as number) > CURRENT_SAVE_VERSION)
    return fail("version plus récente que cette application");
  // A briefly served development v4 had no revision marker. Its plans were
  // still v3: validate against the frozen snapshot, never against revised data.
  if (
    (data.version === 4 &&
      data.planRevision !== undefined &&
      data.planRevision !== 1) ||
    ((data.version === 5 ||
      data.version === 6 ||
      data.version === 7 ||
      data.version === 8 ||
      data.version === 9 ||
      data.version === 10) &&
      data.planRevision !== 1)
  )
    return fail("révision de plans non prise en charge");
  const sourceVersion =
    data.version === 4 && data.planRevision === undefined ? 3 : data.version;
  const legacy = sourceVersion === 1;
  if (data.version >= 7 && data.engagement === undefined)
    return fail("carnet quotidien manquant");
  const sandboxProjects =
    data.version >= 8
      ? parseSandboxProjects(data.sandboxProjects)
      : parseSandboxProjects(data.sandboxProjects ?? []);
  if (data.version < 8 && sandboxProjects.length)
    return fail("créations libres incompatibles avec cette ancienne version");
  if (data.version < 9 && data.production !== undefined) {
    const legacyProduction = record(data.production);
    if (
      legacyProduction.observedAt !== 0 ||
      Object.keys(record(legacyProduction.entries)).length
    )
      return fail("production incompatible avec cette ancienne version");
  }
  const boxes = record(data.boxes);
  const rates = record(data.rates);
  const preferences = record(data.preferences);
  const discovered = array(data.discovered, BRIGO_BY_ID.size).map((id) => {
    if (typeof id !== "string" || !BRIGO_BY_ID.has(id))
      return fail("Brigo découvert inconnu");
    return id;
  });
  if (new Set(discovered).size !== discovered.length)
    return fail("découvertes en double");
  const constructions = array(data.constructions, 1000).map((item) =>
    construction(item, sourceVersion as number),
  );
  if (
    new Set(constructions.map((item) => item.id)).size !== constructions.length
  )
    return fail("constructions en double");
  const history = array(data.history, 30).map(opening);
  if (new Set(history.map((item) => item.id)).size !== history.length)
    return fail("ouvertures en double");
  const parsedRates = Object.fromEntries(
    BOX_IDS.map((id) => {
      const input = record(rates[id]);
      const weights = Object.fromEntries(
        RARITIES.map((rarity) => [rarity, input[rarity]]),
      ) as Weights;
      if (!validateWeights(weights)) return fail("probabilités incorrectes");
      return [id, weights];
    }),
  ) as Record<BoxId, Weights>;
  const parsedInventory = inventory(data.inventory);
  const known = new Set(discovered);
  const allPieces = [
    ...Object.keys(parsedInventory),
    ...constructions.flatMap((item) => Object.keys(item.pieces)),
    ...sandboxProjects.flatMap((project) =>
      project.placements.map((piece) => piece.brigoId),
    ),
    ...history.flatMap((item) => item.drops.map((drop) => drop.brigoId)),
  ];
  if (allPieces.some((id) => !known.has(id))) return fail("album incomplet");
  // Old drawings used incompatible assemblies. Return the exact reserved pieces
  // once, rather than silently changing materials or dropping the user's save.
  // Compare each blueprint once even when the gallery contains many copies.
  // Large published plans can contain thousands of placements.
  const revisedRecipes = new Set(
    [...new Set(constructions.map((built) => built.recipeId))].filter(
      (recipeId) => shouldRefund(recipeId, sourceVersion as number),
    ),
  );
  const refunded = constructions.filter((built) =>
    revisedRecipes.has(built.recipeId),
  );
  if (refunded.length) {
    for (const built of refunded) {
      for (const [id, count] of Object.entries(built.pieces)) {
        const restored = (parsedInventory[id] ?? 0) + count;
        if (restored > MAX_VALUE)
          return fail("remboursement au-delà de la limite d’inventaire");
        parsedInventory[id] = restored;
      }
    }
  }
  let goalRecipeId = legacy ? null : data.goalRecipeId;
  const historicalGoal =
    typeof goalRecipeId === "string" &&
    !!historicalRequirements(goalRecipeId, sourceVersion as number);
  const clearedGoal =
    !legacy && historicalGoal && !RECIPE_BY_ID.has(goalRecipeId as string);
  if (clearedGoal) goalRecipeId = null;
  if (
    goalRecipeId !== null &&
    (typeof goalRecipeId !== "string" ||
      !historicalGoal ||
      !RECIPE_BY_ID.has(goalRecipeId))
  )
    return fail("objectif inconnu");
  const claimedAchievements =
    data.version >= 3
      ? array(data.claimedAchievements, ACHIEVEMENT_IDS.length).map((id) => {
          if (
            typeof id !== "string" ||
            !(ACHIEVEMENT_IDS as readonly string[]).includes(id)
          )
            return fail("défi inconnu");
          return id;
        })
      : [];
  if (new Set(claimedAchievements).size !== claimedAchievements.length)
    return fail("défis en double");
  const lastVisitRewardAt =
    data.version >= 3 && data.lastVisitRewardAt !== null
      ? date(data.lastVisitRewardAt)
      : null;
  const boxesOpened = integer(data.boxesOpened);
  if (boxesOpened < history.length)
    return fail("nombre d’ouvertures incohérent");
  let pendingOpening: Opening | null = null;
  if (data.pendingOpening !== null) {
    const pending = opening(data.pendingOpening);
    const existing = history.find((item) => item.id === pending.id);
    if (!existing || JSON.stringify(existing) !== JSON.stringify(pending))
      return fail("ouverture en cours incohérente");
    pendingOpening = existing;
  }
  let state: GameState = {
    version: CURRENT_SAVE_VERSION,
    planRevision: 1,
    coins: integer(data.coins),
    boxes: Object.fromEntries(
      BOX_IDS.map((id) => [id, integer(boxes[id])]),
    ) as Record<BoxId, number>,
    inventory: parsedInventory,
    discovered,
    sandboxProjects,
    constructions: constructions.filter(
      (built) => !revisedRecipes.has(built.recipeId),
    ),
    history,
    pendingOpening,
    boxesOpened,
    rates: parsedRates,
    goalRecipeId,
    claimedAchievements,
    lastVisitRewardAt,
    engagement: parseEngagement(
      data.engagement,
      lastVisitRewardAt,
      boxesOpened,
    ),
    preferences: {
      sound: boolean(preferences.sound),
      reducedMotion: boolean(preferences.reducedMotion),
    },
  };
  if (CURRENT_SAVE_VERSION >= 10) {
    state =
      data.version >= 10
        ? {
            ...state,
            production: parseProduction(
              data.production,
              state.constructions,
              nowMs,
            ),
          }
        : data.version === 9
          ? {
              ...state,
              production: migrateV9Production(
                data.production,
                state.constructions,
                nowMs,
              ),
            }
          : observeProduction(state, nowMs);
  } else if (data.production !== undefined) {
    // A release switch can retain neutral future metadata. Older formats reject
    // nonempty ledgers above and must never activate this reward system.
    state = { ...state, production: { observedAt: 0, entries: {} } };
  }
  return {
    state,
    ...((refunded.length > 0 || clearedGoal) && {
      migration: {
        refundedConstructions: refunded.length,
        returnedPieces: refunded.reduce(
          (sum, built) =>
            sum +
            Object.values(built.pieces).reduce((s, count) => s + count, 0),
          0,
        ),
        clearedGoal,
      },
    }),
  };
}
export function parseSave(value: unknown): GameState {
  return parseSaveResult(value).state;
}
export function importSave(text: string): GameState {
  if (
    text.length > SAVE_IMPORT_MAX_BYTES ||
    new TextEncoder().encode(text).byteLength > SAVE_IMPORT_MAX_BYTES
  )
    return fail("fichier trop volumineux (3 Mo maximum)");
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return fail("le fichier n’est pas un JSON valide");
  }
  return parseSave(value);
}
