/** Interactive production QA. No App, repository or useGame runtime import. */
import { useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Coins, Moon, Sun } from "lucide-react";
import { Workshop } from "../src/screens/Workshop";
import { BrigoLogo } from "../src/components/BrigoLogo";
import { adminCommand, buildRecipe, createGame } from "../src/game/engine";
import {
  recipeProductionIntervalMs,
} from "../src/game/production";
import { parseSave } from "../src/game/save";
import { applyGameCommand } from "../src/game/commands";
import { RECIPE_BY_ID } from "../src/game/catalog";
import type { Game } from "../src/screens/types";
import { applyTheme } from "../src/theme";
import type { Theme } from "../src/theme";
import "@fontsource-variable/dm-sans";
import "@fontsource-variable/outfit";
import "../src/styles.css";
import "../src/accessibility.css";
import "../src/studio-theme.css";

if (!import.meta.env.DEV) throw new Error("Essai réservé au développement.");
const params = new URLSearchParams(location.search);
const now = Date.now();
let initial = createGame();
for (const recipeId of [
  "totem",
  "totem",
  "harbour-lighthouse",
  "high-citadel",
]) {
  if (!RECIPE_BY_ID.has(recipeId))
    throw new Error(`Plan de test inconnu : ${recipeId}`);
  initial = adminCommand(initial, { type: "recipe", recipeId }, true);
  initial = buildRecipe(initial, recipeId);
}
initial = parseSave({
  ...initial,
  coins: 1000,
  production: {
    observedAt: now,
    entries: Object.fromEntries(
      initial.constructions.map((construction) => [
        construction.id,
        {
          anchorAt:
            now -
            (params.get("fresh") === "1"
              ? 30_000
              : recipeProductionIntervalMs(
                  RECIPE_BY_ID.get(construction.recipeId)!,
                ) * 2.25),
          claimedCycles: 0,
          bankedCoins: 0,
        },
      ]),
    ),
  },
});
const initialTheme: Theme = params.get("theme") === "dark" ? "dark" : "light";
applyTheme(initialTheme);

function ReviewProduction() {
  const [state, setState] = useState(initial);
  const current = useRef(state);
  const [theme, setTheme] = useState(initialTheme);
  const [notice, setNotice] = useState(
    params.get("fresh") === "1"
      ? "Nouvelles constructions fictives : premier cycle en cours."
      : "Récoltes fictives prêtes après deux cycles.",
  );
  const game: Game = {
    state,
    ready: true,
    busy: false,
    persistent: false,
    notice: null,
    notify: setNotice,
    act: async (command, message) => {
      try {
        const applied = applyGameCommand(current.current, command, Date.now());
        const next = parseSave(applied.state);
        current.current = next;
        setState(next);
        setNotice(message ?? "Récolte enregistrée en mémoire.");
        return {
          state: next,
          revision: 1,
          serverTime: new Date().toISOString(),
          result: applied.result,
          replayed: false,
        };
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "Action refusée.");
        return null;
      }
    },
  };
  return (
    <div className="app-shell">
      <div
        role="note"
        style={{
          padding: 10,
          textAlign: "center",
          background: "var(--studio-accent-wash)",
          color: "var(--ink)",
          fontSize: 13,
        }}
      >
        ESSAI INTERACTIF · Aucune lecture ni écriture de sauvegarde
      </div>
      <header className="site-header">
        <div className="header-inner">
          <a
            href="#workshop"
            className="brand"
            aria-label="Brigos, essai des récoltes"
          >
            <BrigoLogo />
          </a>
          <span
            className="coin-balance"
            aria-label={`Pièces de test : ${state.coins}`}
            style={{ marginLeft: "auto" }}
          >
            <Coins size={18} />
            {state.coins.toLocaleString("fr-FR")}
          </span>
          <button
            type="button"
            className="icon-button"
            aria-label={
              theme === "dark" ? "Activer le mode jour" : "Activer le mode nuit"
            }
            onClick={() => {
              const next = theme === "dark" ? "light" : "dark";
              setTheme(next);
              applyTheme(next);
            }}
          >
            {theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
          </button>
        </div>
      </header>
      <main className="main-content">
        <p role="status" style={{ padding: "8px 0", fontSize: 13 }}>
          {notice}
        </p>
        <Workshop
          game={game}
          onRecipe={(id) =>
            setNotice(`Plan de test : ${RECIPE_BY_ID.get(id)?.name}`)
          }
        />
      </main>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<ReviewProduction />);
