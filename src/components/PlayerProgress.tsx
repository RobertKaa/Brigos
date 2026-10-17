import { useId } from "react";
import {
  ArrowUpRight,
  Check,
  ChevronRight,
  Gift,
  Hammer,
  Layers3,
  Sparkles,
  Trophy,
} from "lucide-react";
import { BOX_IDS } from "../game/catalog";
import type { Recipe } from "../game/catalog";
import { MAX_VALUE } from "../game/engine";
import type { GameState } from "../game/engine";
import { getChallenges, playerProgress, recipeXp } from "../game/progression";
import type { Reward } from "../game/progression";
import type { Game } from "../screens/types";
import "./player-progress.css";

const numberFormat = new Intl.NumberFormat("fr-FR");

function rewardCapacityNote(state: GameState, reward: Reward) {
  if (state.coins + (reward.coins ?? 0) > MAX_VALUE)
    return "Dépensez quelques pièces pour faire de la place à ce cadeau.";
  if (
    BOX_IDS.some(
      (id) => state.boxes[id] + (reward.boxes?.[id] ?? 0) > MAX_VALUE,
    )
  )
    return "Ouvrez quelques boîtes pour faire de la place à ce cadeau.";
  return null;
}

export function PlayerLevelBadge({ state }: { state: GameState }) {
  const progress = playerProgress(state);
  return (
    <a
      href="#workshop"
      className="player-level-badge"
      aria-label={`Niveau ${progress.level}, ${progress.rank}. ${numberFormat.format(progress.xp)} XP. Voir l’atelier.`}
      title={`Niveau ${progress.level} · ${progress.rank}`}
    >
      <Trophy size={16} aria-hidden="true" />
      <span>Niv. {progress.level}</span>
    </a>
  );
}

export function RecipeXpBadge({ recipe }: { recipe: Recipe }) {
  return (
    <span
      className="recipe-xp-badge"
      title="XP conservée tant que cette construction reste assemblée"
    >
      <Sparkles size={13} aria-hidden="true" />
      {numberFormat.format(recipeXp(recipe))} XP
    </span>
  );
}

export function ConstructionXpNote() {
  return (
    <div className="construction-xp-note">
      <Layers3 size={21} aria-hidden="true" />
      <div>
        <strong>Votre niveau suit vos créations.</strong>
        <p>
          Assembler un plan ajoute son XP. Le démonter retire cette XP et rend
          tous ses Brigos disponibles. Les découvertes restent dans l’album.
        </p>
      </div>
    </div>
  );
}

