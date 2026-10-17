import {
  ArrowRight,
  Check,
  ChevronRight,
  Coins,
  Crown,
  Hammer,
  Layers3,
  Package,
  Sparkles,
  Target,
} from "lucide-react";
import type { CSSProperties } from "react";
import {
  albumCatalog,
  BOXES,
  BOX_IDS,
  BOX_DROP_COUNT,
  BRIGO_BY_ID,
  RARITIES,
  RARITY_INFO,
  RECIPES,
} from "../game/catalog";
import type { BoxId, Brigo } from "../game/catalog";
import {
  inventoryCount,
  reservedCount,
  reservedBrigoCount,
  trackedRecipeProgress,
  totalBoxes,
} from "../game/engine";
import { BoxArt, ConstructionArt } from "../components/BrigoArt";
import { BrigoCard } from "../components/BrigoCard";
import { PlayerProgress } from "../components/PlayerProgress";
import type { Game } from "./types";
import { JournalLink } from "./Journal";
import { getChallenges } from "../game/progression";
import "./boxes-flow.css";

const number = (value: number) => value.toLocaleString("fr-FR");

export function Home({
  game,
  selectedBox,
  onSelectBox,
  onOpen,
  onOdds,
  onBrigo,
  onRecipe,
}: {
  game: Game;
  selectedBox: BoxId;
  onSelectBox: (id: BoxId) => void;
  onOpen: (id: BoxId) => void;
  onOdds: (id: BoxId) => void;
  onBrigo: (brigo: Brigo) => void;
  onRecipe: (id: string) => void;
}) {
  const { state, ready, busy } = game;
  const box = BOXES[selectedBox];
  const owned = state.boxes[selectedBox];
  const total = inventoryCount(state) + reservedCount(state);
  const album = albumCatalog(state.discovered);
  const percentage = Math.round((state.discovered.length / album.length) * 100);
  const suggested =
    RECIPES.find((recipe) => recipe.id === state.goalRecipeId) ??
    RECIPES.find(
      (recipe) =>
        !state.constructions.some((built) => built.recipeId === recipe.id),
    ) ??
    RECIPES[0];
  const goal = trackedRecipeProgress(state, suggested);
  const recentIds = [
    ...new Set(
      state.history.flatMap((opening) =>
        opening.drops.map((drop) => drop.brigoId),
      ),
    ),
  ].slice(0, 6);
  const examples = [
    "brick-2x2:coral",
    "plate-2x4:yellow",
    "slope-2x2:green",
    "round-2x2:blue",
    "special-cross:violet",
    "arch-1x4:ivory",
  ];
  const locked = !ready || busy;
  const missingCoins = Math.max(0, box.cost - state.coins);
  const canOpen = !locked && (owned > 0 || missingCoins === 0);
  const availableRewards = getChallenges(state).filter(
    (challenge) => challenge.canClaim,
  ).length;

  return (
    <div className="home-studio boxes-flow">
      <div className="studio-journal-line" aria-hidden="true">
        <span>LE JOURNAL BRIGOS</span>
        <span>COLLECTIONNER · ASSEMBLER · IMAGINER</span>
        <span>VOL. 01 / L’IMAGINATION EN PIÈCES</span>
      </div>
      <div className="page-intro boxes-intro">
        <div>
          <span className="eyebrow">
            <i /> LE COMPTOIR BRIGOS
          </span>
          <h1>Ouvrir une boîte.</h1>
          <p>
            Choisissez une boîte, puis découvrez vos {BOX_DROP_COUNT} cartes.
          </p>
        </div>
        <div
          className="boxes-wallet"
          aria-label="Votre réserve et votre monnaie"
        >
          <span>
            <Coins size={17} aria-hidden="true" />{" "}
            <strong>{number(state.coins)}</strong> pièces
          </span>
          <span>
            <Package size={17} aria-hidden="true" />{" "}
            <strong>{number(totalBoxes(state))}</strong> boîtes en réserve
          </span>
        </div>
      </div>

      <div className="boxes-dashboard">
        <section
          className="boxes-counter"
          aria-labelledby="boxes-choice-heading"
        >
          <div className="boxes-counter-heading">
            <h2 id="boxes-choice-heading">1. Choisir une boîte</h2>
            <span>{BOX_DROP_COUNT} BRIGOS / BOÎTE</span>
          </div>
          <div
            className="boxes-choices"
            role="group"
            aria-label="Choisir une boîte"
          >
            {BOX_IDS.map((id) => (
              <article
                key={id}
                className={`boxes-choice boxes-choice-${id}${selectedBox === id ? " is-selected" : ""}`}
                style={
                  {
                    "--box-color": BOXES[id].color,
                    "--box-accent": BOXES[id].palette.accent,
                  } as CSSProperties
                }
              >
                <button
                  type="button"
                  className="boxes-choice-select"
                  aria-pressed={selectedBox === id}
                  aria-label={`Choisir la boîte ${BOXES[id].name}`}
                  aria-describedby={`boxes-${id}-price boxes-${id}-stock boxes-${id}-chances`}
                  disabled={locked}
                  onClick={() => {
                    if (!locked) onSelectBox(id);
                  }}
                >
                  <span className="boxes-choice-art" aria-hidden="true">
                    <BoxArt kind={id} />
                  </span>
                  <span className="boxes-choice-copy">
                    <span className="boxes-choice-name">
                      <strong>{BOXES[id].name}</strong>
                      <span className="boxes-choice-check" aria-hidden="true">
                        {selectedBox === id && <Check size={15} />}
                      </span>
                    </span>
                    <span
                      className="boxes-choice-price"
                      id={`boxes-${id}-price`}
                    >
                      <Coins size={15} aria-hidden="true" />{" "}
                      {number(BOXES[id].cost)} pièces
                    </span>
                    <span
                      className={`boxes-choice-stock${state.boxes[id] ? " has-stock" : ""}`}
                      id={`boxes-${id}-stock`}
                    >
                      {state.boxes[id]
                        ? `${number(state.boxes[id])} en réserve`
                        : "À acheter"}
                    </span>
                    <span
                      className="boxes-choice-chances"
                      id={`boxes-${id}-chances`}
                    >
                      {number(
                        state.rates[id].rare +
                          state.rates[id].epic +
                          state.rates[id].legendary,
                      )}{" "}
                      % de Rare ou mieux
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  className="boxes-choice-odds"
                  onClick={() => onOdds(id)}
                  aria-label={`Probabilités de la boîte ${BOXES[id].name}`}
                >
                  Probabilités <ChevronRight size={14} aria-hidden="true" />
                </button>
              </article>
            ))}
          </div>
          <div className="boxes-opening">
            <div
              className="boxes-opening-copy"
              aria-live="polite"
              aria-atomic="true"
            >
              <h2>2. Ouvrir votre {box.name}</h2>
              <p id="boxes-opening-contract">
                {owned ? (
                  <>
                    1 boîte utilisée dans votre réserve.{" "}
                    <strong>Aucune monnaie dépensée.</strong>
                  </>
                ) : (
                  <>
                    Achat de 1 boîte :{" "}
                    <strong>{number(box.cost)} pièces</strong>, puis ouverture
                    immédiate.
                  </>
                )}
              </p>
            </div>
            <button
              type="button"
              className="button button-primary boxes-open-button"
              aria-describedby="boxes-opening-contract"
              disabled={!canOpen}
              onClick={() => {
                if (canOpen) onOpen(selectedBox);
              }}
            >
              <Sparkles size={18} aria-hidden="true" />
              {busy
                ? "Ouverture…"
                : !ready
                  ? "Chargement…"
                  : owned
                    ? "Ouvrir 1 boîte"
                    : missingCoins
                      ? `Il manque ${number(missingCoins)} pièces`
                      : `Acheter et ouvrir · ${number(box.cost)} pièces`}
              <ArrowRight size={17} aria-hidden="true" />
            </button>
          </div>
          {!owned && missingCoins > 0 && (
            <div className="boxes-earn-note">
              <span>Votre solde : {number(state.coins)} pièces.</span>
              <a href="#journal">
                Gagner des pièces gratuitement{" "}
                <ArrowRight size={16} aria-hidden="true" />
              </a>
            </div>
          )}
        </section>

        <aside className="studio-home-aside">
          <section
            className="studio-album-summary"
            aria-label="Votre collection"
          >
            <div className="studio-section-top">
              <span className="eyebrow">VOTRE COLLECTION</span>
              <a href="#collection" aria-label="Explorer ma collection">
                <ArrowRight size={19} />
              </a>
            </div>
            <div className="studio-album-value">
              <strong>{number(state.discovered.length)}</strong>
              <span>
                / {album.length}
                <small>Brigos découverts</small>
              </span>
              <span className="studio-album-percent">{percentage}%</span>
            </div>
            <div
              className="studio-album-track"
              role="progressbar"
              aria-label="Album complété"
              aria-valuemin={0}
              aria-valuemax={album.length}
              aria-valuenow={state.discovered.length}
            >
              <span style={{ width: `${percentage}%` }} />
            </div>
            <div className="studio-album-stats">
              <div>
                <Layers3 size={17} />
                <strong>{number(total)}</strong>
                <span>pièces réunies</span>
              </div>
              <div>
                <Hammer size={17} />
                <strong>{number(state.constructions.length)}</strong>
                <span>créations exposées</span>
              </div>
            </div>
          </section>
          <button
            type="button"
            className="studio-goal-card"
            onClick={() => onRecipe(suggested.id)}
          >
            <div className="studio-section-top">
              <span className="eyebrow">
                <Target size={14} />{" "}
                {state.goalRecipeId ? "VOTRE OBJECTIF" : "VOTRE PROCHAINE IDÉE"}
              </span>
              <ArrowRight size={18} />
            </div>
            <div className="studio-goal-main">
              <div>
                <h2>{suggested.name}</h2>
                <p>
                  {goal.completed
                    ? "Création réalisée. Explorer le plan."
                    : goal.canBuild
                      ? "Tout est prêt. À vous de construire !"
                      : `${number(goal.available)} / ${number(goal.total)} Brigos réunis`}
                </p>
                <span
                  className={`studio-goal-status ${goal.canBuild ? "is-ready" : ""}`}
                >
                  {goal.completed ? (
                    <>
                      <Check size={14} /> Déjà exposée
                    </>
                  ) : goal.canBuild ? (
                    <>
                      <Hammer size={14} /> Prêt à assembler
                    </>
                  ) : (
                    <>
                      Voir le plan <ChevronRight size={14} />
                    </>
                  )}
                </span>
              </div>
              <ConstructionArt recipeId={suggested.id} quality="preview" />
            </div>
            <div className="studio-goal-track" aria-hidden="true">
              <span
                style={{
                  width: `${Math.min(100, (goal.available / goal.total) * 100)}%`,
                }}
              />
            </div>
          </button>
        </aside>
      </div>

      <JournalLink compact />
      <details className="boxes-progression">
        <summary>
          <span>Ma progression et mes récompenses</span>
          {availableRewards > 0 && (
            <span className="boxes-reward-count">
              {availableRewards} à recevoir
            </span>
          )}
          <ChevronRight size={18} aria-hidden="true" />
        </summary>
        <PlayerProgress game={game} />
      </details>

      <section
        className="home-section studio-recent-section"
        aria-labelledby="studio-recent-heading"
      >
        <div className="section-heading">
          <div>
            <span className="eyebrow">L’ALBUM BRIGOS</span>
            <h2 id="studio-recent-heading">
              {recentIds.length
                ? "Vos dernières trouvailles."
                : "Des pièces, déjà des idées."}
            </h2>
            <p>
              {recentIds.length
                ? "De nouveaux détails pour vos prochains projets."
                : "Des briques essentielles aux formes les plus singulières."}
            </p>
          </div>
          <a href="#collection" className="text-link">
            Explorer l’album <ArrowRight size={17} />
          </a>
        </div>
        <div className="recent-grid">
          {(recentIds.length ? recentIds : examples).map((id) => (
            <BrigoCard
              key={id}
              brigo={BRIGO_BY_ID.get(id)!}
              discovered={state.discovered.includes(id)}
              count={state.inventory[id] ?? 0}
              reserved={reservedBrigoCount(state, id)}
              onClick={() => onBrigo(BRIGO_BY_ID.get(id)!)}
              preview
            />
          ))}
        </div>
      </section>

      <a href="#workshop" className="studio-workshop-invite">
        <span className="studio-invite-icon">
          <Crown size={28} />
        </span>
        <span>
          <small>DES PROJETS À VOTRE MESURE</small>
          <strong>La prochaine grande idée est dans l’atelier.</strong>
          <span>
            {RECIPES.length} plans, des premiers pas aux créations légendaires.
          </span>
        </span>
        <ArrowRight size={24} />
      </a>
    </div>
  );
}

