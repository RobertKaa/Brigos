import { CATALOG, RECIPE_BY_ID, pieceCount } from "./catalog";
import type { Recipe } from "./catalog";
import { GameError, MAX_VALUE, matchesRequirement } from "./engine";
import type { Construction, GameState } from "./engine";
import { PART_PRICES } from "./market";

const HOUR_MS = 60 * 60 * 1000;
export const PRODUCTION_RESERVE_MS = 72 * HOUR_MS;
/** v9 units, retained only to read and migrate its persisted cycle counters. */
export const PRODUCTION_INTERVAL_MS = 24 * HOUR_MS;
export const PRODUCTION_CYCLE_MS = PRODUCTION_INTERVAL_MS;
export const PRODUCTION_MAX_CYCLES = 3;
interface RecipeProduction {
  value: number;
  cycleMs: number;
  perCycle: number;
  perDay: number;
  capacity: number;
}
const yieldCache = new WeakMap<Recipe, RecipeProduction>();
function recipeProduction(recipe: Recipe): RecipeProduction {
  const cached = yieldCache.get(recipe);
  if (cached) return cached;
  const value = recipe.requirements.reduce((sum, requirement) => {
    const part = CATALOG.find((candidate) =>
      matchesRequirement(candidate, requirement),
    );
    return sum + (part ? PART_PRICES[part.rarity] * requirement.quantity : 0);
  }, 0);
  const count = pieceCount(recipe);
  const hours = count < 50 ? 1 : count < 200 ? 2 : count < 900 ? 4 : 8;
  const target = Math.min(96, 24 + Math.floor(Math.sqrt(value) / 5));
  const perCycle = Math.max(1, Math.floor((target * hours) / 24));
  const result = {
    value,
    cycleMs: hours * HOUR_MS,
    perCycle,
    perDay: (perCycle * 24) / hours,
    capacity: (perCycle * 72) / hours,
  };
  yieldCache.set(recipe, result);
  return result;
}
export const recipeProductionIntervalMs = (recipe: Recipe): number =>
  recipeProduction(recipe).cycleMs;
export const productionPerCycle = (recipe: Recipe): number =>
  recipeProduction(recipe).perCycle;
export const recipeProductionPerDay = (recipe: Recipe): number =>
  recipeProduction(recipe).perDay;
const MAX_TIME = 8_640_000_000_000_000;

export interface ProductionEntry {
  /** The first complete cycle ends after the blueprint's own interval. */
  anchorAt: number;
  /** Includes cycles lost when the three-day reserve was full. */
  claimedCycles: number;
  /** v9 coins already mature when v10 shortened the production intervals. */
  bankedCoins: number;
}
export interface ProductionState {
  /** Persisted high-water mark: moving the local clock back cannot replay cycles. */
  observedAt: number;
  entries: Record<string, ProductionEntry>;
}
export interface ProductionRow {
  constructionId: string;
  recipeId: string;
  ready: number;
  perCycle: number;
  perDay: number;
  cycleMs: number;
  nextReadyAt: number | null;
  capacity: number;
  capacityBlocked: boolean;
  clockAdjusted: boolean;
}
export interface ProductionSummary {
  totalReady: number;
  nextReadyAt: number | null;
  producingCount: number;
  totalPerDay: number;
  capacityBlocked: boolean;
  rows: ProductionRow[];
  clockAdjusted: boolean;
}

function time(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0 || value > MAX_TIME)
    throw new GameError("L’heure de votre appareil est incorrecte.");
  return value;
}

/** Initialize missing legacy entries at observation time, never at createdAt. */
export function observeProduction(
  state: GameState,
  nowMs = Date.now(),
): GameState {
  const now = Math.max(time(nowMs), state.production?.observedAt ?? 0);
  const existing = state.production?.entries ?? {};
  const entries = Object.fromEntries(
    state.constructions.map((built) => [
      built.id,
      Object.hasOwn(existing, built.id)
        ? existing[built.id]
        : { anchorAt: now, claimedCycles: 0, bankedCoins: 0 },
    ]),
  );
  return { ...state, production: { observedAt: now, entries } };
}

