import { lazy, Suspense, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import {
  ArrowRight,
  Check,
  ChevronRight,
  Coins,
  Hammer,
  Layers3,
  Package,
  Play,
  ShieldCheck,
  SkipForward,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import {
  BOXES,
  BOX_IDS,
  BOX_DROP_COUNT,
  BRIGO_BY_ID,
  RARITIES,
  RARITY_INFO,
} from "../game/catalog";
import type { BoxId } from "../game/catalog";
import type { Opening } from "../game/engine";
import { BrigoArt } from "./BrigoArt";
import { Modal } from "./Modal";
import { OpeningChest } from "./OpeningChest";
import { CardBackArt } from "./CardBackArt";
import {
  CHEST_ANIMATION_MS,
  createRevealSession,
  finishChest,
  nextHiddenDrop,
  revealDrop,
  revealEveryDrop,
} from "./openingSession";
import "./opening.css";

const PixiSparkles = lazy(() => import("./PixiSparkles"));

export function OpeningModal({
  opening,
  reducedMotion,
  busy,
  coins,
  boxes,
  persistent = true,
  goal,
  onOpenNext,
  onClose,
  onCollection,
}: {
  opening: Opening;
  reducedMotion: boolean;
  busy: boolean;
  coins: number;
  boxes: Record<BoxId, number>;
  persistent?: boolean;
  goal?: {
    name: string;
    available: number;
    total: number;
    completed?: boolean;
    onView: () => void;
  };
  onOpenNext: (boxId: BoxId) => void;
  onClose: () => void;
  onCollection: () => void;
}) {
  const [session, setSession] = useState(() =>
    createRevealSession(opening.id, reducedMotion),
  );
  const [nextBox, setNextBox] = useState<BoxId>(opening.boxId);
  const stage = useRef<HTMLDivElement>(null);
  const focusAfterReveal = useRef(false);
  // Saved drops have already been credited by the engine. This session is purely visual.
  // Reconcile immediately so the previous box never flashes when opening the next one.
  const current =
    session.id === opening.id
      ? session
      : createRevealSession(opening.id, reducedMotion);
  const { revealed, cascading } = current;
  const openingBox = current.phase === "unsealing";
  const count = opening.drops.length;
  const all = revealed.length === count;

  useEffect(() => {
    setSession(createRevealSession(opening.id, reducedMotion));
    setNextBox(opening.boxId);
    focusAfterReveal.current = false;
    const dialog = stage.current?.closest("dialog");
    dialog?.scrollTo({ top: 0, left: 0, behavior: "instant" });
    dialog
      ?.querySelector<HTMLButtonElement>(
        reducedMotion ? ".reveal-card" : ".opening-skip",
      )
      ?.focus({ preventScroll: true });
    if (reducedMotion) return;
    const timeout = window.setTimeout(() => {
      if (
        document.activeElement === stage.current?.querySelector(".opening-skip")
      )
        focusAfterReveal.current = true;
      setSession((previous) => finishChest(previous, opening.id));
    }, CHEST_ANIMATION_MS);
    return () => window.clearTimeout(timeout);
    // Preferences changing while an opening is visible must never restart its animation.
  }, [opening.id, opening.boxId]);

  useEffect(() => {
    if (reducedMotion) {
      if (
        document.activeElement === stage.current?.querySelector(".opening-skip")
      )
        focusAfterReveal.current = true;
      setSession((previous) =>
        previous.cascading
          ? revealEveryDrop(previous, count)
          : finishChest(previous, opening.id),
      );
    }
  }, [reducedMotion, opening.id]);

  useEffect(() => {
    if (openingBox || !focusAfterReveal.current) return;
    // Keep keyboard users with their discoveries, never on an off-screen purchase.
    // Starting a cascade also transfers focus before its trigger becomes disabled.
    stage.current
      ?.querySelector<HTMLButtonElement>(".reveal-card")
      ?.focus({ preventScroll: true });
    focusAfterReveal.current = false;
  }, [openingBox, all, cascading]);

  useEffect(() => {
    if (!cascading || busy) return;
    const next = nextHiddenDrop(current, count);
    if (next === undefined) return;
    const last = revealed.at(-1);
    const previousRarity =
      last === undefined
        ? "common"
        : BRIGO_BY_ID.get(opening.drops[last].brigoId)!.rarity;
    const delay = reducedMotion
      ? 0
      : previousRarity === "legendary"
        ? 480
        : previousRarity === "epic"
          ? 320
          : 170;
    const timeout = window.setTimeout(() => {
      setSession((previous) =>
        previous.id === opening.id
          ? revealDrop(previous, next, count)
          : previous,
      );
    }, delay);
    return () => window.clearTimeout(timeout);
  }, [
    cascading,
    busy,
    current,
    count,
    opening.id,
    opening.drops,
    reducedMotion,
    revealed,
  ]);

  const reveal = (index: number) => {
    if (busy || revealed.includes(index)) return;
    setSession(revealDrop(current, index, count));
  };
  const revealAll = () => {
    if (!busy) {
      focusAfterReveal.current = true;
      setSession(revealEveryDrop(current, count));
    }
  };
  const startCascade = () => {
    if (busy) return;
    focusAfterReveal.current = true;
    setSession(
      reducedMotion
        ? revealEveryDrop(current, count)
        : { ...current, phase: "cards", cascading: true },
    );
  };
  const newCount = opening.drops.filter((drop) => drop.isNew).length;
  const bestRarity = opening.drops.reduce(
    (best, drop) => {
      const rarity = BRIGO_BY_ID.get(drop.brigoId)!.rarity;
      return RARITIES.indexOf(rarity) > RARITIES.indexOf(best) ? rarity : best;
    },
    "common" as (typeof RARITIES)[number],
  );
  const cost = boxes[nextBox] > 0 ? 0 : BOXES[nextBox].cost;
  const canOpenNext = boxes[nextBox] > 0 || coins >= cost;
  const revealControls = (
    <div className="opening-reveal-buttons">
      {!openingBox && (
        <button
          type="button"
          className="button button-secondary"
          onClick={startCascade}
          disabled={busy || cascading}
        >
          <Play size={15} /> {cascading ? "Découverte en cours…" : "Une à une"}
        </button>
      )}
      <button
        type="button"
        className="button button-primary"
        onClick={revealAll}
        disabled={busy}
      >
        <WandSparkles size={17} /> Tout révéler
      </button>
    </div>
  );

  return (
    <Modal
      title={
        all ? "La collection s’agrandit." : "La surprise est entre vos mains."
      }
      eyebrow={`LE STUDIO DES DÉCOUVERTES · ${BOXES[opening.boxId].name.toUpperCase()}${opening.testRarity ? " · TIRAGE TEST" : ""}`}
      onClose={onClose}
      wide
      className={`opening-modal ${all ? "opening-complete" : ""} ${reducedMotion ? "opening-reduced-motion" : ""}`}
    >
      <div
        className={`reveal-stage ${openingBox ? "is-unsealing" : ""}`}
        key={opening.id}
        ref={stage}
      >
        {!reducedMotion && !openingBox && (
          <Suspense fallback={null}>
            <PixiSparkles
              trigger={revealed.length}
              reducedMotion={reducedMotion}
            />
          </Suspense>
        )}
        {openingBox ? (
          <div className="opening-unseal">
            <span className="opening-stage-kicker">
              <Sparkles size={14} /> PLACE À LA DÉCOUVERTE
            </span>
            <OpeningChest
              kind={opening.boxId}
              count={count}
              rarities={opening.drops.map(
                (drop) => BRIGO_BY_ID.get(drop.brigoId)!.rarity,
              )}
            />
            <div className="opening-unseal-caption">
              <strong>{count} cartes. L’inspiration à l’intérieur.</strong>
              <p>
                Le couvercle se soulève… vos prochaines pièces prennent vie.
              </p>
              <button
                type="button"
                className="opening-skip"
                onClick={() => {
                  focusAfterReveal.current = true;
                  setSession(finishChest(current, opening.id));
                }}
              >
                <SkipForward size={14} /> Passer l’animation
              </button>
            </div>
          </div>
        ) : (
          <>
            <div
              className="opening-progress"
              aria-label={`${revealed.length} Brigos révélés sur ${count}`}
            >
              <span>
                <Layers3 size={15} />{" "}
                {all ? "VOTRE NOUVELLE SÉRIE" : "LE GRAND RETOURNEMENT"}
              </span>
              <div className="opening-progress-dots" aria-hidden="true">
                {opening.drops.map((_, index) => (
                  <i
                    key={index}
                    className={revealed.includes(index) ? "is-filled" : ""}
                  />
                ))}
              </div>
              <strong aria-hidden="true">
                {revealed.length}
                <small> / {count}</small>
              </strong>
            </div>
            <p
              className="reveal-instruction"
              aria-live="polite"
              aria-atomic="true"
            >
              {opening.testRarity && (
                <strong>
                  Rareté forcée : {RARITY_INFO[opening.testRarity].name}.{" "}
                </strong>
              )}
              {all
                ? newCount > 0
                  ? `${newCount} nouvelle${newCount > 1 ? "s" : ""} découverte${newCount > 1 ? "s" : ""}. Votre prochain projet se rapproche.`
                  : `${count} pièces de plus pour donner vie à vos projets.`
                : cascading
                  ? "Les découvertes arrivent, une à une…"
                  : "Un halo, un indice. Touchez une carte pour découvrir votre pièce."}
            </p>
            {!all && (
              <div
                className="opening-rarity-guide"
                aria-label="Les cinq raretés, identifiables par leur halo, leur symbole et leur nom"
              >
                {RARITIES.map((rarity) => (
                  <span key={rarity} className={`rarity-${rarity}`}>
                    <b aria-hidden="true">{RARITY_INFO[rarity].symbol}</b>
                    {RARITY_INFO[rarity].name}
                  </span>
                ))}
              </div>
            )}
            {!all && (
              <div className="opening-reveal-toolbar">{revealControls}</div>
            )}
            <div
              className="reveal-grid"
              aria-label={`Les ${count} Brigos de cette boîte`}
            >
              {opening.drops.map((drop, index) => {
                const brigo = BRIGO_BY_ID.get(drop.brigoId)!;
                const visible = revealed.includes(index);
                return (
                  <button
                    type="button"
                    key={index}
                    className={`reveal-card rarity-${brigo.rarity} ${visible ? `is-revealed ${drop.isNew ? "is-new" : ""}` : "is-hidden"}`}
                    style={
                      {
                        "--card-index": index,
                      } as CSSProperties
                    }
                    aria-label={
                      visible
                        ? `Pièce ${index + 1} : ${brigo.name}, ${RARITY_INFO[brigo.rarity].name}${drop.isNew ? ", nouvelle découverte" : ", déjà découverte"}`
                        : `Révéler la pièce ${index + 1} : halo ${RARITY_INFO[brigo.rarity].name}`
                    }
                    aria-disabled={visible || busy}
                    onClick={() => reveal(index)}
                  >
                    <span className="opening-card-flipper">
                      <span
                        className="opening-card-face opening-card-back"
                        aria-hidden="true"
                      >
                        <span className="opening-card-topline">
                          <span>{String(index + 1).padStart(2, "0")}</span>
                          <b>{RARITY_INFO[brigo.rarity].symbol}</b>
                        </span>
                        <span className="opening-card-brand">BRIGOS</span>
                        <CardBackArt />
                        <span className="opening-back-rarity">
                          {RARITY_INFO[brigo.rarity].symbol}{" "}
                          {RARITY_INFO[brigo.rarity].name}
                        </span>
                        <span className="opening-card-prompt">
                          Retourner <ArrowRight size={12} />
                        </span>
                      </span>
                      {visible && (
                        <span
                          className="opening-card-face opening-card-front"
                          aria-hidden="true"
                        >
                          <span className="opening-card-topline">
                            <span>
                              #{String(brigo.number).padStart(3, "0")}
                            </span>
                            <b>{RARITY_INFO[brigo.rarity].symbol}</b>
                          </span>
                          <span
                            className={`drop-label ${drop.isNew ? "new" : "duplicate"}`}
                          >
                            {drop.isNew ? (
                              <>
                                <Sparkles size={11} /> Nouveau
                              </>
                            ) : (
                              <>
                                <Check size={11} /> Dans l’album
                              </>
                            )}
                          </span>
                          <span className="opening-card-illustration">
                            <BrigoArt brigo={brigo} />
                          </span>
                          <span className="rarity-label">
                            {RARITY_INFO[brigo.rarity].symbol}{" "}
                            {RARITY_INFO[brigo.rarity].name}
                          </span>
                          <strong>{brigo.model.name}</strong>
                          <span className="piece-color">
                            <i style={{ background: brigo.color.hex }} />
                            {brigo.color.name}
                          </span>
                          <span className="opening-card-edition">
                            PIÈCE D’INSPIRATION · BRIGOS
                          </span>
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
            {all && (
              <div className="opening-findings">
                <span>
                  <Check size={15} /> <strong>{count}</strong> Brigos ajoutés à
                  l’inventaire
                </span>
                <span className={`opening-best rarity-${bestRarity}`}>
                  <Sparkles size={15} /> Meilleure trouvaille :{" "}
                  <strong>{RARITY_INFO[bestRarity].name}</strong>
                </span>
              </div>
            )}
          </>
        )}
      </div>
      {all && goal && (
        <div className="opening-goal">
          <div>
            <span className="opening-goal-icon">
              <Hammer size={19} />
            </span>
            <span>
              <small>VOTRE PROJET EN COURS</small>
              <strong>{goal.name}</strong>
              <p>
                {goal.completed
                  ? "Objectif réalisé !"
                  : `${goal.available.toLocaleString("fr-FR")} / ${goal.total.toLocaleString("fr-FR")} pièces réunies`}
              </p>
            </span>
          </div>
          <button
            type="button"
            className="text-link"
            onClick={goal.onView}
            disabled={busy}
          >
            Voir le projet <ChevronRight size={15} />
          </button>
        </div>
      )}
      {all && (
        <section
          className="opening-next"
          aria-label="Ouvrir une autre boîte"
          aria-busy={busy}
        >
          <div className="opening-next-heading">
            <div>
              <Package size={20} />
              <h3>Une autre découverte ?</h3>
            </div>
            <span>
              <Coins size={15} /> {coins.toLocaleString("fr-FR")} pièces
            </span>
          </div>
          <div
            className="opening-next-types"
            aria-label="Type de prochaine boîte"
          >
            {BOX_IDS.map((id) => (
              <button
                key={id}
                type="button"
                className={nextBox === id ? "is-selected" : ""}
                aria-pressed={nextBox === id}
                disabled={busy}
                onClick={() => setNextBox(id)}
                style={
                  {
                    "--box-accent": BOXES[id].color,
                    "--box-outline": BOXES[id].palette.accent,
                  } as CSSProperties
                }
              >
                <i aria-hidden="true" />
                <strong>{BOXES[id].name}</strong>
                <span>
                  {boxes[id] > 0
                    ? `${boxes[id]} en réserve`
                    : `${BOXES[id].cost} pièces`}
                </span>
                {nextBox === id && (
                  <Check
                    className="opening-next-check"
                    size={14}
                    aria-hidden="true"
                  />
                )}
              </button>
            ))}
          </div>
          <div className="opening-next-action">
            <p>
              <strong>{BOX_DROP_COUNT} nouveaux Brigos</strong>
              <br />
              {cost === 0
                ? "1 boîte de la réserve · aucune pièce dépensée"
                : `${cost} pièces déduites à l’ouverture`}
            </p>
            <button
              type="button"
              className="button button-primary"
              disabled={busy || !canOpenNext}
              onClick={() => onOpenNext(nextBox)}
            >
              {busy
                ? "Ouverture…"
                : canOpenNext
                  ? "Ouvrir la suivante"
                  : "Pièces insuffisantes"}
              <ArrowRight size={17} />
            </button>
          </div>
        </section>
      )}
      <div className="modal-actions reveal-actions">
        <span>
          <ShieldCheck size={16} />
          {persistent ? "Collection sauvegardée" : "Session temporaire"}
        </span>
        {!all ? (
          openingBox ? (
            revealControls
          ) : (
            <span>Les surprises se découvrent à votre rythme.</span>
          )
        ) : (
          <div className="opening-footer-buttons">
            <button
              type="button"
              className="button button-secondary"
              onClick={onClose}
              disabled={busy}
            >
              Terminer
            </button>
            <button
              type="button"
              className="button button-secondary"
              onClick={onCollection}
              disabled={busy}
            >
              Ma collection <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
