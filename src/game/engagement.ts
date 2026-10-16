import { BOX_IDS } from "./catalog";
import { GameError, MAX_VALUE } from "./engine";
import type { GameState } from "./engine";
import { isDailyPuzzleSolved } from "./dailyPuzzle";
import type { Reward } from "./progression";
import { VISIT_REWARD } from "./progression";

export const DAILY_MISSION_IDS = [
  "visit",
  "open-boxes",
  "puzzle",
  "day-complete",
] as const;
export type DailyMissionId = (typeof DAILY_MISSION_IDS)[number];
export interface EngagementState {
  dayKey: string | null;
  openings: number;
  visit: boolean;
  puzzleClaimed: boolean;
  claimedMissions: DailyMissionId[];
  passport: { visits: number; cycles: number; lastVisitDay: string | null };
}
const DAY_MS = 86_400_000;
// Keep the following midnight representable as an ordinary four-digit UTC year.
const MAX_NOW = Date.UTC(9999, 11, 30, 23, 59, 59, 999);
export const DAILY_PUZZLE_REWARD = { coins: 150 } as const;
export const PASSPORT_REWARD = { coins: 300, boxes: { prism: 1 } } as const;

export function utcDayKey(nowMs = Date.now()): string {
  if (!Number.isSafeInteger(nowMs) || nowMs < 0 || nowMs > MAX_NOW)
    throw new GameError("L’heure du carnet n’est pas valide.");
  return new Date(nowMs).toISOString().slice(0, 10);
}
const validDay = (value: unknown): value is string =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  value >= "1970-01-01" &&
  value <= "9999-12-30" &&
  Number.isFinite(Date.parse(`${value}T00:00:00.000Z`)) &&
  new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value;

/** A legacy gift from today counts once, without crediting money again. */
export function initialEngagement(
  lastVisitRewardAt: string | null = null,
  nowMs = Date.now(),
): EngagementState {
  const today = utcDayKey(nowMs);
  const giftDay = lastVisitRewardAt?.slice(0, 10) ?? null;
  const dayKey = validDay(giftDay) ? giftDay : null;
  const currentVisit = dayKey === today;
  return {
    dayKey,
    openings: 0,
    visit: currentVisit,
    puzzleClaimed: false,
    claimedMissions: [],
    passport: {
      visits: currentVisit ? 1 : 0,
      cycles: 0,
      lastVisitDay: currentVisit ? today : null,
    },
  };
}

/** Strict, bounded save data; no reward or historical-day ledger is imported. */
export function parseEngagement(
  value: unknown,
  lastVisitRewardAt: string | null,
  boxesOpened = MAX_VALUE,
): EngagementState {
  if (value === undefined) return initialEngagement(lastVisitRewardAt);
  const fail = (): never => {
    throw new GameError("Sauvegarde invalide : carnet quotidien incorrect.");
  };
  const object = (input: unknown): Record<string, unknown> =>
    input !== null && typeof input === "object" && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : fail();
  const integer = (input: unknown, max: number): number =>
    typeof input === "number" &&
    Number.isSafeInteger(input) &&
    input >= 0 &&
    input <= max
      ? input
      : fail();
  const data = object(value);
  const passport = object(data.passport);
  if (data.dayKey !== null && !validDay(data.dayKey)) fail();
  if (
    typeof data.visit !== "boolean" ||
    typeof data.puzzleClaimed !== "boolean"
  )
    fail();
  if (
    !Array.isArray(data.claimedMissions) ||
    data.claimedMissions.length > DAILY_MISSION_IDS.length
  )
    fail();
  const claimedMissions = (data.claimedMissions as unknown[]).map((id) => {
    if (
      typeof id !== "string" ||
      !(DAILY_MISSION_IDS as readonly string[]).includes(id)
    )
      return fail();
    return id as DailyMissionId;
  });
  if (new Set(claimedMissions).size !== claimedMissions.length) fail();
  if (passport.lastVisitDay !== null && !validDay(passport.lastVisitDay))
    fail();
  const result: EngagementState = {
    dayKey: data.dayKey as string | null,
    openings: integer(data.openings, 2),
    visit: data.visit as boolean,
    puzzleClaimed: data.puzzleClaimed as boolean,
    claimedMissions,
    passport: {
      visits: integer(passport.visits, 7),
      cycles: integer(passport.cycles, MAX_VALUE),
      lastVisitDay: passport.lastVisitDay as string | null,
    },
  };
  if (
    result.dayKey === null &&
    (result.openings ||
      result.visit ||
      result.puzzleClaimed ||
      claimedMissions.length ||
      result.passport.lastVisitDay !== null)
  )
    fail();
  if (
    (result.passport.visits > 0 || result.passport.cycles > 0) &&
    result.passport.lastVisitDay === null
  )
    fail();
  if (result.openings > boxesOpened) fail();
  if (result.visit && lastVisitRewardAt?.slice(0, 10) !== result.dayKey) fail();
  if (
    result.passport.lastVisitDay !== null &&
    (result.dayKey === null || result.passport.lastVisitDay > result.dayKey)
  )
    fail();
  if (claimedMissions.includes("visit") && !result.visit) fail();
  if (claimedMissions.includes("open-boxes") && result.openings < 2) fail();
  if (claimedMissions.includes("puzzle") && !result.puzzleClaimed) fail();
  if (
    claimedMissions.includes("day-complete") &&
    !["visit", "open-boxes", "puzzle"].every((id) =>
      claimedMissions.includes(id as DailyMissionId),
    )
  )
    fail();
  return result;
}