export function OddsContent({ game, boxId }: { game: Game; boxId: BoxId }) {
  return (
    <div className="odds-content">
      <div className="studio-odds-summary">
        <BoxArt kind={boxId} />
        <div>
          <strong>{BOXES[boxId].name}</strong>
          <span>
            {BOX_DROP_COUNT} Brigos · {BOXES[boxId].cost} pièces
          </span>
        </div>
      </div>
      <p>
        Ces chances s’appliquent à{" "}
        <strong>chacun des {BOX_DROP_COUNT} Brigos</strong>. Les tirages sont
        indépendants ; les doublons sont possibles. Aucune rareté n’est garantie
        par boîte.
      </p>
      <div className="odds-list">
        {RARITIES.map((rarity) => (
          <div key={rarity} className={`rarity-${rarity}`}>
            <span className="rarity-label">
              {RARITY_INFO[rarity].symbol} {RARITY_INFO[rarity].name}
            </span>
            <span className="odds-track">
              <i
                style={{
                  width: `${game.state.rates[boxId][rarity]}%`,
                  background: RARITY_INFO[rarity].color,
                }}
              />
            </span>
            <strong>{game.state.rates[boxId][rarity]} %</strong>
          </div>
        ))}
      </div>
      <p className="form-help">
        La rareté dépend de la forme. Toutes les couleurs d’un modèle ont la
        même chance d’être obtenues.
      </p>
    </div>
  );
}