/** Strict parser for the current ledger, including per-blueprint cycle units. */
export function parseProduction(
  value: unknown,
  constructions: readonly Construction[],
  nowMs = Date.now(),
): ProductionState {
  return parseLedger(value, constructions, nowMs, false);
}

function parseLedger(
  value: unknown,
  constructions: readonly Construction[],
  nowMs: number,
  legacy: boolean,
): ProductionState {
  const fail = (): never => {
    throw new GameError("Sauvegarde invalide : production incorrecte.");
  };
  const record = (item: unknown): Record<string, unknown> => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return fail();
    return item as Record<string, unknown>;
  };
  const source = record(value);
  const validTime = (item: unknown): number => {
    if (
      typeof item !== "number" ||
      !Number.isSafeInteger(item) ||
      item < 0 ||
      item > MAX_TIME
    )
      return fail();
    return item;
  };
  let observedAt = validTime(source.observedAt);
  const entries = record(source.entries);
  const ids = new Set(constructions.map((built) => built.id));
  if (Object.keys(entries).some((id) => !ids.has(id))) return fail();
  const parsedEntries = Object.fromEntries(
    constructions.map((built) => {
      if (!Object.hasOwn(entries, built.id)) {
        observedAt = Math.max(observedAt, time(nowMs));
        return [
          built.id,
          { anchorAt: observedAt, claimedCycles: 0, bankedCoins: 0 },
        ];
      }
      const item = record(entries[built.id]);
      const anchorAt = validTime(item.anchorAt);
      const stats = recipeProduction(RECIPE_BY_ID.get(built.recipeId)!);
      const cycleMs = legacy ? PRODUCTION_CYCLE_MS : stats.cycleMs;
      if (
        typeof item.claimedCycles !== "number" ||
        !Number.isSafeInteger(item.claimedCycles) ||
        item.claimedCycles < 0 ||
        item.claimedCycles > Math.floor(MAX_TIME / cycleMs) ||
        anchorAt > observedAt ||
        item.claimedCycles > Math.floor((observedAt - anchorAt) / cycleMs) ||
        (legacy
          ? Object.hasOwn(item, "bankedCoins")
          : typeof item.bankedCoins !== "number" ||
            !Number.isSafeInteger(item.bankedCoins) ||
            item.bankedCoins < 0 ||
            item.bankedCoins > stats.capacity)
      )
        return fail();
      return [
        built.id,
        {
          anchorAt,
          claimedCycles: item.claimedCycles,
          bankedCoins: legacy ? 0 : (item.bankedCoins as number),
        },
      ];
    }),
  );
  return { observedAt, entries: parsedEntries };
}

/** Translate v9 counters once, preserving mature coins and the current fraction. */
export function migrateV9Production(
  value: unknown,
  constructions: readonly Construction[],
  nowMs = Date.now(),
): ProductionState {
  const legacy = parseLedger(value, constructions, nowMs, true);
  const observedAt = Math.max(time(nowMs), legacy.observedAt);
  const entries = Object.fromEntries(
    constructions.map((built) => {
      const old = legacy.entries[built.id];
      const stats = recipeProduction(RECIPE_BY_ID.get(built.recipeId)!);
      const elapsed = Math.floor(
        (observedAt - old.anchorAt) / PRODUCTION_CYCLE_MS,
      );
      const oldPerDay = Math.max(
        2,
        Math.min(75, Math.floor(Math.sqrt(stats.value) / 5)),
      );
      const bankedCoins =
        Math.min(
          PRODUCTION_MAX_CYCLES,
          Math.max(0, elapsed - old.claimedCycles),
        ) * oldPerDay;
      const fractionMs = Math.floor(
        (((observedAt - old.anchorAt) % PRODUCTION_CYCLE_MS) * stats.cycleMs) /
          PRODUCTION_CYCLE_MS,
      );
      return [
        built.id,
        { anchorAt: observedAt - fractionMs, claimedCycles: 0, bankedCoins },
      ];
    }),
  );
  return { observedAt, entries };
}