function daily(state: GameState, nowMs: number) {
  const today = utcDayKey(nowMs);
  const stored =
    state.engagement ?? initialEngagement(state.lastVisitRewardAt, nowMs);
  const giftDay = state.lastVisitRewardAt?.slice(0, 10);
  const latestDay =
    giftDay && validDay(giftDay) && (!stored.dayKey || giftDay > stored.dayKey)
      ? giftDay
      : stored.dayKey;
  const clockAdjusted = latestDay !== null && today < latestDay;
  const dayKey = clockAdjusted ? latestDay : today;
  const engagement: EngagementState =
    stored.dayKey === dayKey
      ? {
          ...stored,
          claimedMissions: [...stored.claimedMissions],
          passport: { ...stored.passport },
        }
      : {
          ...initialEngagement(null, nowMs),
          dayKey,
          passport: { ...stored.passport },
        };
  // Reconcile a gift claimed by an older application on this same UTC day.
  if (!clockAdjusted && giftDay === today && !engagement.visit) {
    engagement.visit = true;
    if (engagement.passport.lastVisitDay !== today) {
      engagement.passport.visits = Math.min(7, engagement.passport.visits + 1);
      engagement.passport.lastVisitDay = today;
    }
  }
  return {
    engagement,
    dayKey,
    clockAdjusted,
    nextResetAt: Date.parse(`${dayKey}T00:00:00.000Z`) + DAY_MS,
  };
}

/** Observe successful game actions, never grant a reward automatically. */
export function syncEngagement(
  current: GameState,
  previous: GameState,
  nowMs = Date.now(),
): GameState {
  const status = daily(current, nowMs);
  if (status.clockAdjusted) return current;
  const engagement = status.engagement;
  const opened = current.pendingOpening;
  const isNewOpening =
    opened !== null &&
    current.boxesOpened === previous.boxesOpened + 1 &&
    !opened.testRarity &&
    opened.createdAt.slice(0, 10) === status.dayKey &&
    !previous.history.some((item) => item.id === opened.id) &&
    current.history.length === Math.min(30, previous.history.length + 1) &&
    current.history[0]?.id === opened.id &&
    current.history
      .slice(1)
      .every(
        (item, index) =>
          JSON.stringify(item) === JSON.stringify(previous.history[index]),
      );
  if (isNewOpening) engagement.openings = Math.min(2, engagement.openings + 1);
  return { ...current, engagement };
}

const DEFINITIONS = [
  {
    id: "visit",
    title: "La porte de l’atelier",
    description: "Récupérez votre cadeau du jour.",
    target: 1,
    coins: 50,
  },
  {
    id: "open-boxes",
    title: "Deux boîtes, plein d’idées",
    description: "Ouvrez deux boîtes, offertes ou achetées.",
    target: 2,
    coins: 100,
  },
  {
    id: "puzzle",
    title: "Le déclic du jour",
    description: "Résolvez le circuit quotidien.",
    target: 1,
    coins: 50,
  },
  {
    id: "day-complete",
    title: "Une belle journée d’atelier",
    description: "Récupérez les trois récompenses du carnet.",
    target: 3,
    coins: 100,
  },
] as const;
export const DAILY_COIN_BUDGET =
  (VISIT_REWARD.coins ?? 0) +
  DAILY_PUZZLE_REWARD.coins +
  DEFINITIONS.reduce((sum, mission) => sum + mission.coins, 0);

