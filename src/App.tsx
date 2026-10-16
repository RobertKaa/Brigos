import { lazy, Suspense, useEffect, useState } from "react";
import {
  Check,
  CircleHelp,
  Coins,
  Hammer,
  Layers3,
  Moon,
  Orbit,
  Package,
  Settings2,
  Shield,
  Sparkles,
  Sun,
  UserRound,
  X,
} from "lucide-react";
import {
  BOXES,
  BOX_DROP_COUNT,
  COLORS,
  MODELS,
  RECIPE_BY_ID,
} from "./game/catalog";
import type { BoxId, Brigo, Rarity } from "./game/catalog";
import {
  adminCommand,
  openBox,
  openNextBox,
  trackedRecipeProgress,
} from "./game/engine";
import { playOpeningSound } from "./game/audio";
import { useGame } from "./game/useGame";
import { Home, OddsContent } from "./screens/Home";
import { Collection } from "./screens/Collection";
import { Workshop } from "./screens/Workshop";
import { Journal } from "./screens/Journal";
import { AdminPanel } from "./screens/AdminPanel";
import type { AdminAction } from "./screens/types";
import { Modal } from "./components/Modal";
import { BrigoDetail, RecipeDetail } from "./components/DetailModals";
import { OpeningModal } from "./components/OpeningModal";
import { PlayerLevelBadge } from "./components/PlayerProgress";
import { BrigoLogo } from "./components/BrigoLogo";
import { useTheme } from "./useTheme";
import { AppNavigation } from "./components/AppNavigation";
import { AccountPanel } from "./components/AccountPanel";
import { useAuth } from "./auth/useAuth";
import { readAppRoute } from "./navigation";
import type { Game } from "./screens/types";
import "./journey.css";

const Sandbox = lazy(() =>
  import("./screens/Sandbox").then((screen) => ({ default: screen.Sandbox })),
);

const ADMIN_ENABLED =
  import.meta.env.DEV || import.meta.env.VITE_ENABLE_LOCAL_ADMIN === "true";
export default function App() {
  const auth = useAuth();
  const game = useGame({
    userId: auth.user?.id ?? null,
    authReady: auth.ready,
  });
  const [accountOpen, setAccountOpen] = useState(false);
  useEffect(() => {
    if (auth.ready && (auth.recovery || location.hash === "#account"))
      setAccountOpen(true);
  }, [auth.ready, auth.recovery]);
  return (
    <>
      <GameApp
        key={auth.user?.id ?? "local"}
        game={game}
        onOpenAccount={() => setAccountOpen(true)}
      />
      {accountOpen && (
        <AccountPanel
          auth={auth}
          onClose={() => {
            setAccountOpen(false);
            if (location.hash === "#account")
              history.replaceState(
                null,
                "",
                `${location.pathname}${location.search}#boxes`,
              );
          }}
        />
      )}
    </>
  );
}

