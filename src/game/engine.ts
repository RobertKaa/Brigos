import {
  BOXES,
  BOX_DROP_COUNT,
  BOX_IDS,
  BRIGO_BY_ID,
  BY_RARITY,
  CATALOG,
  RARITIES,
  RECIPES,
  RECIPE_BY_ID,
  pieceCount,
} from "./catalog";
import type {
  BoxId,
  Brigo,
  Rarity,
  Recipe,
  Requirement,
  Weights,
} from "./catalog";
import { CURRENT_SAVE_VERSION } from "./releaseVersion";
import type { EngagementState } from "./engagement";
import type { SandboxProject } from "./sandbox";
import { collectProduction, observeProduction } from "./production";
import type { ProductionState } from "./production";

export interface Drop {
  brigoId: string;
  isNew: boolean;
}
export interface Opening {
  id: string;
  boxId: BoxId;
  createdAt: string;
  drops: Drop[];
  testRarity?: Rarity;
}
export interface Construction {
  id: string;
  recipeId: string;
  createdAt: string;
  pieces: Record<string, number>;
}
export interface GameState {
  version: 5 | 6 | 7 | 8 | 9 | 10;
  planRevision: 1;
  coins: number;
  boxes: Record<BoxId, number>;
  inventory: Record<string, number>;
  discovered: string[];
  constructions: Construction[];
  history: Opening[];
  pendingOpening: Opening | null;
  boxesOpened: number;
  rates: Record<BoxId, Weights>;
  preferences: { sound: boolean; reducedMotion: boolean };
  goalRecipeId: string | null;
  claimedAchievements: string[];
  lastVisitRewardAt: string | null;
  /** Optional only for retained snapshots from before the daily journal. */
  engagement?: EngagementState;
  /** Optional only for retained snapshots from before the creative sandbox. */
  sandboxProjects?: SandboxProject[];
  /** Optional for retained snapshots, initialized without retroactive rewards. */
  production?: ProductionState;
}
export class GameError extends Error {}
export const MAX_VALUE = 10_000_000;
export const defaultRates = (): Record<BoxId, Weights> =>
  Object.fromEntries(
    BOX_IDS.map((id) => [id, { ...BOXES[id].weights }]),
  ) as Record<BoxId, Weights>;
export const createGame = (): GameState => ({
  version: CURRENT_SAVE_VERSION,
  planRevision: 1,
  coins: 1200,
  boxes: { discovery: 3, workshop: 0, prism: 0 },
  inventory: {},
  discovered: [],
  constructions: [],
  sandboxProjects: [],
  production: { observedAt: 0, entries: {} },
  history: [],
  pendingOpening: null,
  boxesOpened: 0,
  rates: defaultRates(),
  preferences: { sound: false, reducedMotion: false },
  goalRecipeId: null,
  claimedAchievements: [],
  lastVisitRewardAt: null,
  engagement: {
    dayKey: null,
    openings: 0,
    visit: false,
    puzzleClaimed: false,
    claimedMissions: [],
    passport: { visits: 0, cycles: 0, lastVisitDay: null },
  },
});