export function getEngagement(state: GameState, nowMs = Date.now()) {
  const status = daily(state, nowMs);
  const { engagement, clockAdjusted } = status;
  const current: Record<DailyMissionId, number> = {
    visit: Number(engagement.visit),
    "open-boxes": engagement.openings,
    puzzle: Number(engagement.puzzleClaimed),
    "day-complete": engagement.claimedMissions.filter(
      (id) => id !== "day-complete",
    ).length,
  };
  return {
    dayKey: status.dayKey,
    clockAdjusted,
    nextResetAt: status.nextResetAt,
    missions: DEFINITIONS.map(({ coins, ...mission }) => {
      const completed = current[mission.id] >= mission.target;
      const claimed = engagement.claimedMissions.includes(mission.id);
      return {
        ...mission,
        current: current[mission.id],
        reward: { coins },
        completed,
        claimed,
        canClaim: completed && !claimed && !clockAdjusted,
      };
    }),
    puzzle: {
      completed: engagement.puzzleClaimed,
      reward: DAILY_PUZZLE_REWARD,
    },
    passport: {
      ...engagement.passport,
      target: 7,
      canClaim:
        engagement.passport.visits === 7 &&
        !clockAdjusted &&
        engagement.passport.cycles < MAX_VALUE,
      reward: PASSPORT_REWARD,
    },
  };
}

function availableDay(state: GameState, nowMs: number) {
  const status = daily(state, nowMs);
  if (status.clockAdjusted)
    throw new GameError(
      "L’horloge a reculé. Le carnet attend le retour à la date prévue.",
    );
  return status;
}
function grant(state: GameState, reward: Reward): GameState {
  const coins = state.coins + (reward.coins ?? 0);
  const boxes = { ...state.boxes };
  if (!Number.isSafeInteger(coins) || coins > MAX_VALUE)
    throw new GameError(
      "Votre réserve de pièces est pleine. Dépensez-en avant de réclamer cette récompense.",
    );
  for (const id of BOX_IDS) {
    boxes[id] += reward.boxes?.[id] ?? 0;
    if (!Number.isSafeInteger(boxes[id]) || boxes[id] > MAX_VALUE)
      throw new GameError(
        "Votre réserve de boîtes est pleine. Ouvrez-en avant de réclamer cette récompense.",
      );
  }
  return { ...state, coins, boxes };
}

export function claimDailyMission(
  state: GameState,
  id: string,
  nowMs = Date.now(),
): GameState {
  const { engagement } = availableDay(state, nowMs);
  const mission = getEngagement(state, nowMs).missions.find(
    (item) => item.id === id,
  );
  if (!mission) throw new GameError("Cette mission quotidienne n’existe pas.");
  if (mission.claimed)
    throw new GameError("La récompense de cette mission a déjà été récupérée.");
  if (!mission.completed)
    throw new GameError(
      "Terminez cette mission avant de réclamer sa récompense.",
    );
  return {
    ...grant(state, mission.reward),
    engagement: {
      ...engagement,
      claimedMissions: [...engagement.claimedMissions, mission.id],
    },
  };
}

export function claimDailyPuzzle(
  state: GameState,
  rotations: readonly number[],
  nowMs = Date.now(),
): GameState {
  const { engagement, dayKey } = availableDay(state, nowMs);
  if (engagement.puzzleClaimed)
    throw new GameError(
      "La récompense de ce circuit a déjà été récupérée aujourd’hui.",
    );
  if (!isDailyPuzzleSolved(dayKey, rotations))
    throw new GameError(
      "Le circuit doit être entièrement relié avant de réclamer la récompense.",
    );
  return {
    ...grant(state, DAILY_PUZZLE_REWARD),
    engagement: { ...engagement, puzzleClaimed: true },
  };
}

export function claimPassportReward(
  state: GameState,
  nowMs = Date.now(),
): GameState {
  const { engagement } = availableDay(state, nowMs);
  if (engagement.passport.visits < 7)
    throw new GameError(
      "Complétez les sept visites du passeport avant de réclamer son cadeau.",
    );
  if (engagement.passport.cycles >= MAX_VALUE)
    throw new GameError(
      "La limite de passeports de cette partie est atteinte.",
    );
  return {
    ...grant(state, PASSPORT_REWARD),
    engagement: {
      ...engagement,
      passport: {
        ...engagement.passport,
        visits: 0,
        cycles: engagement.passport.cycles + 1,
      },
    },
  };
}
