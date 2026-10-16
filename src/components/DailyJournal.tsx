import { useEffect, useId, useRef, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  Coins,
  Gift,
  PackageOpen,
  Puzzle,
  Stamp,
  Sun,
} from "lucide-react";
import { BOX_IDS } from "../game/catalog";
import { MAX_VALUE } from "../game/engine";
import type { GameState } from "../game/engine";
import { getEngagement } from "../game/engagement";
import { visitRewardStatus } from "../game/progression";
import type { Reward } from "../game/progression";
import type { Game } from "../screens/types";
import { DailyPuzzle } from "./DailyPuzzle";
import "./daily-journal.css";

const numberFormat = new Intl.NumberFormat("fr-FR");
type DailyMission = ReturnType<typeof getEngagement>["missions"][number];

export { claimAvailableDailyMissions as claimAvailableJournalMissions } from "../game/commands";

const MISSION_LABELS = {
  visit: "Récupérer le cadeau du jour",
  "open-boxes": "Ouvrir 2 boîtes",
  puzzle: "Réussir le circuit du jour",
};
const MISSION_HELP = {
  visit: "Le cadeau débloque ces 50 pièces supplémentaires.",
  "open-boxes": "Les boîtes offertes et achetées comptent toutes.",
  puzzle: "150 pièces pour le circuit, puis ce bonus de mission.",
};