export function validateWeights(weights: Weights): boolean {
  return (
    !!weights &&
    RARITIES.every(
      (rarity) =>
        Number.isFinite(weights[rarity]) &&
        weights[rarity] >= 0 &&
        weights[rarity] <= 100,
    ) &&
    Math.abs(RARITIES.reduce((sum, rarity) => sum + weights[rarity], 0) - 100) <
      0.000001
  );
}
export function secureRandom(): number {
  return (
    globalThis.crypto.getRandomValues(new Uint32Array(1))[0] / 4_294_967_296
  );
}
function nextRandom(random: () => number): number {
  const value = random();
  if (!Number.isFinite(value) || value < 0 || value >= 1)
    throw new GameError("Le tirage n’a pas pu être effectué. Réessayez.");
  return value;
}
export function drawRarity(
  weights: Weights,
  random: () => number = secureRandom,
): Rarity {
  if (!validateWeights(weights))
    throw new GameError("Les probabilités doivent totaliser 100 %.");
  const value = nextRandom(random);
  let cumulative = 0;
  for (const rarity of RARITIES) {
    cumulative += weights[rarity];
    if (value < cumulative / 100) return rarity;
  }
  return RARITIES.filter((rarity) => weights[rarity] > 0).at(-1)!;
}
export function openBox(
  state: GameState,
  boxId: BoxId,
  options: {
    random?: () => number;
    nowMs?: number;
    forcedRarity?: Rarity;
    adminEnabled?: boolean;
  } = {},
): GameState {
  if (!BOX_IDS.includes(boxId))
    throw new GameError("Cette boîte n’existe pas.");
  if (state.pendingOpening)
    throw new GameError("Terminez d’abord l’ouverture en cours.");
  if (
    options.forcedRarity &&
    (!options.adminEnabled || !RARITIES.includes(options.forcedRarity))
  )
    throw new GameError("Cette commande est réservée au mode admin local.");
  const free = state.boxes[boxId] > 0;
  if (!free && state.coins < BOXES[boxId].cost)
    throw new GameError("Il vous manque des pièces pour ouvrir cette boîte.");
  if (state.boxesOpened >= MAX_VALUE)
    throw new GameError(
      "La limite d’ouvertures de cette sauvegarde est atteinte.",
    );
  const random = options.random ?? secureRandom;
  const inventory = { ...state.inventory };
  const discovered = new Set(state.discovered);
  const drops: Drop[] = [];
  for (let index = 0; index < BOX_DROP_COUNT; index++) {
    const rarity =
      options.forcedRarity ?? drawRarity(state.rates[boxId], random);
    const pool = BY_RARITY[rarity];
    const brigo = pool[Math.floor(nextRandom(random) * pool.length)];
    if ((inventory[brigo.id] ?? 0) >= MAX_VALUE)
      throw new GameError("L’inventaire de ce Brigo est plein.");
    drops.push({ brigoId: brigo.id, isNew: !discovered.has(brigo.id) });
    discovered.add(brigo.id);
    inventory[brigo.id] = (inventory[brigo.id] ?? 0) + 1;
  }
  const opening: Opening = {
    id: crypto.randomUUID(),
    boxId,
    createdAt: new Date(options.nowMs ?? Date.now()).toISOString(),
    drops,
    ...(options.forcedRarity ? { testRarity: options.forcedRarity } : {}),
  };
  return {
    ...state,
    inventory,
    discovered: [...discovered],
    coins: state.coins - (free ? 0 : BOXES[boxId].cost),
    boxes: { ...state.boxes, [boxId]: state.boxes[boxId] - (free ? 1 : 0) },
    boxesOpened: state.boxesOpened + 1,
    pendingOpening: opening,
    history: [opening, ...state.history].slice(0, 30),
  };
}
export const finishOpening = (state: GameState): GameState => ({
  ...state,
  pendingOpening: null,
});
// One transaction replaces the pending result: no intermediate save or duplicate loot.
export function openNextBox(
  state: GameState,
  boxId: BoxId,
  options: Parameters<typeof openBox>[2] = {},
): GameState {
  if (!state.pendingOpening) throw new GameError("Aucune ouverture en cours.");
  return openBox(finishOpening(state), boxId, options);
}
export function followRecipe(
  state: GameState,
  recipeId: string | null,
): GameState {
  if (recipeId !== null && !RECIPE_BY_ID.has(recipeId))
    throw new GameError("Cette construction n’existe pas.");
  return { ...state, goalRecipeId: recipeId };
}
export function matchesRequirement(
  brigo: Brigo,
  requirement: Requirement,
): boolean {
  return (
    (!requirement.modelId || brigo.model.id === requirement.modelId) &&
    (!requirement.family || brigo.model.family === requirement.family) &&
    (!requirement.colorId || brigo.color.id === requirement.colorId)
  );
}
const allocationOrder = [...CATALOG].sort(
  (a, b) =>
    RARITIES.indexOf(a.rarity) - RARITIES.indexOf(b.rarity) ||
    a.number - b.number,
);
export function recipeProgress(state: GameState, recipe: Recipe) {
  const remaining = { ...state.inventory };
  const pieces: Record<string, number> = {};
  // Allocate constrained colors first, so a free-color slot cannot consume them.
  const specificity = (requirement: Requirement) =>
    (requirement.colorId ? 4 : 0) +
    (requirement.modelId ? 2 : 0) +
    (requirement.family ? 1 : 0);
  const requirements = recipe.requirements
    .map((requirement, index) => ({ requirement, index }))
    .sort((a, b) => specificity(b.requirement) - specificity(a.requirement))
    .map(({ requirement, index }) => {
      let missing = requirement.quantity;
      for (const brigo of allocationOrder) {
        if (missing === 0) break;
        if (!matchesRequirement(brigo, requirement)) continue;
        const take = Math.min(remaining[brigo.id] ?? 0, missing);
        if (take > 0) {
          pieces[brigo.id] = (pieces[brigo.id] ?? 0) + take;
          remaining[brigo.id] -= take;
          missing -= take;
        }
      }
      return {
        index,
        ...requirement,
        available: requirement.quantity - missing,
        missing,
      };
    })
    .sort((a, b) => a.index - b.index)
    .map(({ index: _index, ...requirement }) => requirement);
  return {
    requirements,
    pieces,
    available: requirements.reduce(
      (sum, requirement) => sum + requirement.available,
      0,
    ),
    total: pieceCount(recipe),
    canBuild: requirements.every((requirement) => requirement.missing === 0),
  };
}
export function buildRecipe(
  state: GameState,
  recipeId: string,
  nowMs = Date.now(),
): GameState {
  const recipe = RECIPE_BY_ID.get(recipeId);
  if (!recipe) throw new GameError("Cette construction n’existe pas.");
  if (state.constructions.length >= 1000)
    throw new GameError("Votre atelier est plein. Démontez une construction.");
  const progress = recipeProgress(state, recipe);
  if (!progress.canBuild)
    throw new GameError(
      "Il vous manque encore des Brigos pour cette construction.",
    );
  const inventory = { ...state.inventory };
  for (const [id, count] of Object.entries(progress.pieces)) {
    inventory[id] -= count;
    if (inventory[id] === 0) delete inventory[id];
  }
  return observeProduction(
    {
      ...state,
      inventory,
      constructions: [
        ...state.constructions,
        {
          id: crypto.randomUUID(),
          recipeId,
          pieces: progress.pieces,
          createdAt: new Date(nowMs).toISOString(),
        },
      ],
    },
    nowMs,
  );
}
export function trackedRecipeProgress(state: GameState, recipe: Recipe) {
  const progress = recipeProgress(state, recipe);
  const completed = state.constructions.some(
    (item) => item.recipeId === recipe.id,
  );
  return {
    ...progress,
    completed,
    available: completed ? progress.total : progress.available,
  };
}
export function dismantle(
  state: GameState,
  constructionId: string,
  nowMs = Date.now(),
): GameState {
  const construction = state.constructions.find(
    (item) => item.id === constructionId,
  );
  if (!construction)
    throw new GameError("Cette construction n’est plus dans votre atelier.");
  // Mature rewards and reserved materials return in the same atomic operation.
  const collected = collectProduction(state, constructionId, nowMs);
  const inventory = { ...collected.inventory };
  for (const [id, count] of Object.entries(construction.pieces)) {
    if ((inventory[id] ?? 0) + count > MAX_VALUE)
      throw new GameError("L’inventaire de ce Brigo est plein.");
    inventory[id] = (inventory[id] ?? 0) + count;
  }
  return observeProduction(
    {
      ...collected,
      inventory,
      constructions: state.constructions.filter(
        (item) => item.id !== constructionId,
      ),
    },
    nowMs,
  );
}
export const inventoryCount = (state: GameState) =>
  Object.values(state.inventory).reduce((sum, count) => sum + count, 0);
