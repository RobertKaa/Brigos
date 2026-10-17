/** Interactive sandbox QA. No repository, App or useGame runtime is imported. */
import { useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Moon, Sun } from "lucide-react";
import { Sandbox } from "../src/screens/Sandbox";
import { BrigoLogo } from "../src/components/BrigoLogo";
import { createGame } from "../src/game/engine";
import type { GameState } from "../src/game/engine";
import { createSandboxProject, placeSandboxBrigo } from "../src/game/sandbox";
import { parseSave } from "../src/game/save";
import { applyGameCommand } from "../src/game/commands";
import { BRIGO_BY_ID } from "../src/game/catalog";
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
const params = new URLSearchParams(location.search);
const stock: Record<string, number> = {
  "brick-2x2:coral": 8,
  "brick-1x2:ivory": 12,
  "brick-2x4:blue": 8,
  "brick-1x1:yellow": 8,
  "plate-4x4:ivory": 4,
  "plate-2x4:green": 6,
  "slope-2x2:coral": 6,
  "round-2x2:green": 4,
  "special-wheel:charcoal": 4,
  "special-axle:charcoal": 2,
};
if (params.get("dense") === "1") stock["plate-6x6:blue"] = 500;
for (const id of Object.keys(stock))
  if (!BRIGO_BY_ID.has(id))
    throw new Error(`Référence de test inconnue : ${id}`);
let initialState: GameState = {
  ...createGame(),
  inventory: stock,
  discovered: Object.keys(stock),
};
if (params.get("empty") !== "1") {
  initialState = createSandboxProject(
    initialState,
    params.get("dense") === "1"
      ? "Le plateau de 500 Brigos"
      : "Le petit belvédère",
  );
  const project = initialState.sandboxProjects!.at(-1)!;
  const demo = [
    { brigoId: "plate-4x4:ivory", x: 10, y: 10, z: 0, rotation: 0 as const },
    { brigoId: "brick-2x2:coral", x: 10, y: 10, z: 1, rotation: 0 as const },
    { brigoId: "brick-2x2:coral", x: 12, y: 10, z: 1, rotation: 0 as const },
    { brigoId: "slope-2x2:coral", x: 10, y: 10, z: 4, rotation: 0 as const },
    { brigoId: "slope-2x2:coral", x: 12, y: 10, z: 4, rotation: 0 as const },
    { brigoId: "round-2x2:green", x: 10, y: 12, z: 1, rotation: 0 as const },
  ];
  const placements =
    params.get("dense") === "1"
      ? Array.from({ length: 500 }, (_, index) => ({
          brigoId: "plate-6x6:blue",
          x: (index % 4) * 6,
          y: (Math.floor(index / 4) % 4) * 6,
          z: Math.floor(index / 16),
          rotation: 0 as const,
        }))
      : demo;
  for (const placement of placements)
    initialState = placeSandboxBrigo(initialState, project.id, placement);
}
const initialTheme: Theme = params.get("theme") === "dark" ? "dark" : "light";
applyTheme(initialTheme);
function ReviewSandbox() {
  const [state, setState] = useState(initialState);
  const current = useRef(state);
  const [theme, setTheme] = useState(initialTheme);
  const [notice, setNotice] = useState("");
  const game: Game = {
    state,
    ready: true,
    busy: false,
    persistent: false,
    notice: null,
    notify: (message) => setNotice(message),
    act: async (command, message) => {
      try {
        const applied = applyGameCommand(current.current, command, Date.now());
        const next = parseSave(applied.state);
        current.current = next;
        setState(next);
        setNotice(message ?? "Construction de test enregistrée en mémoire.");
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
        ESSAI INTERACTIF · Stock fictif · Aucune lecture ni écriture de
        sauvegarde
      </div>
      <header className="site-header">
        <div className="header-inner">
          <a
            href="#sandbox"
            className="brand"
            aria-label="Brigos, essai du bac à sable"
          >
            <BrigoLogo />
          </a>
          <button
            type="button"
            className="icon-button"
            style={{ marginLeft: "auto" }}
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
        <button
          type="button"
          className="text-link"
          style={{ minHeight: 44, marginBottom: 8 }}
          onClick={() => {
            const canvas = document.querySelector<HTMLCanvasElement>(
              ".sandbox-world-stage > canvas",
            );
            const context = canvas?.getContext("webgl2");
            context?.getExtension("WEBGL_lose_context")?.loseContext();
          }}
        >
          Tester le secours 3D
        </button>
        <Sandbox game={game} />
        <p role="status" style={{ padding: 16 }}>
          {notice}
        </p>
      </main>
    </div>
  );
}
const reviewRoot = createRoot(document.getElementById("root")!);
reviewRoot.render(<ReviewSandbox />);
if (import.meta.hot) import.meta.hot.dispose(() => reviewRoot.unmount());