function cycles(entry: ProductionEntry, now: number, stats: RecipeProduction) {
  const elapsed = Math.max(
    0,
    Math.floor((now - entry.anchorAt) / stats.cycleMs),
  );
  return {
    elapsed,
    ready: Math.min(
      stats.capacity,
      entry.bankedCoins +
        Math.max(0, elapsed - entry.claimedCycles) * stats.perCycle,
    ),
  };
}
export function getProduction(
  state: GameState,
  nowMs = Date.now(),
): ProductionSummary {
  const localNow = time(nowMs);
  const now = Math.max(localNow, state.production?.observedAt ?? 0);
  const clockAdjusted = now > localNow;
  const rows = state.constructions.map((built): ProductionRow => {
    const entry =
      state.production?.entries &&
      Object.hasOwn(state.production.entries, built.id)
        ? state.production.entries[built.id]
        : { anchorAt: now, claimedCycles: 0, bankedCoins: 0 };
    const stats = recipeProduction(RECIPE_BY_ID.get(built.recipeId)!);
    const count = cycles(entry, now, stats);
    return {
      constructionId: built.id,
      recipeId: built.recipeId,
      ready: count.ready,
      perCycle: stats.perCycle,
      perDay: stats.perDay,
      cycleMs: stats.cycleMs,
      nextReadyAt:
        count.ready >= stats.capacity ||
        entry.anchorAt + (count.elapsed + 1) * stats.cycleMs > MAX_TIME
          ? null
          : entry.anchorAt + (count.elapsed + 1) * stats.cycleMs,
      capacity: stats.capacity,
      capacityBlocked: state.coins + count.ready > MAX_VALUE,
      clockAdjusted,
    };
  });
  const nextTimes = rows.flatMap((row) =>
    row.nextReadyAt === null ? [] : [row.nextReadyAt],
  );
  return {
    rows,
    totalReady: rows.reduce((sum, row) => sum + row.ready, 0),
    producingCount: rows.length,
    totalPerDay: rows.reduce((sum, row) => sum + row.perDay, 0),
    nextReadyAt: nextTimes.length ? Math.min(...nextTimes) : null,
    capacityBlocked:
      state.coins + rows.reduce((sum, row) => sum + row.ready, 0) > MAX_VALUE,
    clockAdjusted,
  };
}

/** Reward and ledger are committed together through the existing save transaction. */
export function collectProduction(
  state: GameState,
  constructionId?: string,
  nowMs = Date.now(),
): GameState {
  if (
    constructionId !== undefined &&
    !state.constructions.some((built) => built.id === constructionId)
  )
    throw new GameError("Cette construction n’est plus dans votre atelier.");
  return collectMatching(
    state,
    (built) => constructionId === undefined || built.id === constructionId,
    nowMs,
  );
}

/** A gallery stack claims all copies of that exact blueprint in one transaction. */
export function collectRecipeProduction(
  state: GameState,
  recipeId: string,
  nowMs = Date.now(),
): GameState {
  if (!state.constructions.some((built) => built.recipeId === recipeId))
    throw new GameError("Cette construction n’est plus dans votre atelier.");
  return collectMatching(state, (built) => built.recipeId === recipeId, nowMs);
}

function collectMatching(
  state: GameState,
  matches: (built: Construction) => boolean,
  nowMs: number,
): GameState {
  const observed = observeProduction(state, nowMs);
  const now = observed.production!.observedAt;
  let coins = state.coins;
  const entries = { ...observed.production!.entries };
  for (const built of state.constructions) {
    if (!matches(built)) continue;
    const entry = entries[built.id];
    const stats = recipeProduction(RECIPE_BY_ID.get(built.recipeId)!);
    const current = cycles(entry, now, stats);
    coins += current.ready;
    if (coins > MAX_VALUE)
      throw new GameError(
        "Votre réserve de pièces est pleine. Dépensez des pièces avant de récolter.",
      );
    entries[built.id] = {
      ...entry,
      claimedCycles: current.elapsed,
      bankedCoins: 0,
    };
  }
  return {
    ...observed,
    coins,
    production: { observedAt: now, entries },
  };
}
