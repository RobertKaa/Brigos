import { useEffect, useId, useMemo, useState } from "react";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  Clock3,
  Coins,
  Layers3,
} from "lucide-react";
import { RECIPES, RECIPE_BY_ID } from "../game/catalog";
import { MAX_VALUE } from "../game/engine";
import {
  getProduction,
  PRODUCTION_RESERVE_MS,
  recipeProductionIntervalMs,
} from "../game/production";
import type { Game } from "../screens/types";
import "./ProductionPanel.css";

const numberFormat = new Intl.NumberFormat("fr-FR");
const format = (value: number) => numberFormat.format(value);
const HOUR_MS = 3_600_000;
const catalogCycleHours = RECIPES.map(
  (recipe) => recipeProductionIntervalMs(recipe) / HOUR_MS,
);
const minimumCycleHours = Math.min(...catalogCycleHours);
const maximumCycleHours = Math.max(...catalogCycleHours);
type Production = ReturnType<typeof getProduction>;
type ProductionRow = Production["rows"][number];
type ProductionGroup = {
  recipeId: string;
  copies: number;
  ready: number;
  capacity: number;
  perCycle: number;
  perDay: number;
  cycleMs: number;
  nextReadyAt: number | null;
};

function useProductionTime(game: Game) {
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

function groupProduction(rows: ProductionRow[]): ProductionGroup[] {
  const groups = new Map<string, ProductionGroup>();
  for (const row of rows) {
    const current = groups.get(row.recipeId);
    if (current) {
      current.copies++;
      current.ready += row.ready;
      current.capacity += row.capacity;
      current.perCycle += row.perCycle;
      current.perDay += row.perDay;
      if (row.nextReadyAt !== null)
        current.nextReadyAt =
          current.nextReadyAt === null
            ? row.nextReadyAt
            : Math.min(current.nextReadyAt, row.nextReadyAt);
    } else {
      groups.set(row.recipeId, {
        recipeId: row.recipeId,
        copies: 1,
        ready: row.ready,
        capacity: row.capacity,
        perCycle: row.perCycle,
        perDay: row.perDay,
        cycleMs: row.cycleMs,
        nextReadyAt: row.nextReadyAt,
      });
    }
  }
  return [...groups.values()].sort(
    (a, b) =>
      Number(b.ready > 0) - Number(a.ready > 0) ||
      b.ready - a.ready ||
      a.recipeId.localeCompare(b.recipeId),
  );
}

function remainingTime(at: number, now: number): string {
  const minutes = Math.max(1, Math.ceil((at - now) / 60_000));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours
    ? `dans ${hours} h${rest ? ` ${rest.toString().padStart(2, "0")}` : ""}`
    : `dans ${minutes} min`;
}

/** Notify only after the same atomic save that credits the actual harvest. */
async function harvestProductions(
  game: Game,
  recipeId: string | undefined,
  nowMs: number,
): Promise<boolean> {
  if (!game.ready || game.busy) return false;
  const available = getProduction(game.state, nowMs);
  const ready = recipeId
    ? available.rows
        .filter((row) => row.recipeId === recipeId)
        .reduce((sum, row) => sum + row.ready, 0)
    : available.totalReady;
  if (!ready || game.state.coins + ready > MAX_VALUE) return false;
  const saved = await game.act(
    recipeId
      ? { type: "collect-production", recipeId }
      : { type: "collect-production" },
  );
  const received = saved?.result.coins;
  if (typeof received === "number" && received > 0)
    game.notify(
      `+${format(received)} pièce${received > 1 ? "s" : ""} récoltée${received > 1 ? "s" : ""} grâce à vos créations.`,
    );
  return !!saved;
}

export const harvestAllProductions = (
  game: Game,
  nowMs = game.now?.() ?? Date.now(),
) => harvestProductions(game, undefined, nowMs);

export const harvestRecipeProduction = (
  game: Game,
  recipeId: string,
  nowMs = game.now?.() ?? Date.now(),
) => harvestProductions(game, recipeId, nowMs);

function ProductionMark() {
  return (
    <svg
      className="production-mark"
      viewBox="0 0 80 80"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 45 28 36 44 45V60L28 70 12 60Zm30-18 15-9 15 9V43L57 52 42 43Z"
        className="production-mark-faces"
      />
      <path d="m12 45 16 10 16-10M28 55v15m14-43 15 9 15-9M57 36v16M26 35V16m-7 7 7-7 7 7M6 31h6m57 26 4 4m-5 2 7-7" />
      <path d="m28 40 9 5-9 6-9-6Zm29-18 8 5-8 5-8-5Z" />
    </svg>
  );
}

function ProductionGroupRow({
  group,
  now,
  clockAdjusted,
  game,
}: {
  group: ProductionGroup;
  now: number;
  clockAdjusted: boolean;
  game: Game;
}) {
  const recipe = RECIPE_BY_ID.get(group.recipeId);
  const full = group.ready >= group.capacity;
  return (
    <li className={`production-row${full ? " is-full" : ""}`}>
      <button
        className="production-row-stack"
        type="button"
        disabled={
          !game.ready ||
          game.busy ||
          !group.ready ||
          game.state.coins + group.ready > MAX_VALUE
        }
        aria-label={`Récolter ${format(group.ready)} pièce${group.ready > 1 ? "s" : ""} : ${recipe?.name ?? "Création Brigo"}, ${format(group.copies)} exemplaire${group.copies > 1 ? "s" : ""}`}
        title={
          group.ready
            ? "Récolter les pièces de tous ces exemplaires"
            : "Production en cours"
        }
        onClick={() => void harvestRecipeProduction(game, group.recipeId)}
      >
        <span className="production-row-stack-icon" aria-hidden="true">
          {full ? <Check size={22} /> : <Coins size={22} />}
        </span>
        <span className="production-row-stack-count" aria-hidden="true">
          ×{format(group.copies)}
        </span>
      </button>
      <div className="production-row-copy">
        <h3>{recipe?.name ?? "Création Brigo"}</h3>
        <p>
          {format(group.copies)} exemplaire{group.copies > 1 ? "s" : ""}
          <span aria-hidden="true"> · </span>
          {group.copies > 1 && `${format(group.copies)} × `}
          {format(group.perCycle / group.copies)} pièce
          {group.perCycle / group.copies > 1 ? "s" : ""} /{" "}
          {group.cycleMs / HOUR_MS} h
        </p>
        <span className="production-row-daily">
          Soit {format(group.perDay)} pièces / jour
          {group.copies > 1 ? " pour la pile" : ""}
        </span>
        <span className="production-row-timing">
          {full
            ? "Réserve pleine · récoltez pour reprendre"
            : clockAdjusted
              ? "Production en attente de l’horloge"
              : group.nextReadyAt !== null
                ? `Prochaine récolte ${remainingTime(group.nextReadyAt, now)}`
                : "Production en cours"}
        </span>
      </div>
      <div className="production-row-reserve">
        <span>
          <strong>{format(group.ready)}</strong> / {format(group.capacity)}
          <span className="visually-hidden"> pièces à récolter</span>
        </span>
        <meter
          min={0}
          max={group.capacity}
          value={group.ready}
          aria-label={`Réserve : ${recipe?.name ?? "Création Brigo"}`}
        />
      </div>
    </li>
  );
}

export function ProductionPanel({
  game,
  compact = false,
}: {
  game: Game;
  compact?: boolean;
}) {
  const now = useProductionTime(game);
  const headingId = useId();
  const noteId = useId();
  const production = useMemo(
    // A successful action can advance observedAt between two timer ticks.
    // Read the real render time; `now` only triggers the periodic refresh.
    () => getProduction(game.state, game.now?.() ?? Date.now()),
    [game.state, now],
  );
  const groups = useMemo(
    () => groupProduction(production.rows),
    [production.rows],
  );
  const activeCycleHours = groups.length
    ? groups.map((group) => group.cycleMs / HOUR_MS)
    : catalogCycleHours;
  const earliestCycle = Math.min(...activeCycleHours);
  const latestCycle = Math.max(...activeCycleHours);
  const cycleLabel =
    earliestCycle === latestCycle
      ? `${earliestCycle} H`
      : `${earliestCycle}–${latestCycle} H`;
  const capacityHours = PRODUCTION_RESERVE_MS / HOUR_MS;
  const totalCapacity = groups.reduce((sum, group) => sum + group.capacity, 0);
  const readyToHarvest = production.totalReady > 0;
  const hasCreations = production.producingCount > 0;
  const blocked =
    !game.ready || game.busy || !readyToHarvest || production.capacityBlocked;
  const rowProps = {
    now,
    clockAdjusted: production.clockAdjusted,
    game,
  };

  return (
    <section
      className={`production-panel${compact ? " production-panel-compact" : ""}${readyToHarvest ? " has-harvest" : ""}`}
      aria-labelledby={headingId}
      aria-busy={game.busy}
      data-production-ready={production.totalReady}
    >
      <div className="production-heading">
        <ProductionMark />
        <div className="production-heading-copy">
          <span className="production-eyebrow">LES RÉCOLTES DE L’ATELIER</span>
          <h2 id={headingId}>Des créations qui rapportent.</h2>
          <p>
            Vos constructions produisent des pièces, même hors ligne. Les petits
            plans sont plus rapides ; les grandes créations rapportent de plus
            gros lots. Chaque copie et la rareté des matériaux comptent.
          </p>
        </div>
        {!compact && (
          <span className="production-cycle-stamp" aria-hidden="true">
            <strong>{cycleLabel}</strong>
            SELON LE PLAN
          </span>
        )}
      </div>

      {hasCreations ? (
        <>
          <div className="production-overview">
            <div className="production-ready-total">
              <span>À récolter</span>
              <strong>
                {format(production.totalReady)}{" "}
                <span>pièce{production.totalReady > 1 ? "s" : ""}</span>
              </strong>
              <span className="production-next-harvest">
                {production.clockAdjusted
                  ? "L’horloge doit être rétablie pour produire à nouveau."
                  : production.nextReadyAt !== null
                    ? `Prochaine récolte ${remainingTime(production.nextReadyAt, now)}`
                    : "Toutes les réserves sont pleines."}
              </span>
            </div>
            <div className="production-daily-total">
              <Layers3 size={19} aria-hidden="true" />
              <div>
                <strong>{format(production.totalPerDay)} pièces / jour</strong>
                <span>
                  {format(production.producingCount)} création
                  {production.producingCount > 1 ? "s" : ""} en activité
                </span>
              </div>
            </div>
            <button
              type="button"
              className="production-harvest-button"
              disabled={blocked}
              aria-describedby={noteId}
              onClick={() => void harvestAllProductions(game)}
            >
              <Coins size={19} aria-hidden="true" />
              {game.busy
                ? "Enregistrement…"
                : readyToHarvest
                  ? `Récolter ${format(production.totalReady)} pièce${production.totalReady > 1 ? "s" : ""}`
                  : "En cours de production"}
            </button>
          </div>

          {production.clockAdjusted && (
            <p className="production-warning" role="status">
              L’horloge a changé. Les pièces déjà produites restent disponibles
              ; les prochains attendront que la date soit rétablie.
            </p>
          )}
          {production.capacityBlocked && (
            <p className="production-warning" role="status">
              Votre réserve de pièces ne peut pas accueillir toute cette
              récolte. Dépensez quelques pièces pour faire de la place. Votre
              récolte reste en réserve.
            </p>
          )}

          {!compact && (
            <div className="production-ledger">
              <div className="production-ledger-heading">
                <h3>Le rendement de vos créations</h3>
                <span>Réserve disponible / maximum</span>
              </div>
              <ul className="production-list">
                {groups.slice(0, 5).map((group) => (
                  <ProductionGroupRow
                    key={group.recipeId}
                    group={group}
                    {...rowProps}
                  />
                ))}
              </ul>
              {groups.length > 5 && (
                <details className="production-more">
                  <summary>
                    Voir {format(groups.length - 5)} autre
                    {groups.length - 5 > 1 ? "s" : ""} plan
                    {groups.length - 5 > 1 ? "s" : ""}
                    <ChevronDown size={17} aria-hidden="true" />
                  </summary>
                  <ul className="production-list">
                    {groups.slice(5).map((group) => (
                      <ProductionGroupRow
                        key={group.recipeId}
                        group={group}
                        {...rowProps}
                      />
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
          <div className="production-footer" id={noteId}>
            <Clock3 size={16} aria-hidden="true" />
            <p>
              La production continue hors ligne, jusqu’à {capacityHours} h de
              réserve{!compact && ` (${format(totalCapacity)} pièces au total)`}
              . Récoltez pour libérer de la place. Vos créations restent
              intactes.
            </p>
            {compact && (
              <a href="#workshop">
                Voir mes créations <ArrowUpRight size={16} aria-hidden="true" />
              </a>
            )}
          </div>
        </>
      ) : (
        <div className="production-empty" id={noteId}>
          <div>
            <strong>Votre première création lance l’aventure.</strong>
            <p>
              Un petit plan commence à produire après {minimumCycleHours} h. Les
              cycles des grandes créations vont jusqu’à {maximumCycleHours} h,
              avec de plus gros lots. Chaque exemplaire ajoute son rendement.
              Les projets libres du bac à sable ne produisent pas.
            </p>
          </div>
          <a href="#workshop">
            Choisir un plan <ArrowUpRight size={17} aria-hidden="true" />
          </a>
        </div>
      )}
    </section>
  );
}