/** Presentational app entry also used by the isolated, in-memory journey review. */
export function GameApp({
  game,
  onOpenAccount,
}: {
  game: Game;
  onOpenAccount?: () => void;
}) {
  const localAdminEnabled = ADMIN_ENABLED && game.mode !== "connected";
  const { theme, preference, setPreference, toggleTheme } = useTheme();
  const [route, setRoute] = useState(() => readAppRoute(location.hash));
  const { view } = route;
  const [selectedBox, setSelectedBox] = useState<BoxId>("discovery");
  const [adminOpen, setAdminOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [oddsBox, setOddsBox] = useState<BoxId | null>(null);
  const [brigo, setBrigo] = useState<Brigo | null>(null);
  const [recipeId, setRecipeId] = useState<string | null>(null);
  const [forcedRarity, setForcedRarity] = useState<Rarity | "">("");
  const [systemReduced, setSystemReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const reducedMotion = systemReduced || game.state.preferences.reducedMotion;
  useEffect(() => {
    const onHash = () => {
      setRoute(readAppRoute(location.hash));
      window.scrollTo({ top: 0, behavior: "instant" });
      document.getElementById("main-content")?.focus({ preventScroll: true });
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setSystemReduced(media.matches);
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.motion = reducedMotion
      ? "reduced"
      : "full";
  }, [reducedMotion]);
  const admin: AdminAction = (command, message) =>
    game.localAct?.(
      (current) => adminCommand(current, command, localAdminEnabled),
      message,
    ) ?? Promise.resolve(false);
  const handleOpen = async (boxId: BoxId, next = false) => {
    const success =
      localAdminEnabled && forcedRarity && game.localAct
        ? await game.localAct((current) =>
            (next ? openNextBox : openBox)(current, boxId, {
              forcedRarity,
              adminEnabled: true,
            }),
          )
        : await game.act({ type: next ? "open-next-box" : "open-box", boxId });
    if (success) {
      setForcedRarity("");
      if (game.state.preferences.sound) playOpeningSound();
    }
  };
  const closeOpening = () => {
    if (!game.busy) void game.act({ type: "finish-opening" });
  };
  const goalRecipe = game.state.goalRecipeId
    ? RECIPE_BY_ID.get(game.state.goalRecipeId)
    : undefined;
  const goalProgress = goalRecipe
    ? trackedRecipeProgress(game.state, goalRecipe)
    : undefined;
  return (
    <div className="app-shell">
      <a
        href="#main-content"
        className="skip-link"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        Aller au contenu
      </a>
      <header className="site-header">
        <div className="header-inner">
          <a href="#boxes" className="brand" aria-label="Brigo, accueil">
            <BrigoLogo />
          </a>
          <AppNavigation view={view} />
          <div className="header-tools">
            <PlayerLevelBadge state={game.state} />
            <span
              className="wallet"
              aria-label={`${game.state.coins} pièces disponibles`}
            >
              <span>
                <Coins size={17} />
              </span>
              <strong data-testid="wallet">
                {game.state.coins.toLocaleString("fr-FR")}
              </strong>
            </span>
            <span className="header-divider" />
            {onOpenAccount && (
              <button
                type="button"
                className="icon-button account-toggle"
                aria-label="Mon compte"
                title={
                  game.mode === "connected"
                    ? "Mon compte · partie en ligne"
                    : "Mon compte"
                }
                onClick={onOpenAccount}
              >
                <UserRound size={19} />
              </button>
            )}
            <button
              type="button"
              className="icon-button theme-toggle"
              aria-label={
                theme === "dark"
                  ? "Activer le mode jour"
                  : "Activer le mode nuit"
              }
              aria-pressed={theme === "dark"}
              title={theme === "dark" ? "Mode jour" : "Mode nuit"}
              onClick={toggleTheme}
            >
              {theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            <button
              type="button"
              className="icon-button help-button"
              aria-label="Guide et réglages"
              onClick={() => setHelpOpen(true)}
            >
              <Settings2 size={19} />
            </button>
            {localAdminEnabled && (
              <button
                type="button"
                className="admin-toggle"
                aria-label="Ouvrir les commandes admin"
                onClick={() => setAdminOpen(true)}
                disabled={!game.ready}
              >
                <Shield size={15} />
                <span>Admin</span>
                <small>TEST</small>
              </button>
            )}
          </div>
        </div>
      </header>
      {!game.persistent && (
        <div className="storage-warning" role="status">
          Session temporaire : la sauvegarde locale est indisponible. Exportez
          votre partie depuis le panneau admin avant de quitter.
        </div>
      )}
      {game.mode === "connected" && (
        <div
          className={`connection-status${game.connectionError ? " connection-status-error" : ""}`}
          role="status"
        >
          <span>
            {game.connectionError ??
              (game.ready
                ? "Partie en ligne · votre progression est enregistrée sur votre compte."
                : "Chargement de votre partie en ligne…")}
          </span>
          {game.refresh && (
            <button
              type="button"
              className="button button-secondary"
              disabled={game.busy}
              onClick={() => void game.refresh?.()}
            >
              Actualiser
            </button>
          )}
        </div>
      )}
      {localAdminEnabled && forcedRarity && (
        <div className="test-mode-banner">
          <Sparkles size={15} />
          Prochaine boîte : {BOX_DROP_COUNT} Brigos de rareté{" "}
          {forcedRarity === "common"
            ? "Commune"
            : forcedRarity === "uncommon"
              ? "Peu commune"
              : forcedRarity === "rare"
                ? "Rare"
                : forcedRarity === "epic"
                  ? "Épique"
                  : "Légendaire"}{" "}
          · test admin
          <button
            type="button"
            onClick={() => setForcedRarity("")}
            aria-label="Annuler le tirage forcé"
          >
            <X size={15} />
          </button>
        </div>
      )}
      <main
        id="main-content"
        tabIndex={-1}
        className="main-content"
        aria-busy={!game.ready}
      >
        {view === "boxes" && (
          <Home
            game={game}
            selectedBox={selectedBox}
            onSelectBox={setSelectedBox}
            onOpen={(id) => void handleOpen(id)}
            onOdds={setOddsBox}
            onBrigo={setBrigo}
            onRecipe={setRecipeId}
          />
        )}
        {view === "collection" && <Collection game={game} onBrigo={setBrigo} />}
        {view === "workshop" && (
          <Workshop
            key={`${route.workshopView}-${route.workshopFilter ?? "all"}`}
            initialView={route.workshopView}
            initialFilter={route.workshopFilter}
            game={game}
            onRecipe={setRecipeId}
          />
        )}
        {view === "journal" && <Journal game={game} />}
        {view === "sandbox" && (
          <Suspense
            fallback={<p role="status">L’espace de construction se prépare…</p>}
          >
            <Sandbox game={game} />
          </Suspense>
        )}
      </main>
      <footer className="site-footer">
        <span>
          <span className="footer-brand">
            <BrigoLogo variant="wordmark" />
          </span>
          À chaque pièce, une nouvelle idée.
        </span>
        <span className="save-status">
          <Check size={13} />
          {!game.ready
            ? "Chargement de votre partie…"
            : game.busy
              ? "Sauvegarde en cours…"
              : game.mode === "connected"
                ? "Sauvegardé sur votre compte"
                : game.persistent
                  ? "Sauvegardé sur cet appareil"
                  : "Session temporaire"}
          <span className="version-label">v0.9</span>
        </span>
      </footer>
      {adminOpen && localAdminEnabled && (
        <AdminPanel
          game={game}
          admin={admin}
          forcedRarity={forcedRarity}
          onForcedRarity={setForcedRarity}
          onClose={() => setAdminOpen(false)}
        />
      )}
      {oddsBox && (
        <Modal
          title={`Les chances · ${BOXES[oddsBox].name}`}
          eyebrow="DANS VOTRE BOÎTE"
          onClose={() => setOddsBox(null)}
        >
          <OddsContent game={game} boxId={oddsBox} />
        </Modal>
      )}
      {brigo && (
        <BrigoDetail
          brigo={brigo}
          game={game}
          adminEnabled={localAdminEnabled}
          admin={admin}
          onBrigo={setBrigo}
          onClose={() => setBrigo(null)}
        />
      )}
      {recipeId && (
        <RecipeDetail
          key={recipeId}
          recipe={RECIPE_BY_ID.get(recipeId)!}
          game={game}
          adminEnabled={localAdminEnabled}
          admin={admin}
          onClose={() => setRecipeId(null)}
          onBuilt={() => {
            setRecipeId(null);
            location.hash = "workshop?view=built";
          }}
        />
      )}
      {game.ready && game.state.pendingOpening && (
        <OpeningModal
          opening={game.state.pendingOpening}
          reducedMotion={reducedMotion}
          busy={game.busy}
          coins={game.state.coins}
          boxes={game.state.boxes}
          persistent={game.persistent}
          onOpenNext={(id) => void handleOpen(id, true)}
          goal={
            goalRecipe && goalProgress
              ? {
                  name: goalRecipe.name,
                  available: goalProgress.available,
                  total: goalProgress.total,
                  completed: goalProgress.completed,
                  onView: () => {
                    void game
                      .act({ type: "finish-opening" })
                      .then((success) => {
                        if (success) {
                          location.hash = "workshop";
                          setRecipeId(goalRecipe.id);
                        }
                      });
                  },
                }
              : undefined
          }
          onClose={closeOpening}
          onCollection={() => {
            void game.act({ type: "finish-opening" }).then((success) => {
              if (success) location.hash = "collection";
            });
          }}
        />
      )}
      {helpOpen && (
        <Modal
          title="Guide et réglages"
          eyebrow="VOTRE ESPACE BRIGO"
          onClose={() => setHelpOpen(false)}
        >
          <div className="help-content">
            <details className="guide-details">
              <summary>Comment jouer à Brigo ?</summary>
              <ol>
                <li>
                  <span>
                    <Package size={20} />
                  </span>
                  <div>
                    <h3>Ouvrir des boîtes</h3>
                    <p>
                      Choisissez une boîte : votre réserve est utilisée d’abord.
                      Sinon, le prix en pièces est indiqué avant l’ouverture.
                    </p>
                  </div>
                </li>
                <li>
                  <span>
                    <Layers3 size={20} />
                  </span>
                  <div>
                    <h3>Retrouver ses Brigos</h3>
                    <p>
                      La collection réunit{" "}
                      {MODELS.filter((model) => !model.archived).length} formes
                      déclinées en {COLORS.length}
                      couleurs. Consultez votre stock ou explorez l’album.
                    </p>
                  </div>
                </li>
                <li>
                  <span>
                    <Hammer size={20} />
                  </span>
                  <div>
                    <h3>Construire et récolter</h3>
                    <p>
                      Dans l’Atelier, choisissez un plan ou retrouvez « Mes
                      créations » pour récolter les pièces produites. S’il vous
                      manque des Brigos, suivez le plan ou commandez les pièces
                      manquantes sur sa fiche.
                    </p>
                  </div>
                </li>
                <li>
                  <span>
                    <Orbit size={20} />
                  </span>
                  <div>
                    <h3>Créer librement</h3>
                    <p>
                      L’onglet Libre ouvre votre espace 3D. Choisissez un Brigo
                      de votre stock, visez une surface et confirmez avec «
                      Poser ici ».
                    </p>
                  </div>
                </li>
              </ol>
              <a
                className="guide-quests-link button button-secondary"
                href="#journal"
                onClick={() => setHelpOpen(false)}
              >
                <Sparkles size={17} /> Gagner des pièces avec les quêtes
              </a>
            </details>
            <div className="preferences">
              <label>
                <span>
                  <strong>Apparence</strong>
                  <small>
                    Jour, nuit, ou selon votre appareil. Votre choix est
                    mémorisé.
                  </small>
                </span>
                <select
                  aria-label="Thème de l’interface"
                  value={preference}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (
                      value === "system" ||
                      value === "light" ||
                      value === "dark"
                    )
                      setPreference(value);
                  }}
                >
                  <option value="system">Selon l’appareil</option>
                  <option value="light">Mode jour</option>
                  <option value="dark">Mode nuit</option>
                </select>
              </label>
              <label>
                <span>
                  <strong>Son des ouvertures</strong>
                  <small>Accompagner vos découvertes d’un son discret.</small>
                </span>
                <input
                  type="checkbox"
                  checked={game.state.preferences.sound}
                  disabled={game.busy || !game.ready}
                  onChange={(event) => {
                    const sound = event.target.checked;
                    void game.act({ type: "preferences", sound });
                  }}
                />
              </label>
              <label>
                <span>
                  <strong>Réduire les animations</strong>
                  <small>Une ouverture plus calme, sans confettis.</small>
                </span>
                <input
                  type="checkbox"
                  checked={game.state.preferences.reducedMotion}
                  disabled={game.busy || !game.ready}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    void game.act({
                      type: "preferences",
                      reducedMotion: checked,
                    });
                  }}
                />
              </label>
              <p className="form-help">
                {game.mode === "connected"
                  ? "Votre progression est enregistrée sur votre compte. Une connexion Internet est nécessaire pour jouer."
                  : "Votre partie locale reste dans ce navigateur. Un compte commence une nouvelle partie en ligne, séparée de celle-ci."}
              </p>
              {onOpenAccount && (
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => {
                    setHelpOpen(false);
                    onOpenAccount();
                  }}
                >
                  <UserRound size={16} /> Mon compte
                </button>
              )}
              {localAdminEnabled && (
                <button
                  type="button"
                  className="button button-secondary"
                  disabled={!game.ready}
                  onClick={() => {
                    setHelpOpen(false);
                    setAdminOpen(true);
                  }}
                >
                  <Shield size={16} /> Commandes de test locales
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}
      {game.notice && (
        <div
          className={`toast toast-${game.notice.kind}`}
          role={game.notice.kind === "error" ? "alert" : "status"}
          key={game.notice.id}
        >
          <span>
            {game.notice.kind === "success" ? (
              <Check size={18} />
            ) : (
              <CircleHelp size={18} />
            )}
          </span>
          <p>{game.notice.message}</p>
        </div>
      )}
    </div>
  );
}
