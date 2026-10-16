import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronRight,
  Crown,
  Clock3,
  Coins,
  Hammer,
  Layers3,
  RotateCcw,
  Search,
  Target,
  X,
} from "lucide-react";
import {
  RECIPES,
  RECIPE_BY_ID,
  RECIPE_THEMES,
  pieceCount,
} from "../game/catalog";
import { recipeProgress, trackedRecipeProgress } from "../game/engine";
import { ConstructionArt } from "../components/BrigoArt";
import {
  PlayerProgress,
  ConstructionXpNote,
  RecipeXpBadge,
} from "../components/PlayerProgress";
import { recipeXp } from "../game/progression";
import type { Game } from "./types";
import { WorkshopPagination } from "./WorkshopPagination";
import {
  INITIAL_WORKSHOP_LIBRARY,
  filterWorkshopPlans,
  paginateWorkshop,
  recipeFormat,
  withAvailableWorkshopGoal,
  workshopLibraryReducer,
} from "./workshopLibrary";
import type { RecipeFormat } from "./workshopLibrary";
import "./workshop-tools.css";
import {
  harvestAllProductions,
  harvestRecipeProduction,
} from "../components/ProductionPanel";
import { ProductionYield } from "../components/ProductionYield";
import { getProduction } from "../game/production";
import { MAX_VALUE } from "../game/engine";
import {
  groupConstructionStacks,
  stackProduction,
  productionCountdown,
} from "./productionView";

const count = (value: number) => value.toLocaleString("fr-FR");