export const reservedCount = (state: GameState) =>
  state.constructions.reduce(
    (sum, construction) =>
      sum +
      Object.values(construction.pieces).reduce(
        (total, count) => total + count,
        0,
      ),
    0,
  ) +
  (state.sandboxProjects ?? []).reduce(
    (sum, project) => sum + project.placements.length,
    0,
  );
/** Free inventory excludes every reserved piece, including creative projects. */
export const reservedBrigoCount = (state: GameState, brigoId: string) =>
  state.constructions.reduce(
    (sum, built) => sum + (built.pieces[brigoId] ?? 0),
    0,
  ) +
  (state.sandboxProjects ?? []).reduce(
    (sum, project) =>
      sum +
      project.placements.reduce(
        (count, piece) => count + (piece.brigoId === brigoId ? 1 : 0),
        0,
      ),
    0,
  );
export const totalBoxes = (state: GameState) =>
  BOX_IDS.reduce((sum, boxId) => sum + state.boxes[boxId], 0);

export type AdminCommand =
  | { type: "coins"; amount: number }
  | { type: "boxes"; boxId: BoxId; amount: number }
  | { type: "piece"; brigoId: string; amount: number }
  | { type: "catalog"; amount: number }
  | { type: "recipe"; recipeId: string }
  | { type: "rates"; boxId: BoxId; weights: Weights }
  | { type: "reset-rates" }
  | { type: "reset" };
