import { BOX_IDS, RECIPE_BY_ID, pieceCount } from "./catalog";
import type { BoxId, Recipe } from "./catalog";
import { GameError, MAX_VALUE } from "./engine";
import type { Construction } from "./engine";

type BuiltState = { constructions: Construction[] };
type RewardState = BuiltState & {
  coins: number;
  boxes: Record<BoxId, number>;
  claimedAchievements: string[];
  lastVisitRewardAt: string | null;
  engagement?: { dayKey: string | null };
};

export interface Reward {
  coins?: number;
  boxes?: Partial<Record<BoxId, number>>;
}

const DIFFICULTY_XP: Record<Recipe["difficulty"], number> = {
  "Premiers pas": 30,
  Créatif: 90,
  Expert: 200,
  Légendaire: 1000,
};

/** Difficulty carries most of the XP; every real piece adds a small bonus. */
export const recipeXp = (recipe: Recipe): number =>
  DIFFICULTY_XP[recipe.difficulty] + pieceCount(recipe) * 2;

export interface XpContribution {
  recipeId: string;
  name: string;
  count: number;
  xpEach: number;
  xp: number;
}

function rankForLevel(level: number): string {
  if (level >= 15) return "Maître Brigo";
  if (level >= 10) return "Grand architecte";
  if (level >= 6) return "Architecte";
  if (level >= 3) return "Bâtisseur";
  return "Nouveau bâtisseur";
}

const levelThreshold = (level: number) => 50 * (level - 1) * level;

/**
 * XP is derived from the current exhibition, never from history or rewards.
 * Dismantling and rebuilding a model cannot accumulate permanent XP.
 */
export function playerProgress(state: BuiltState) {
  const grouped = new Map<string, XpContribution>();
  for (const construction of state.constructions) {
    const recipe = RECIPE_BY_ID.get(construction.recipeId);
    if (!recipe) continue;
    const existing = grouped.get(recipe.id);
    if (existing) {
      existing.count++;
      existing.xp += existing.xpEach;
    } else {
      const xpEach = recipeXp(recipe);
      grouped.set(recipe.id, {
        recipeId: recipe.id,
        name: recipe.name,
        count: 1,
        xpEach,
        xp: xpEach,
      });
    }
  }
  const contributions = [...grouped.values()].sort(
    (a, b) => b.xp - a.xp || a.recipeId.localeCompare(b.recipeId),
  );
  const xp = contributions.reduce((total, item) => total + item.xp, 0);
  const level = Math.max(1, Math.floor((1 + Math.sqrt(1 + xp / 12.5)) / 2));
  const currentLevelXp = levelThreshold(level);
  const nextLevelXp = levelThreshold(level + 1);
  return {
    xp,
    level,
    rank: rankForLevel(level),
    currentLevelXp,
    nextLevelXp,
    remainingXp: nextLevelXp - xp,
    progress: (xp - currentLevelXp) / (nextLevelXp - currentLevelXp),
    contributions,
  };
}

export const getProgression = playerProgress;

export const ACHIEVEMENT_IDS = [
  "builder-variety",
  "first-expert",
  "grand-exhibition",
] as const;
export type AchievementId = (typeof ACHIEVEMENT_IDS)[number];

export interface Achievement {
  id: AchievementId;
  title: string;
  description: string;
  target: number;
  reward: Reward;
  rewardLabel: string;
}

export const ACHIEVEMENTS: readonly Achievement[] = [
  {
    id: "builder-variety",
    title: "Collectionneur d’idées",
    description: "Exposez trois plans différents en même temps.",
    target: 3,
    reward: { coins: 150 },
    rewardLabel: "150 pièces",
  },
  {
    id: "first-expert",
    title: "Maître d’œuvre",
    description: "Terminez et exposez une construction Expert ou Légendaire.",
    target: 1,
    reward: { boxes: { workshop: 1 } },
    rewardLabel: "1 boîte Atelier",
  },
  {
    id: "grand-exhibition",
    title: "Grande exposition",
    description:
      "Réunissez au moins 100 Brigos dans vos constructions exposées.",
    target: 100,
    reward: { boxes: { prism: 1 } },
    rewardLabel: "1 boîte Prisme",
  },
];

export function getChallenges(
  state: BuiltState & { claimedAchievements: string[] },
) {
  const recipes = state.constructions.flatMap((construction) => {
    const recipe = RECIPE_BY_ID.get(construction.recipeId);
    return recipe ? [recipe] : [];
  });
  const values: Record<AchievementId, number> = {
    "builder-variety": new Set(recipes.map((recipe) => recipe.id)).size,
    "first-expert": recipes.filter(
      (recipe) =>
        recipe.difficulty === "Expert" || recipe.difficulty === "Légendaire",
    ).length,
    "grand-exhibition": recipes.reduce(
      (total, recipe) => total + pieceCount(recipe),
      0,
    ),
  };
  return ACHIEVEMENTS.map((achievement) => {
    const current = values[achievement.id];
    const completed = current >= achievement.target;
    const claimed = state.claimedAchievements.includes(achievement.id);
    return {
      ...achievement,
      current,
      completed,
      claimed,
      canClaim: completed && !claimed,
    };
  });
}