export function Workshop({
  game,
  onRecipe,
  initialView = "plans",
  initialFilter,
}: {
  game: Game;
  onRecipe: (id: string) => void;
  initialView?: "plans" | "built";
  initialFilter?: "ready";
}) {
  const { state, act, busy, ready } = game;
  const [tab, setTab] = useState<"plans" | "built">(initialView);
  const [libraryState, dispatch] = useReducer(workshopLibraryReducer, {
    ...INITIAL_WORKSHOP_LIBRARY,
    difficulty: initialFilter === "ready" ? "ready" : "all",
  });
  const library = withAvailableWorkshopGoal(libraryState, state.goalRecipeId);
  const { difficulty, theme, query, format, sort } = library;
  const [galleryPage, setGalleryPage] = useState(1);
  const [productionNow, setProductionNow] = useState(
    () => game.now?.() ?? Date.now(),
  );
  useEffect(() => {
    if (tab !== "built" || !state.constructions.length) return;
    const update = () => {
      if (document.visibilityState === "visible")
        setProductionNow(game.now?.() ?? Date.now());
    };
    update();
    const timer = window.setInterval(update, 1000);
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, [tab, state.constructions.length, game.now]);
  const resultsHeading = useRef<HTMLHeadingElement>(null);
  const galleryHeading = useRef<HTMLHeadingElement>(null);
  const moveToResults = useRef(false);
  const planEntries = useMemo(
    () =>
      RECIPES.map((recipe) => ({
        recipe,
        progress: recipeProgress(state, recipe),
      })),
    [state.inventory],
  );
  const builtIds = useMemo(
    () => new Set(state.constructions.map((item) => item.recipeId)),
    [state.constructions],
  );
  const readyCount = planEntries.filter(
    (entry) => entry.progress.canBuild,
  ).length;
  const smallCount = RECIPES.filter(
    (recipe) => recipeFormat(recipe) === "small",
  ).length;
  const followedRecipe = state.goalRecipeId
    ? RECIPE_BY_ID.get(state.goalRecipeId)
    : undefined;
  const projectProgress = followedRecipe
    ? trackedRecipeProgress(state, followedRecipe)
    : null;
  const entries = filterWorkshopPlans(planEntries, library, state.goalRecipeId);
  const plans = paginateWorkshop(entries, library.page);
  const stacks = useMemo(
    () => groupConstructionStacks(state.constructions),
    [state.constructions],
  );
  const gallery = paginateWorkshop(stacks, galleryPage);
  const production = useMemo(
    () => getProduction(state, game.now?.() ?? Date.now()),
    [state, productionNow],
  );
  const productionRows = useMemo(
    () => new Map(production.rows.map((row) => [row.constructionId, row])),
    [production],
  );
  useEffect(() => {
    if (library !== libraryState)
      dispatch({
        type: "filters",
        changes: { difficulty: library.difficulty },
      });
  }, [library, libraryState]);
  useEffect(() => {
    const plansClamped = library.page !== plans.page;
    const galleryClamped = galleryPage !== gallery.page;
    if (plansClamped) dispatch({ type: "page", page: plans.page });
    if (galleryClamped) setGalleryPage(gallery.page);
    const activePageClamped = tab === "plans" ? plansClamped : galleryClamped;
    if (!moveToResults.current && !activePageClamped) return;
    moveToResults.current = false;
    const heading =
      tab === "plans" ? resultsHeading.current : galleryHeading.current;
    heading?.focus({ preventScroll: true });
    heading?.scrollIntoView({
      block: "start",
      behavior:
        document.documentElement.dataset.motion === "reduced" ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
    });
  }, [library.page, plans.page, galleryPage, gallery.page, tab]);
  const changePage = (page: number) => {
    const current = tab === "plans" ? plans : gallery;
    if (page === current.page || page < 1 || page > current.pages) return;
    moveToResults.current = true;
    if (tab === "plans") dispatch({ type: "page", page });
    else setGalleryPage(page);
  };
  const clear = () => {
    dispatch({ type: "clear" });
  };
  const showPlans = (filter: string) => {
    setTab("plans");
    dispatch({
      type: "filters",
      changes: { difficulty: filter, format: "all", theme: "all", query: "" },
    });
  };
  const showFormat = (value: RecipeFormat) => {
    setTab("plans");
    dispatch({
      type: "filters",
      changes: { format: value, difficulty: "all", theme: "all", query: "" },
    });
  };
  const hasFilters = !!(
    query ||
    difficulty !== "all" ||
    theme !== "all" ||
    format !== "all"
  );
  const advancedFilterCount = [
    format !== "all",
    theme !== "all",
    difficulty !== "all",
  ].filter(Boolean).length;

  return (
    <div className="workshop-studio">
      <div className="page-intro">
        <div>
          <span className="eyebrow">
            <i /> LE STUDIO
          </span>
          <h1>À vous de construire.</h1>
          <p>Choisissez un plan, réunissez ses Brigos, puis assemblez-le.</p>
        </div>
        <a href="#sandbox" className="workshop-free-link text-link">
          Construire librement <ArrowUpRight size={17} aria-hidden="true" />
        </a>
      </div>
      <div className="workshop-toolbar">
        <div className="view-tabs" role="group" aria-label="Vue de l’atelier">
          <button
            type="button"
            className={tab === "plans" ? "active" : ""}
            aria-pressed={tab === "plans"}
            onClick={() => setTab("plans")}
          >
            Bibliothèque <span>{RECIPES.length}</span>
          </button>
          <button
            type="button"
            className={tab === "built" ? "active" : ""}
            aria-pressed={tab === "built"}
            onClick={() => setTab("built")}
          >
            Mes créations <span>{state.constructions.length}</span>
          </button>
        </div>
      </div>
      {tab === "plans" && followedRecipe && projectProgress && (
        <section
          className="workshop-objective"
          aria-label="Votre objectif suivi"
        >
          <Target size={20} aria-hidden="true" />
          <div>
            <span>
              Mon objectif · <strong>{followedRecipe.name}</strong>
            </span>
            <p>
              {projectProgress.completed
                ? "Création exposée : objectif accompli."
                : projectProgress.canBuild
                  ? "Toutes les pièces sont réunies. À vous de jouer !"
                  : `${count(projectProgress.available)} / ${count(projectProgress.total)} Brigos réunis`}
            </p>
          </div>
          <button
            type="button"
            className="text-link"
            onClick={() => onRecipe(followedRecipe.id)}
          >
            {projectProgress.completed ? "Revoir le plan" : "Continuer"}
            <ChevronRight size={17} aria-hidden="true" />
          </button>
        </section>
      )}
      {tab === "plans" && (
        <section
          className="workshop-plan-controls"
          aria-label="Rechercher et filtrer les plans"
        >
          <div className="workshop-search-tools">
            <label className="workshop-search">
              <Search size={19} aria-hidden="true" />
              <input
                type="search"
                value={query}
                maxLength={100}
                onChange={(event) =>
                  dispatch({
                    type: "filters",
                    changes: { query: event.target.value },
                  })
                }
                placeholder="Nom de plan ou de Brigo…"
                aria-label="Rechercher une construction"
              />
            </label>
          </div>
          <div
            className="workshop-quick-filters"
            role="group"
            aria-label="Raccourcis des plans"
          >
            <button
              type="button"
              className={!hasFilters ? "active" : ""}
              aria-pressed={!hasFilters}
              onClick={() => showPlans("all")}
            >
              Tous <span>{RECIPES.length}</span>
            </button>
            <button
              type="button"
              className={difficulty === "ready" ? "active" : ""}
              aria-pressed={difficulty === "ready"}
              onClick={() => showPlans("ready")}
            >
              <Hammer size={15} aria-hidden="true" />
              Prêts à construire <span>{readyCount}</span>
            </button>
            <button
              type="button"
              className={format === "small" ? "active" : ""}
              aria-pressed={format === "small"}
              onClick={() => showFormat("small")}
            >
              <Layers3 size={15} aria-hidden="true" />
              Petits plans <span>{smallCount}</span>
            </button>
          </div>
          <details className="workshop-advanced-filters">
            <summary>
              Filtres et tri
              <span>
                {advancedFilterCount
                  ? `${advancedFilterCount} filtre${advancedFilterCount > 1 ? "s" : ""} actif${advancedFilterCount > 1 ? "s" : ""}`
                  : "Format, thème, difficulté"}
              </span>
              <ChevronDown size={17} aria-hidden="true" />
            </summary>
            <div className="workshop-plan-filters">
              <label>
                <span>Format</span>
                <select
                  className="standalone-select"
                  aria-label="Format des constructions"
                  value={format}
                  onChange={(event) =>
                    dispatch({
                      type: "filters",
                      changes: { format: event.target.value as RecipeFormat },
                    })
                  }
                >
                  <option value="all">Tous les formats</option>
                  <option value="small">Petits plans · moins de 50</option>
                  <option value="intermediate">
                    Intermédiaires · 50 à 899
                  </option>
                  <option value="legendary">Légendaires · 900 et plus</option>
                </select>
              </label>
              <label>
                <span>Thème</span>
                <select
                  className="standalone-select"
                  aria-label="Thème des constructions"
                  value={theme}
                  onChange={(event) =>
                    dispatch({
                      type: "filters",
                      changes: { theme: event.target.value },
                    })
                  }
                >
                  <option value="all">Tous les thèmes</option>
                  {Object.entries(RECIPE_THEMES).map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Difficulté</span>
                <select
                  className="standalone-select"
                  aria-label="Filtrer les constructions"
                  value={difficulty}
                  onChange={(event) =>
                    dispatch({
                      type: "filters",
                      changes: { difficulty: event.target.value },
                    })
                  }
                >
                  <option value="all">Toutes les difficultés</option>
                  <option value="starter">Premiers pas</option>
                  <option value="creative">Créatif</option>
                  <option value="expert">Expert</option>
                  <option value="legendary">Légendaire</option>
                  <option value="ready">Prêts à construire</option>
                  {followedRecipe && (
                    <option value="tracked">Mon objectif</option>
                  )}
                </select>
              </label>
              <label className="workshop-sort-label">
                <span>Trier par</span>
                <select
                  className="standalone-select"
                  aria-label="Trier les plans"
                  value={sort}
                  onChange={(event) =>
                    dispatch({
                      type: "filters",
                      changes: { sort: event.target.value },
                    })
                  }
                >
                  <option value="close">Les plus proches d’être prêts</option>
                  <option value="series">Ordre de la collection</option>
                  <option value="pieces">Nombre de Brigos croissant</option>
                  <option value="xp">XP décroissante</option>
                </select>
              </label>
            </div>
          </details>
        </section>
      )}
      {tab === "plans" ? (
        <>
          <div className="workshop-results workshop-results-plans">
            <h2
              className="workshop-results-title workshop-library-heading"
              ref={resultsHeading}
              tabIndex={-1}
            >
              {format === "intermediate"
                ? "Les projets intermédiaires"
                : format === "legendary"
                  ? "Les constructions légendaires"
                  : format === "small"
                    ? "Les petits plans"
                    : difficulty === "ready"
                      ? "Les plans prêts à construire"
                      : "La bibliothèque"}
            </h2>
            <WorkshopPagination
              {...plans}
              kind="plans"
              position="top"
              onPage={changePage}
            />
            {hasFilters && (
              <button type="button" className="text-link" onClick={clear}>
                <X size={16} aria-hidden="true" />
                Réinitialiser les filtres
              </button>
            )}
          </div>
          {entries.length ? (
            <>
              <div className="recipe-grid">
                {plans.items.map(({ recipe, progress }) => {
                  const built = builtIds.has(recipe.id);
                  const followed = state.goalRecipeId === recipe.id;
                  const missing = progress.total - progress.available;
                  return (
                    <article
                      className={`recipe-card ${recipe.difficulty === "Légendaire" ? "recipe-card-legendary" : ""} ${progress.canBuild ? "recipe-card-ready" : ""} ${followed ? "recipe-card-followed" : ""}`}
                      key={recipe.id}
                    >
                      <button
                        type="button"
                        className="recipe-art-button"
                        aria-label={`Voir le plan ${recipe.name}`}
                        onClick={() => onRecipe(recipe.id)}
                        style={{ background: recipe.color }}
                      >
                        <span className="difficulty-badge">
                          {recipe.difficulty === "Légendaire" && (
                            <Crown size={13} aria-hidden="true" />
                          )}
                          {recipe.difficulty}
                        </span>
                        <RecipeXpBadge recipe={recipe} />
                        {built && (
                          <span className="built-badge">
                            <Check size={13} aria-hidden="true" />
                            Exposé
                          </span>
                        )}
                        <ConstructionArt
                          recipeId={recipe.id}
                          quality="preview"
                        />
                      </button>
                      <div className="recipe-card-content">
                        <div className="workshop-card-meta">
                          <span className="recipe-piece-count">
                            <Layers3 size={15} aria-hidden="true" />
                            {count(pieceCount(recipe))} Brigos
                          </span>
                          {followed && (
                            <span className="workshop-followed-label">
                              <Target size={13} aria-hidden="true" />
                              Objectif
                            </span>
                          )}
                        </div>
                        <h2>{recipe.name}</h2>
                        <ProductionYield recipe={recipe} />
                        <p>{recipe.description}</p>
                        <div className="workshop-stock-label">
                          <span>
                            {progress.canBuild
                              ? "Toutes les pièces réunies"
                              : "Pièces réunies"}
                          </span>
                          <strong>
                            {count(progress.available)}{" "}
                            <small>/ {count(progress.total)}</small>
                          </strong>
                        </div>
                        <div
                          className={`recipe-progress ${progress.canBuild ? "ready" : ""}`}
                        >
                          <span
                            role="progressbar"
                            aria-label={`Brigos réunis pour ${recipe.name}`}
                            aria-valuemin={0}
                            aria-valuemax={progress.total}
                            aria-valuenow={progress.available}
                          >
                            <span
                              style={{
                                width: `${progress.total ? (progress.available / progress.total) * 100 : 0}%`,
                              }}
                            />
                          </span>
                        </div>
                        <span
                          className={`workshop-missing-label ${progress.canBuild ? "is-ready" : ""}`}
                        >
                          {progress.canBuild ? (
                            <>
                              <Check size={14} aria-hidden="true" />
                              Prêt à construire
                            </>
                          ) : (
                            `Encore ${count(missing)} Brigo${missing > 1 ? "s" : ""} à trouver`
                          )}
                        </span>
                        <button
                          type="button"
                          className={`button ${progress.canBuild ? "button-primary" : "button-secondary"}`}
                          onClick={() => onRecipe(recipe.id)}
                        >
                          {progress.canBuild
                            ? "Voir et assembler"
                            : "Voir le plan"}
                          <ChevronRight size={17} aria-hidden="true" />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
              <WorkshopPagination
                {...plans}
                kind="plans"
                position="bottom"
                onPage={changePage}
              />
            </>
          ) : (
            <div className="empty-state">
              <Hammer size={32} aria-hidden="true" />
              <h2>
                {difficulty === "ready" && !query
                  ? "Votre prochain projet se prépare."
                  : "Aucun plan ne correspond."}
              </h2>
              <p>
                {difficulty === "ready" && !query
                  ? "Ouvrez une boîte ou découvrez les pièces qui manquent à votre objectif."
                  : "Modifiez votre recherche ou réinitialisez les filtres."}
              </p>
              <button
                type="button"
                className="button button-primary"
                onClick={clear}
              >
                Afficher tous les plans
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          {state.constructions.length > 0 && (
            <section
              className="workshop-harvest"
              aria-label="Récoltes de mes créations"
              aria-busy={busy}
            >
              <div className="workshop-harvest-summary">
                <Coins size={23} aria-hidden="true" />
                <div>
                  <strong>
                    {count(production.totalReady)} pièce
                    {production.totalReady > 1 ? "s" : ""} à récolter
                  </strong>
                  <p>
                    {count(production.totalPerDay)} pièces / jour · Réserve de
                    72 h
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="button button-primary"
                disabled={
                  !ready ||
                  busy ||
                  production.totalReady === 0 ||
                  production.capacityBlocked
                }
                onClick={() => void harvestAllProductions(game)}
              >
                <Coins size={17} aria-hidden="true" />
                {busy
                  ? "Enregistrement…"
                  : production.totalReady > 0
                    ? "Tout récolter"
                    : "Production en cours"}
              </button>
              {production.capacityBlocked && (
                <p className="workshop-harvest-note" role="status">
                  Dépensez quelques pièces pour faire de la place. Votre récolte
                  reste en réserve.
                </p>
              )}
              {production.clockAdjusted && (
                <p className="workshop-harvest-note" role="status">
                  L’horloge a changé. Vos pièces restent disponibles ; la
                  production reprendra lorsque la date sera rétablie.
                </p>
              )}
            </section>
          )}
          <div className="workshop-results">
            <h2
              className="workshop-results-title"
              ref={galleryHeading}
              tabIndex={-1}
            >
              Mes créations
            </h2>
            <p>Les exemplaires d’un même plan sont regroupés en une pile.</p>
          </div>
          <WorkshopPagination
            {...gallery}
            kind="piles"
            position="top"
            onPage={changePage}
          />
          {state.constructions.length ? (
            <>
              <div className="recipe-grid workshop-gallery">
                {gallery.items.map((stack) => {
                  const recipe = RECIPE_BY_ID.get(stack.recipeId)!;
                  const construction = stack.constructions[0];
                  const latest = stack.constructions.at(-1)!;
                  const copies = stack.constructions.length;
                  const income = stackProduction(stack, productionRows);
                  const canHarvest =
                    ready &&
                    !busy &&
                    income.ready > 0 &&
                    state.coins + income.ready <= MAX_VALUE;
                  return (
                    <article
                      className={`recipe-card workshop-stack ${income.ready > 0 ? "has-production" : ""} ${recipe.difficulty === "Légendaire" ? "recipe-card-legendary" : ""}`}
                      key={recipe.id}
                    >
                      <button
                        type="button"
                        className="recipe-art-button"
                        aria-label={`Récolter ${count(income.ready)} pièces : pile ${recipe.name}, ${copies} exemplaire${copies > 1 ? "s" : ""}`}
                        onClick={() =>
                          void harvestRecipeProduction(game, recipe.id)
                        }
                        disabled={!canHarvest}
                        style={{ background: recipe.color }}
                      >
                        <span className="difficulty-badge">
                          <Check size={13} aria-hidden="true" />
                          Exposé
                        </span>
                        {copies > 1 && (
                          <span
                            className="workshop-stack-paper"
                            aria-hidden="true"
                          />
                        )}
                        <span className="workshop-stack-copy">×{copies}</span>
                        <span className="workshop-stack-coins">
                          <Coins size={18} aria-hidden="true" />
                          {count(income.ready)} pièces
                        </span>
                        <RecipeXpBadge recipe={recipe} />
                        <ConstructionArt
                          quality="preview"
                          recipeId={recipe.id}
                          pieces={construction.pieces}
                        />
                      </button>
                      <div className="recipe-card-content">
                        <span className="recipe-piece-count">
                          <Layers3 size={15} aria-hidden="true" />
                          {count(pieceCount(recipe) * copies)} Brigos réservés
                        </span>
                        <h2>{recipe.name}</h2>
                        <ProductionYield recipe={recipe} copies={copies} />
                        <p className="workshop-stack-caption">
                          {copies} exemplaire{copies > 1 ? "s" : ""} · Chaque
                          copie augmente la production.
                        </p>
                        <div className="workshop-stack-timer">
                          <Clock3 size={15} aria-hidden="true" />
                          <span>
                            {income.nextReadyAt === null
                              ? "Réserve pleine"
                              : "Prochaine production"}
                            {income.nextReadyAt !== null &&
                              ` · ${productionCountdown(income.nextReadyAt, productionNow)}`}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="workshop-stack-collect"
                          disabled={!canHarvest}
                          onClick={() =>
                            void harvestRecipeProduction(game, recipe.id)
                          }
                        >
                          <Coins size={16} aria-hidden="true" />
                          {income.ready > 0
                            ? state.coins + income.ready > MAX_VALUE
                              ? "Réserve de monnaie pleine"
                              : `Récolter ${count(income.ready)} pièces`
                            : "Production en cours"}
                        </button>
                        <button
                          type="button"
                          className="button button-secondary"
                          onClick={() => onRecipe(recipe.id)}
                        >
                          Revoir le plan{" "}
                          <ChevronRight size={17} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className="workshop-dismantle-button"
                          title="Les pièces de monnaie déjà produites sont récoltées avant la restitution de vos Brigos."
                          disabled={!ready || busy}
                          onClick={() =>
                            void act(
                              { type: "dismantle", constructionId: latest.id },
                              `Création démontée : ${recipe.name}. Vos Brigos sont disponibles ; −${count(recipeXp(recipe))} XP.`,
                            )
                          }
                        >
                          <RotateCcw size={15} aria-hidden="true" />
                          Démonter{" "}
                          {copies > 1
                            ? "le dernier exemplaire"
                            : "l’exemplaire"}{" "}
                          <span>−{count(recipeXp(recipe))} XP</span>
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
              <WorkshopPagination
                {...gallery}
                kind="piles"
                position="bottom"
                onPage={changePage}
              />
            </>
          ) : (
            <div className="empty-state">
              <Hammer size={32} aria-hidden="true" />
              <h2>Votre galerie commence ici.</h2>
              <p>
                Exposez vos créations pour produire de la monnaie. Les
                exemplaires d’un même plan forment une pile à récolter.
              </p>
              <button
                type="button"
                className="button button-primary"
                onClick={() => setTab("plans")}
              >
                Choisir une construction
              </button>
            </div>
          )}
        </>
      )}
      <details className="workshop-level-details">
        <summary>
          Mon niveau et l’XP des constructions{" "}
          <ChevronDown size={18} aria-hidden="true" />
        </summary>
        <PlayerProgress game={game} variant="compact" />
        <ConstructionXpNote />
      </details>
    </div>
  );
}