function amountValid(amount: number, limit = 100_000) {
  if (!Number.isSafeInteger(amount) || amount < 1 || amount > limit)
    throw new GameError(`Saisissez un entier entre 1 et ${limit}.`);
}
function addPieces(
  state: GameState,
  pieces: Record<string, number>,
): GameState {
  const inventory = { ...state.inventory };
  const discovered = new Set(state.discovered);
  for (const [id, amount] of Object.entries(pieces)) {
    if (!BRIGO_BY_ID.has(id)) throw new GameError("Ce Brigo n’existe pas.");
    amountValid(amount);
    if ((inventory[id] ?? 0) + amount > MAX_VALUE)
      throw new GameError("L’inventaire de ce Brigo est plein.");
    inventory[id] = (inventory[id] ?? 0) + amount;
    discovered.add(id);
  }
  return { ...state, inventory, discovered: [...discovered] };
}
export function adminCommand(
  state: GameState,
  command: AdminCommand,
  enabled: boolean,
): GameState {
  if (!enabled) throw new GameError("Le mode admin local est désactivé.");
  switch (command.type) {
    case "coins":
      amountValid(command.amount);
      if (state.coins + command.amount > MAX_VALUE)
        throw new GameError("La réserve de pièces est pleine.");
      return { ...state, coins: state.coins + command.amount };
    case "boxes":
      amountValid(command.amount);
      if (!BOX_IDS.includes(command.boxId))
        throw new GameError("Cette boîte n’existe pas.");
      if (state.boxes[command.boxId] + command.amount > MAX_VALUE)
        throw new GameError("La réserve de boîtes est pleine.");
      return {
        ...state,
        boxes: {
          ...state.boxes,
          [command.boxId]: state.boxes[command.boxId] + command.amount,
        },
      };
    case "piece":
      amountValid(command.amount);
      return addPieces(state, { [command.brigoId]: command.amount });
    case "catalog":
      amountValid(command.amount, 100);
      return addPieces(
        state,
        Object.fromEntries(CATALOG.map((brigo) => [brigo.id, command.amount])),
      );
    case "recipe": {
      const recipe = RECIPES.find((item) => item.id === command.recipeId);
      if (!recipe) throw new GameError("Cette construction n’existe pas.");
      const pieces: Record<string, number> = {};
      for (const requirement of recipeProgress(state, recipe).requirements) {
        if (!requirement.missing) continue;
        const brigo = allocationOrder.find((item) =>
          matchesRequirement(item, requirement),
        )!;
        pieces[brigo.id] = (pieces[brigo.id] ?? 0) + requirement.missing;
      }
      return addPieces(state, pieces);
    }
    case "rates":
      if (!BOX_IDS.includes(command.boxId) || !validateWeights(command.weights))
        throw new GameError("Les probabilités doivent totaliser 100 %.");
      return {
        ...state,
        rates: { ...state.rates, [command.boxId]: { ...command.weights } },
      };
    case "reset-rates":
      return { ...state, rates: defaultRates() };
    case "reset":
      return createGame();
  }
}