function grantReward<T extends RewardState>(state: T, reward: Reward): T {
  const coins = state.coins + (reward.coins ?? 0);
  if (!Number.isSafeInteger(coins) || coins > MAX_VALUE)
    throw new GameError(
      "Votre réserve de pièces est pleine. Dépensez-en avant de réclamer ce cadeau.",
    );
  const boxes = { ...state.boxes };
  for (const boxId of BOX_IDS) {
    boxes[boxId] += reward.boxes?.[boxId] ?? 0;
    if (!Number.isSafeInteger(boxes[boxId]) || boxes[boxId] > MAX_VALUE)
      throw new GameError(
        "Votre réserve de boîtes est pleine. Ouvrez-en avant de réclamer ce cadeau.",
      );
  }
  return { ...state, coins, boxes };
}

/** Claimed contract IDs persist even if the qualifying models are dismantled. */
export function claimAchievement<T extends RewardState>(
  state: T,
  achievementId: string,
): T {
  const challenge = getChallenges(state).find(
    (item) => item.id === achievementId,
  );
  if (!challenge) throw new GameError("Ce contrat n’existe pas.");
  if (challenge.claimed)
    throw new GameError("La récompense de ce contrat a déjà été récupérée.");
  if (!challenge.completed)
    throw new GameError(
      "Terminez ce contrat avant de récupérer sa récompense.",
    );
  return {
    ...grantReward(state, challenge.reward),
    claimedAchievements: [...state.claimedAchievements, challenge.id],
  };
}

export const VISIT_REWARD_INTERVAL_MS = 24 * 60 * 60 * 1000;
export const VISIT_REWARD: Readonly<Reward> = {
  coins: 100,
  boxes: { discovery: 1 },
};
export const VISIT_REWARD_LABEL = "100 pièces + 1 boîte Découverte";

function validTimestamp(nowMs: number): number {
  if (
    !Number.isSafeInteger(nowMs) ||
    nowMs < 0 ||
    nowMs > Date.UTC(9999, 11, 30, 23, 59, 59, 999)
  )
    throw new GameError("L’heure de ce rendez-vous n’est pas valide.");
  return nowMs;
}

/** No streak: every visit has the same reward, without a missed-day penalty. */
export function visitRewardStatus(
  state: {
    lastVisitRewardAt: string | null;
    engagement?: { dayKey: string | null };
  },
  nowMs = Date.now(),
) {
  validTimestamp(nowMs);
  const lastAt =
    state.lastVisitRewardAt === null
      ? null
      : Date.parse(state.lastVisitRewardAt);
  if (lastAt !== null && !Number.isFinite(lastAt))
    throw new GameError("La date du dernier rendez-vous n’est pas valide.");
  const today = new Date(nowMs).toISOString().slice(0, 10);
  const journalDay = state.engagement?.dayKey;
  const journalAt =
    journalDay && journalDay > today
      ? Date.parse(`${journalDay}T00:00:00.000Z`)
      : null;
  const giftNextAt =
    lastAt === null
      ? null
      : Math.floor(lastAt / VISIT_REWARD_INTERVAL_MS) *
          VISIT_REWARD_INTERVAL_MS +
        VISIT_REWARD_INTERVAL_MS;
  const nextAvailableAt =
    journalAt === null ? giftNextAt : Math.max(journalAt, giftNextAt ?? 0);
  const clockAdjusted =
    (lastAt !== null && nowMs < lastAt) || journalAt !== null;
  return {
    available:
      !clockAdjusted && (nextAvailableAt === null || nowMs >= nextAvailableAt),
    nextAvailableAt,
    remainingMs:
      nextAvailableAt === null ? 0 : Math.max(0, nextAvailableAt - nowMs),
    clockAdjusted,
    reward: VISIT_REWARD,
    rewardLabel: VISIT_REWARD_LABEL,
  };
}

export function claimVisitReward<T extends RewardState>(
  state: T,
  nowMs = Date.now(),
): T {
  const status = visitRewardStatus(state, nowMs);
  if (!status.available)
    throw new GameError(
      status.clockAdjusted
        ? "L’horloge a reculé. Votre prochain cadeau reste disponible à l’heure prévue."
        : "Votre prochain cadeau d’atelier sera disponible à minuit UTC.",
    );
  return {
    ...grantReward(state, VISIT_REWARD),
    lastVisitRewardAt: new Date(nowMs).toISOString(),
  };
}
