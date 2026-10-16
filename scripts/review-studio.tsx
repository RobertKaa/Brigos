/** Development-only visual fixture. Never imports App, useGame or a repository. */
import { Profiler, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Coins,
  Hammer,
  Layers3,
  Moon,
  Package,
  Shield,
  Sun,
} from "lucide-react";
import { Home, OddsContent } from "../src/screens/HomeStudio";
import { Collection } from "../src/screens/Collection";
import { Workshop } from "../src/screens/Workshop";
import { AdminPanel } from "../src/screens/AdminPanel";
import { BrigoDetail, RecipeDetail } from "../src/components/DetailModals";
import { Modal } from "../src/components/Modal";
import { PlayerLevelBadge } from "../src/components/PlayerProgress";
import {
  ACTIVE_CATALOG,
  BOXES,
  BOX_IDS,
  RECIPE_BY_ID,
} from "../src/game/catalog";
import type { BoxId, Brigo, Recipe } from "../src/game/catalog";
import type { GameState } from "../src/game/engine";
import { CURRENT_SAVE_VERSION } from "../src/game/releaseVersion";
import { BrigoLogo } from "../src/components/BrigoLogo";
import type { AdminAction, Game } from "../src/screens/types";
import { applyTheme } from "../src/theme";
import type { Theme } from "../src/theme";
import "@fontsource-variable/dm-sans";
import "@fontsource-variable/outfit";
import "../src/styles.css";
import "../src/accessibility.css";
import "../src/studio-theme.css";

if (!import.meta.env.DEV)
  throw new Error("Cet aperçu est réservé au développement.");

const initialTheme: Theme =
  new URLSearchParams(location.search).get("theme") === "dark"
    ? "dark"
    : "light";
applyTheme(initialTheme);

const piecesFor = (recipe: Recipe) =>
  recipe.placements.reduce<Record<string, number>>((pieces, part) => {
    const id = `${part.modelId}:${part.colorId ?? "coral"}`;
    pieces[id] = (pieces[id] ?? 0) + 1;
    return pieces;
  }, {});
const inventory = Object.fromEntries(
  ACTIVE_CATALOG.filter((_, index) => index % 3 === 0).map((brigo, index) => [
    brigo.id,
    (index % 7) + 2,
  ]),
);
const requestedGallery = Number(
  new URLSearchParams(location.search).get("gallery"),
);
const gallerySize =
  Number.isInteger(requestedGallery) &&
  requestedGallery >= 3 &&
  requestedGallery <= 60
    ? requestedGallery
    : 3;
const examples = ["totem", "bench", "tree"];
const constructions = Array.from({ length: gallerySize }, (_, index) => {
  const id = examples[index % examples.length];
  const recipe = RECIPE_BY_ID.get(id)!;
  return {
    id: `review-built-${id}-${index}`,
    recipeId: id,
    createdAt: `2026-10-0${7 + (index % 3)}T10:00:00.000Z`,
    pieces: piecesFor(recipe),
  };
});
const discovered = [
  ...new Set([
    ...Object.keys(inventory),
    ...constructions.flatMap((built) => Object.keys(built.pieces)),
  ]),
];
const state: GameState = {
  version: CURRENT_SAVE_VERSION,
  planRevision: 1,
  coins: 2840,
  boxes: { discovery: 8, workshop: 3, prism: 1 },
  inventory,
  discovered,
  constructions,
  history: [
    {
      id: "review-opening",
      boxId: "workshop",
      createdAt: "2026-10-09T10:00:00.000Z",
      drops: discovered
        .slice(0, 10)
        .map((brigoId, index) => ({ brigoId, isNew: index < 4 })),
    },
  ],
  pendingOpening: null,
  boxesOpened: 14,
  rates: Object.fromEntries(
    BOX_IDS.map((id) => [id, { ...BOXES[id].weights }]),
  ) as GameState["rates"],
  preferences: { sound: false, reducedMotion: true },
  goalRecipeId: "house",
  claimedAchievements: ["builder-variety"],
  lastVisitRewardAt: null,
};
const game: Game = {
  state,
  ready: true,
  busy: true,
  persistent: false,
  notice: null,
  notify: () => undefined,
  act: async () => null,
};
const admin: AdminAction = async () => false;
type View = "boxes" | "collection" | "workshop";
const readView = (): View =>
  location.hash === "#collection"
    ? "collection"
    : location.hash === "#workshop"
      ? "workshop"
      : "boxes";

