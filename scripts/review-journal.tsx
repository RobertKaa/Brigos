/** Interactive QA fixture: no repository, storage, App or useGame is imported. */
import { useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Coins, Moon, Sun } from "lucide-react";
import { Journal } from "../src/screens/Journal";
import { BrigoLogo } from "../src/components/BrigoLogo";
import { createGame } from "../src/game/engine";
import { applyGameCommand } from "../src/game/commands";
import { parseSave } from "../src/game/save";
import type { Game } from "../src/screens/types";
import { applyTheme } from "../src/theme";
import type { Theme } from "../src/theme";
import "@fontsource-variable/dm-sans";
import "@fontsource-variable/outfit";
import "../src/styles.css";
import "../src/accessibility.css";
import "../src/studio-theme.css";

if (!import.meta.env.DEV)
  throw new Error("Cet essai est réservé au développement.");

const initialState = {
  ...createGame(),
  coins: 0,
  boxes: { discovery: 0, workshop: 0, prism: 0 },
};
const initialTheme: Theme =
  new URLSearchParams(location.search).get("theme") === "dark"
    ? "dark"
    : "light";
applyTheme(initialTheme);
function ReviewJournal() {
  const [state, setState] = useState(initialState);
  const currentState = useRef(state);
  const [theme, setTheme] = useState(initialTheme);
  const [message, setMessage] = useState("");
  const game: Game = {
    state,
    ready: true,
    busy: false,
    persistent: false,
    notice: null,
    notify: (text) => setMessage(text),
    act: async (command, success) => {
      try {
        const previous = currentState.current;
        const applied = applyGameCommand(previous, command, Date.now());
        const next = parseSave(applied.state);
        currentState.current = next;
        setState(next);
        setMessage(success ?? "Action de test terminée.");
        return {
          state: next,
          revision: 1,
          serverTime: new Date().toISOString(),
          result: applied.result,
          replayed: false,
        };
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Action refusée.");
        return null;
      }
    },
  };
  return (
    <div className="app-shell">
      <div
        role="note"
        style={{
          padding: 12,
          background: "var(--studio-accent-wash)",
          color: "var(--ink)",
          textAlign: "center",
          fontSize: 13,
        }}
      >
        ESSAI INTERACTIF · Partie fictive à zéro pièce · Aucune sauvegarde lue
        ou écrite
      </div>
      <header className="site-header">
        <div className="header-inner">
          <BrigoLogo />
          <div className="header-tools" style={{ marginLeft: "auto" }}>
            <span className="wallet">
              <Coins size={17} />
              <strong aria-label="Pièces de test">
                {state.coins.toLocaleString("fr-FR")}
              </strong>
            </span>
            <button
              type="button"
              className="icon-button"
              aria-label={
                theme === "dark"
                  ? "Activer le mode jour"
                  : "Activer le mode nuit"
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
        </div>
      </header>
      <main className="main-content">
        <Journal game={game} />
        <aside
          style={{
            padding: 20,
            border: "1px dashed var(--line)",
            marginTop: 30,
          }}
          aria-label="Commandes de test"
        >
          <p role="status">{message}</p>
          <button
            type="button"
            className="button button-secondary"
            disabled={!state.boxes.discovery && state.coins < 100}
            onClick={() =>
              void (async () => {
                if (
                  await game.act(
                    { type: "open-box", boxId: "discovery" },
                    "Boîte Découverte de test ouverte.",
                  )
                )
                  await game.act({ type: "finish-opening" });
              })()
            }
          >
            Ouvrir une Découverte de test
          </button>
          <p>
            Boîtes ouvertes : {state.boxesOpened} · Découvertes en réserve :{" "}
            {state.boxes.discovery}
          </p>
        </aside>
      </main>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<ReviewJournal />);