function useJournalTime(game: Game) {
  const [now, setNow] = useState(() => game.now?.() ?? Date.now());
  useEffect(() => {
    const refresh = () => setNow(game.now?.() ?? Date.now());
    refresh();
    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const timer = window.setInterval(refresh, 30_000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [game.now]);
  return now;
}

function capacityNote(state: GameState, reward: Reward) {
  if (state.coins + (reward.coins ?? 0) > MAX_VALUE)
    return "Dépensez quelques pièces avant de récupérer cette récompense.";
  if (
    BOX_IDS.some(
      (id) => state.boxes[id] + (reward.boxes?.[id] ?? 0) > MAX_VALUE,
    )
  )
    return "Ouvrez quelques boîtes avant de récupérer cette récompense.";
  return null;
}

function CoinReward({ amount }: { amount: number }) {
  return (
    <span className="journal-coin-reward">
      <Coins size={15} aria-hidden="true" />
      {numberFormat.format(amount)}
      <span className="visually-hidden"> pièces</span>
    </span>
  );
}

export function DailyJournal({ game }: { game: Game }) {
  const { state, ready, busy, act } = game;
  const now = useJournalTime(game);
  const headingId = useId();
  const puzzleId = useId();
  const giftRef = useRef<HTMLDivElement>(null);
  const puzzleSummaryRef = useRef<HTMLElement>(null);
  const [puzzleOpen, setPuzzleOpen] = useState(false);
  const journal = getEngagement(state, now);
  const gift = visitRewardStatus(state, now);
  const blocked = !ready || busy || journal.clockAdjusted;
  const giftCapacity = capacityNote(state, gift.reward);
  const passportCapacity = capacityNote(state, journal.passport.reward);
  const tasks = journal.missions.filter(
    (mission) => mission.id !== "day-complete",
  );
  const dayBonus = journal.missions.find(
    (mission) => mission.id === "day-complete",
  )!;
  const claimedTasks = tasks.filter((mission) => mission.claimed).length;
  const readyMissionCoins =
    journal.missions.reduce(
      (total, mission) =>
        total + (mission.canClaim ? (mission.reward.coins ?? 0) : 0),
      0,
    ) +
    (!journal.clockAdjusted &&
    !dayBonus.claimed &&
    !dayBonus.canClaim &&
    tasks.every((mission) => mission.claimed || mission.canClaim)
      ? (dayBonus.reward.coins ?? 0)
      : 0);
  const missionsCapacity = capacityNote(state, { coins: readyMissionCoins });
  const dailyCoins =
    journal.missions.reduce(
      (total, mission) => total + (mission.reward.coins ?? 0),
      0,
    ) +
    journal.puzzle.reward.coins +
    (gift.reward.coins ?? 0);
  const receivedCoins =
    journal.missions.reduce(
      (total, mission) =>
        total + (mission.claimed ? (mission.reward.coins ?? 0) : 0),
      0,
    ) +
    (journal.puzzle.completed ? journal.puzzle.reward.coins : 0) +
    (tasks.find((mission) => mission.id === "visit")?.completed
      ? (gift.reward.coins ?? 0)
      : 0);
  const resetTime = new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(journal.nextResetAt);
  const dayLabel = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${journal.dayKey}T12:00:00Z`));

  const claimMission = (mission: DailyMission) => {
    if (blocked || !mission.canClaim || capacityNote(state, mission.reward))
      return;
    void act(
      { type: "claim-daily-mission", missionId: mission.id },
      `${mission.title} : ${numberFormat.format(mission.reward.coins ?? 0)} pièces reçues.`,
    );
  };
  const showTarget = (target: HTMLElement | null) => {
    window.requestAnimationFrame(() => {
      target?.focus({ preventScroll: true });
      target?.scrollIntoView({ block: "start", behavior: "auto" });
    });
  };

  return (
    <section
      className="daily-journal"
      id="daily-journal"
      aria-labelledby={headingId}
    >
      <div className="journal-heading">
        <div>
          <span className="journal-eyebrow">
            <BookOpen size={15} aria-hidden="true" /> VOTRE CARNET
          </span>
          <h2 id={headingId}>
            {numberFormat.format(receivedCoins)}{" "}
            <span className="journal-total-goal">
              / {numberFormat.format(dailyCoins)} pièces
            </span>
          </h2>
          <p>
            Obtenues aujourd’hui · {claimedTasks} / {tasks.length} missions
            récupérées
          </p>
          <progress
            className="journal-daily-progress"
            max={dailyCoins}
            value={receivedCoins}
            aria-label="Pièces obtenues dans les quêtes du jour"
          />
        </div>
        <div className="journal-date" aria-label={`Activités du ${dayLabel}`}>
          <Sun size={21} aria-hidden="true" />
          <span>{dayLabel}</span>
        </div>
      </div>

      <div className="journal-budget">
        <Coins size={19} aria-hidden="true" />
        <p>
          Jusqu’à{" "}
          <strong>
            {numberFormat.format(dailyCoins)} pièces + 1 boîte Découverte
          </strong>{" "}
          à gagner gratuitement.
        </p>
        <span>Une Découverte coûte 100 pièces.</span>
      </div>

      {journal.clockAdjusted && (
        <p className="journal-clock-note" role="status">
          L’horloge a changé. Vos récompenses restent enregistrées et seront à
          nouveau accessibles quand la date sera rétablie.
        </p>
      )}

      <div
        className={`journal-gift${!gift.available ? " is-received" : ""}`}
        id="journal-gift"
        ref={giftRef}
        tabIndex={-1}
      >
        <span className="journal-gift-mark" aria-hidden="true">
          {gift.available ? <Gift size={30} /> : <Check size={30} />}
        </span>
        <div className="journal-gift-copy">
          <span className="journal-eyebrow">LE CADEAU DU JOUR</span>
          <h3>
            {gift.available
              ? "Commencez ici."
              : journal.clockAdjusted
                ? "Cadeau en attente"
                : "Cadeau reçu aujourd’hui"}
          </h3>
          <p className="journal-gift-reward">{gift.rewardLabel}</p>
          {gift.available && giftCapacity && (
            <p className="journal-capacity-note">{giftCapacity}</p>
          )}
        </div>
        <div className="journal-gift-actions">
          <button
            type="button"
            className="journal-gift-button"
            disabled={blocked || !gift.available || !!giftCapacity}
            onClick={() => {
              if (blocked || !gift.available || giftCapacity) return;
              void act(
                { type: "claim-visit" },
                `Cadeau Brigo reçu : ${gift.rewardLabel}.`,
              );
            }}
          >
            {gift.available ? (
              <>
                <Gift size={16} aria-hidden="true" /> Récupérer mon cadeau
              </>
            ) : (
              <>
                <Check size={16} aria-hidden="true" /> Cadeau reçu aujourd’hui
              </>
            )}
          </button>
          {!gift.available && !journal.clockAdjusted && (
            <a className="journal-next-action" href="#boxes">
              Ouvrir mes boîtes <ArrowRight size={16} aria-hidden="true" />
            </a>
          )}
        </div>
      </div>

      <div className="journal-pages">
        <div className="journal-missions">
          <div className="journal-page-heading">
            <div>
              <h3>Vos 3 missions</h3>
              <p className="journal-section-note">
                Jouez, puis récupérez vos pièces ici.
              </p>
            </div>
            {readyMissionCoins > 0 && (
              <button
                type="button"
                className="journal-small-button journal-claim-all"
                disabled={blocked || !!missionsCapacity}
                onClick={() => {
                  if (blocked || missionsCapacity || !readyMissionCoins) return;
                  void act(
                    { type: "claim-all-daily" },
                    "Récompenses du jour reçues.",
                  );
                }}
              >
                <Coins size={16} aria-hidden="true" />
                Tout récupérer · {numberFormat.format(readyMissionCoins)} pièces
              </button>
            )}
          </div>
          {readyMissionCoins > 0 && missionsCapacity && (
            <p className="journal-capacity-note">{missionsCapacity}</p>
          )}
          <ol className="journal-task-list">
            {tasks.map((mission) => {
              const Icon =
                mission.id === "visit"
                  ? Gift
                  : mission.id === "open-boxes"
                    ? PackageOpen
                    : Puzzle;
              const rewardCapacity = capacityNote(state, mission.reward);
              return (
                <li
                  key={mission.id}
                  className={`journal-task${mission.claimed ? " is-claimed" : ""}`}
                >
                  <span className="journal-task-icon" aria-hidden="true">
                    {mission.claimed ? <Check size={20} /> : <Icon size={20} />}
                  </span>
                  <div className="journal-task-copy">
                    <h4>
                      {
                        MISSION_LABELS[
                          mission.id as keyof typeof MISSION_LABELS
                        ]
                      }
                    </h4>
                    <p>
                      {MISSION_HELP[mission.id as keyof typeof MISSION_HELP]}
                    </p>
                    <span className="journal-task-progress">
                      {mission.claimed
                        ? "Récompense reçue"
                        : mission.completed
                          ? "Terminé · à récupérer"
                          : `${mission.current} / ${mission.target}`}
                    </span>
                    {mission.canClaim && rewardCapacity && (
                      <p className="journal-capacity-note">{rewardCapacity}</p>
                    )}
                  </div>
                  <div className="journal-task-action">
                    <CoinReward amount={mission.reward.coins ?? 0} />
                    {mission.claimed ? (
                      <span className="journal-received">
                        <Check size={13} aria-hidden="true" /> Reçu
                      </span>
                    ) : mission.canClaim ? (
                      <button
                        type="button"
                        className="journal-small-button"
                        disabled={blocked || !!rewardCapacity}
                        onClick={() => claimMission(mission)}
                        aria-label={`Récupérer ${mission.reward.coins} pièces : ${mission.title}`}
                      >
                        Récupérer
                      </button>
                    ) : mission.id === "puzzle" ? (
                      <button
                        type="button"
                        className="journal-task-link"
                        onClick={() => {
                          setPuzzleOpen(true);
                          showTarget(puzzleSummaryRef.current);
                        }}
                      >
                        Jouer <ArrowRight size={13} aria-hidden="true" />
                      </button>
                    ) : mission.id === "open-boxes" ? (
                      <a className="journal-task-link" href="#boxes">
                        Mes boîtes <ArrowRight size={13} aria-hidden="true" />
                      </a>
                    ) : (
                      <button
                        type="button"
                        className="journal-task-link"
                        onClick={() => showTarget(giftRef.current)}
                      >
                        Mon cadeau <ArrowRight size={13} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>

          <div
            className={`journal-day-bonus${dayBonus.claimed ? " is-claimed" : ""}`}
          >
            <Stamp size={25} aria-hidden="true" />
            <div>
              <h4>
                {dayBonus.canClaim || dayBonus.claimed
                  ? "La page est complète !"
                  : "Le bonus de la page"}
              </h4>
              <p>
                {dayBonus.claimed
                  ? "Votre bonus est dans votre réserve."
                  : "Un dernier cadeau après les trois récompenses du carnet récupérées."}
              </p>
              {dayBonus.canClaim && capacityNote(state, dayBonus.reward) && (
                <p className="journal-capacity-note">
                  {capacityNote(state, dayBonus.reward)}
                </p>
              )}
            </div>
            <div className="journal-task-action">
              <CoinReward amount={dayBonus.reward.coins ?? 0} />
              <button
                type="button"
                className="journal-small-button"
                disabled={
                  blocked ||
                  !dayBonus.canClaim ||
                  !!capacityNote(state, dayBonus.reward)
                }
                onClick={() => claimMission(dayBonus)}
                aria-label={`Récupérer le bonus de journée : ${dayBonus.reward.coins} pièces`}
              >
                {dayBonus.claimed
                  ? "Reçu"
                  : dayBonus.canClaim
                    ? "Récupérer"
                    : `${dayBonus.current} / ${dayBonus.target}`}
              </button>
            </div>
          </div>
        </div>
      </div>

      <details
        id={puzzleId}
        className="journal-puzzle"
        open={puzzleOpen}
        onToggle={(event) => setPuzzleOpen(event.currentTarget.open)}
      >
        <summary ref={puzzleSummaryRef}>
          <span className="journal-puzzle-icon">
            <Puzzle size={19} aria-hidden="true" />
          </span>
          <span>
            <strong>Le circuit du jour</strong>
            <span>
              Un nouveau circuit chaque jour · {journal.puzzle.reward.coins}{" "}
              pièces à la clé.
            </span>
          </span>
          {journal.puzzle.completed && (
            <span className="journal-puzzle-done">
              <Check size={16} aria-hidden="true" /> Réussi
            </span>
          )}
          <ChevronDown
            size={18}
            aria-hidden="true"
            className="journal-puzzle-chevron"
          />
        </summary>
        {!!capacityNote(state, journal.puzzle.reward) &&
          !journal.puzzle.completed && (
            <p className="journal-capacity-note">
              {capacityNote(state, journal.puzzle.reward)}
            </p>
          )}
        <DailyPuzzle
          dayKey={journal.dayKey}
          completed={journal.puzzle.completed}
          disabled={blocked || !!capacityNote(state, journal.puzzle.reward)}
          onComplete={(rotations) => {
            if (
              blocked ||
              capacityNote(state, journal.puzzle.reward) ||
              journal.puzzle.completed
            )
              return;
            void act(
              { type: "claim-daily-puzzle", solution: [...rotations] },
              `Circuit réussi : ${journal.puzzle.reward.coins} pièces reçues !`,
            );
          }}
        />
      </details>
      <details className="journal-passport-details">
        <summary>
          <Stamp size={21} aria-hidden="true" />
          <span>
            <strong>Votre passeport</strong>
            <span>
              {journal.passport.visits} / {journal.passport.target} visites ·{" "}
              {journal.passport.canClaim
                ? "Cadeau prêt à récupérer"
                : "300 pièces + 1 boîte Prisme"}
            </span>
          </span>
          <ChevronDown
            size={18}
            className="journal-passport-chevron"
            aria-hidden="true"
          />
        </summary>
        <div className="journal-passport">
          <p>
            Un tampon par cadeau du jour récupéré. Vos visites comptent, même
            espacées.
          </p>
          <ol
            className="journal-stamps"
            aria-label={`${journal.passport.visits} visite${journal.passport.visits === 1 ? "" : "s"} sur ${journal.passport.target}`}
          >
            {Array.from({ length: journal.passport.target }, (_, index) => (
              <li
                key={index}
                className={index < journal.passport.visits ? "is-stamped" : ""}
                aria-label={`Visite ${index + 1}${index < journal.passport.visits ? " enregistrée" : " à venir"}`}
              >
                {index < journal.passport.visits ? (
                  <Check size={17} aria-hidden="true" />
                ) : (
                  index + 1
                )}
              </li>
            ))}
          </ol>
          <div className="journal-passport-prize">
            <strong>
              {numberFormat.format(journal.passport.reward.coins ?? 0)} pièces +
              1 boîte Prisme
            </strong>
            <span>
              Après {journal.passport.target} visites · aucune série à
              maintenir.
            </span>
          </div>
          {journal.passport.canClaim && (
            <button
              type="button"
              className="journal-small-button journal-passport-button"
              disabled={blocked || !!passportCapacity}
              onClick={() => {
                if (blocked || passportCapacity || !journal.passport.canClaim)
                  return;
                void act(
                  { type: "claim-passport" },
                  "Passeport complété : 300 pièces et une boîte Prisme reçues !",
                );
              }}
            >
              Récupérer le cadeau du passeport{" "}
              <ArrowRight size={15} aria-hidden="true" />
            </button>
          )}
          {journal.passport.canClaim && passportCapacity && (
            <p className="journal-capacity-note">{passportCapacity}</p>
          )}
        </div>
      </details>
      <p className="journal-reset-note">
        Une nouvelle page chaque jour à {resetTime} (heure locale). Les jours
        manqués ne retirent aucun tampon.
      </p>
    </section>
  );
}