function ReviewStudio() {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  useEffect(() => applyTheme(theme), [theme]);
  const [view, setView] = useState<View>(readView);
  const [selectedBox, setSelectedBox] = useState<BoxId>("discovery");
  const [brigo, setBrigo] = useState<Brigo | null>(null);
  const [recipeId, setRecipeId] = useState<string | null>(null);
  const [oddsBox, setOddsBox] = useState<BoxId | null>(null);
  const [adminOpen, setAdminOpen] = useState(false);
  const renderTiming = useRef<HTMLOutputElement>(null);
  const reportRender = (scope: string, phase: string, duration: number) => {
    const output = renderTiming.current;
    if (!output) return;
    output.dataset.scope = scope;
    output.dataset.duration = duration.toFixed(2);
    output.dataset.phase = phase;
    output.dataset.samples = String(Number(output.dataset.samples ?? 0) + 1);
    output.textContent = `Rendu ${scope} : ${duration.toFixed(1)} ms (${phase})`;
  };
  useEffect(() => {
    const navigate = () => {
      setView(readView());
      window.scrollTo({ top: 0, behavior: "instant" });
    };
    window.addEventListener("hashchange", navigate);
    return () => window.removeEventListener("hashchange", navigate);
  }, []);
  const recipe = recipeId ? RECIPE_BY_ID.get(recipeId) : undefined;
  return (
    <div className="app-shell">
      <div
        style={{
          padding: "10px 16px",
          color: "#fff9e8",
          background: "#805b17",
          fontSize: ".8125rem",
          textAlign: "center",
          lineHeight: 1.6,
        }}
        role="note"
      >
        <strong>APERÇU VISUEL</strong> · Données fictives · Aucune lecture ni
        écriture de sauvegarde · Actions de jeu désactivées
        <output
          ref={renderTiming}
          aria-label="Mesure du rendu du plan"
          style={{ display: "block" }}
        />
      </div>
      <header className="site-header">
        <div className="header-inner">
          <a href="#boxes" className="brand" aria-label="Brigo, accueil">
            <BrigoLogo />
          </a>
          <nav className="main-nav" aria-label="Navigation principale">
            {(
              [
                { id: "boxes", label: "Les boîtes", icon: Package },
                { id: "collection", label: "Ma collection", icon: Layers3 },
                { id: "workshop", label: "L’atelier", icon: Hammer },
              ] as const
            ).map(({ id, label, icon: Icon }) => (
              <a
                key={id}
                href={`#${id}`}
                className={view === id ? "active" : ""}
                aria-current={view === id ? "page" : undefined}
              >
                <Icon size={17} />
                <span>{label}</span>
              </a>
            ))}
          </nav>
          <div className="header-tools">
            <button
              type="button"
              className="icon-button theme-toggle"
              aria-label={
                theme === "dark"
                  ? "Activer le mode jour"
                  : "Activer le mode nuit"
              }
              aria-pressed={theme === "dark"}
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            <PlayerLevelBadge state={state} />
            <span className="wallet">
              <span>
                <Coins size={17} />
              </span>
              <strong>{state.coins.toLocaleString("fr-FR")}</strong>
            </span>
            <button
              type="button"
              className="admin-toggle"
              onClick={() => setAdminOpen(true)}
              aria-label="Aperçu des commandes admin"
            >
              <Shield size={15} />
              <span>Admin</span>
              <small>APERÇU</small>
            </button>
          </div>
        </div>
      </header>
      <main id="main-content" className="main-content" tabIndex={-1}>
        {view === "boxes" && (
          <Home
            game={game}
            selectedBox={selectedBox}
            onSelectBox={setSelectedBox}
            onOpen={() => undefined}
            onOdds={setOddsBox}
            onBrigo={setBrigo}
            onRecipe={setRecipeId}
          />
        )}
        {view === "collection" && <Collection game={game} onBrigo={setBrigo} />}
        {view === "workshop" && (
          <Profiler
            id="workshop-preview"
            onRender={(_id, phase, duration) =>
              reportRender("atelier", phase, duration)
            }
          >
            <Workshop game={game} onRecipe={setRecipeId} />
          </Profiler>
        )}
      </main>
      <footer className="site-footer">
        <span>
          <span className="footer-brand">
            <BrigoLogo variant="wordmark" />
          </span>
          Aperçu indépendant de votre partie.
        </span>
        <span>Lecture seule · Développement</span>
      </footer>
      {brigo && (
        <BrigoDetail
          brigo={brigo}
          game={game}
          adminEnabled={false}
          admin={admin}
          onBrigo={setBrigo}
          onClose={() => setBrigo(null)}
        />
      )}
      {recipe && (
        <Profiler
          id="recipe-preview"
          onRender={(_id, phase, duration) =>
            reportRender("du plan", phase, duration)
          }
        >
          <RecipeDetail
            key={recipe.id}
            recipe={recipe}
            game={game}
            adminEnabled={false}
            admin={admin}
            onClose={() => setRecipeId(null)}
          />
        </Profiler>
      )}
      {oddsBox && (
        <Modal
          title={`Les chances · ${BOXES[oddsBox].name}`}
          eyebrow="DANS VOTRE BOÎTE"
          onClose={() => setOddsBox(null)}
        >
          <OddsContent boxId={oddsBox} game={game} />
        </Modal>
      )}
      {adminOpen && (
        <div
          onClickCapture={(event) => {
            const target = event.target as HTMLElement;
            const button = target.closest("button");
            if (
              (button && !button.closest(".admin-tabs, .modal-header")) ||
              target.closest('input[type="file"]')
            ) {
              event.preventDefault();
              event.stopPropagation();
            }
          }}
        >
          <AdminPanel
            game={game}
            admin={admin}
            forcedRarity=""
            onForcedRarity={() => undefined}
            onClose={() => setAdminOpen(false)}
          />
        </div>
      )}
    </div>
  );
}

// The visual fixture never instantiates the real game or touches browser storage.
createRoot(document.getElementById("root")!).render(<ReviewStudio />);