export function PlayerProgress({
  game,
  variant = "full",
}: {
  game: Game;
  variant?: "compact" | "full";
}) {
  const { state, ready, busy, act } = game;
  const headingId = useId();
  const progress = playerProgress(state);
  const challenges = getChallenges(state);
  const currentXp = progress.xp - progress.currentLevelXp;
  const levelXp = progress.nextLevelXp - progress.currentLevelXp;

  return (
    <section
      className={`player-progress player-progress-${variant}`}
      aria-labelledby={headingId}
    >
      {variant === "full" && (
        <div className="section-heading">
          <div>
            <h2 id={headingId}>
              Votre progression<span className="heading-dot">.</span>
            </h2>
            <p>Construisez, exposez et débloquez les récompenses Brigos.</p>
          </div>
          <a href="#workshop" className="text-link">
            À l’atelier <ChevronRight size={15} aria-hidden="true" />
          </a>
        </div>
      )}
      <div className="player-progress-overview player-progress-gallery-only">
        <div className="player-xp-card">
          <div className="player-level-medal" aria-hidden="true">
            <span>NIVEAU</span>
            <strong>{progress.level}</strong>
          </div>
          <div className="player-xp-content">
            <span className="player-progress-eyebrow">VOTRE GALERIE</span>
            <h3 id={variant === "compact" ? headingId : undefined}>
              <span className="visually-hidden">
                Niveau {progress.level} ·{" "}
              </span>
              {progress.rank}
            </h3>
            <div className="player-xp-line">
              <strong>{numberFormat.format(progress.xp)} XP</strong>
              <span>
                {state.constructions.length} création
                {state.constructions.length > 1 ? "s" : ""} assemblée
                {state.constructions.length > 1 ? "s" : ""}
              </span>
            </div>
            <div
              className="player-xp-track"
              role="progressbar"
              aria-label={`Progression vers le niveau ${progress.level + 1}`}
              aria-valuemin={0}
              aria-valuemax={levelXp}
              aria-valuenow={currentXp}
              aria-valuetext={`${numberFormat.format(progress.remainingXp)} XP avant le niveau ${progress.level + 1}`}
            >
              <span style={{ width: `${progress.progress * 100}%` }} />
            </div>
            <p className="player-next-level">
              <span>Encore {numberFormat.format(progress.remainingXp)} XP</span>
              <span>Niveau {progress.level + 1}</span>
            </p>
          </div>
        </div>
      </div>
      {variant === "full" && (
        <div className="player-challenges">
          <div className="player-challenges-heading">
            <h3>
              <Trophy size={18} aria-hidden="true" />
              Vos objectifs
            </h3>
            <span>
              {challenges.filter((challenge) => challenge.claimed).length} /{" "}
              {challenges.length} récompenses reçues
            </span>
          </div>
          <div className="player-challenge-grid">
            {challenges.map((challenge, index) => (
              <article
                key={challenge.id}
                className={`player-challenge ${challenge.claimed ? "is-claimed" : challenge.completed ? "is-complete" : ""}`}
              >
                <div className="player-challenge-title">
                  <span aria-hidden="true" className="player-challenge-mark">
                    {challenge.claimed ? <Check size={17} /> : index + 1}
                  </span>
                  <h4>{challenge.title}</h4>
                </div>
                <p>{challenge.description}</p>
                <div className="player-challenge-progress">
                  <span
                    role="progressbar"
                    aria-label={challenge.title}
                    aria-valuemin={0}
                    aria-valuemax={challenge.target}
                    aria-valuenow={Math.min(
                      challenge.current,
                      challenge.target,
                    )}
                  >
                    <i
                      style={{
                        width: `${Math.min(1, challenge.current / challenge.target) * 100}%`,
                      }}
                    />
                  </span>
                  <strong>
                    {Math.min(challenge.current, challenge.target)} /{" "}
                    {challenge.target}
                  </strong>
                </div>
                <span className="player-challenge-reward">
                  <Gift size={14} aria-hidden="true" />
                  {challenge.rewardLabel}
                </span>
                {challenge.claimed ? (
                  <span className="player-challenge-done">
                    <Check size={15} aria-hidden="true" />
                    Récompense reçue
                  </span>
                ) : challenge.completed ? (
                  <button
                    type="button"
                    className="button button-primary"
                    disabled={
                      !ready ||
                      busy ||
                      !!rewardCapacityNote(state, challenge.reward)
                    }
                    title={
                      rewardCapacityNote(state, challenge.reward) ?? undefined
                    }
                    aria-label={`Recevoir la récompense du défi ${challenge.title}`}
                    onClick={() =>
                      void act(
                        {
                          type: "claim-achievement",
                          achievementId: challenge.id,
                        },
                        `Défi « ${challenge.title} » récompensé : ${challenge.rewardLabel}.`,
                      )
                    }
                  >
                    Recevoir la récompense
                    <ArrowUpRight size={15} aria-hidden="true" />
                  </button>
                ) : (
                  <a href="#workshop" className="player-challenge-link">
                    Choisir une construction
                    <Hammer size={15} aria-hidden="true" />
                  </a>
                )}
                {challenge.completed &&
                  !challenge.claimed &&
                  rewardCapacityNote(state, challenge.reward) && (
                    <p className="player-capacity-note">
                      {rewardCapacityNote(state, challenge.reward)}
                    </p>
                  )}
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
