/** Development-only app review. Uses GameApp, never mounts useGame or a repository. */
import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { GameApp } from "../src/App";
import { adminCommand, buildRecipe, createGame } from "../src/game/engine";
import { parseSave } from "../src/game/save";
import {
  observeProduction,
  recipeProductionIntervalMs,
} from "../src/game/production";
import { syncEngagement } from "../src/game/engagement";
import { applyGameCommand } from "../src/game/commands";
import { RECIPE_BY_ID } from "../src/game/catalog";
import type { Game } from "../src/screens/types";
import type { Notice } from "../src/game/useGame";
import "@fontsource-variable/dm-sans";
import "@fontsource-variable/outfit";
import "../src/styles.css";
import "../src/accessibility.css";
import "../src/studio-theme.css";

if (!import.meta.env.DEV) throw new Error("Essai réservé au développement.");
let initial = createGame();
if (new URLSearchParams(location.search).get("empty") !== "1") {
  for (const recipeId of ["totem", "totem", "bench"]) {
    initial = adminCommand(initial, { type: "recipe", recipeId }, true);
    initial = buildRecipe(initial, recipeId);
  }
  for (const recipeId of ["tree", "house", "rover"])
    if (RECIPE_BY_ID.has(recipeId))
      initial = adminCommand(initial, { type: "recipe", recipeId }, true);
  const now = Date.now();
  initial = parseSave({
    ...initial,
    coins: 2840,
    goalRecipeId: "house",
    production: {
      observedAt: now,
      entries: Object.fromEntries(
        initial.constructions.map((item) => [
          item.id,
          {
            anchorAt:
              now -
              2.25 *
                recipeProductionIntervalMs(RECIPE_BY_ID.get(item.recipeId)!),
            claimedCycles: 0,
            bankedCoins: 0,
          },
        ]),
      ),
    },
  });
}
initial = syncEngagement(initial, initial);

function ReviewJourneys() {
  const [state, setState] = useState(initial);
  const current = useRef(state);
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const revision = useRef(0);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 4500);
    return () => window.clearTimeout(timer);
  }, [notice]);
  const game: Game = {
    state,
    ready: true,
    busy,
    persistent: true,
    notice,
    notify: (message, kind = "success") =>
      setNotice({ id: Date.now(), message, kind }),
    act: async (command, message) => {
      if (lock.current) return null;
      lock.current = true;
      setBusy(true);
      try {
        const now = Date.now();
        const applied = applyGameCommand(current.current, command, now);
        const next = parseSave(applied.state);
        current.current = next;
        setState(next);
        revision.current++;
        if (message) setNotice({ id: now, message, kind: "success" });
        return {
          state: next,
          revision: revision.current,
          serverTime: new Date(now).toISOString(),
          result: applied.result,
          replayed: false,
        };
      } catch (error) {
        setNotice({
          id: Date.now(),
          message: error instanceof Error ? error.message : "Action refusée.",
          kind: "error",
        });
        return null;
      } finally {
        lock.current = false;
        setBusy(false);
      }
    },
    localAct: async (transform, message) => {
      if (lock.current) return false;
      lock.current = true;
      setBusy(true);
      try {
        const next = parseSave(
          observeProduction(
            syncEngagement(transform(current.current), current.current),
          ),
        );
        current.current = next;
        setState(next);
        if (message) setNotice({ id: Date.now(), message, kind: "success" });
        return true;
      } catch (error) {
        setNotice({
          id: Date.now(),
          message: error instanceof Error ? error.message : "Action refusée.",
          kind: "error",
        });
        return false;
      } finally {
        lock.current = false;
        setBusy(false);
      }
    },
  };
  return (
    <GameApp
      game={game}
      onOpenAccount={() =>
        setNotice({
          id: Date.now(),
          message: "Aperçu du compte : scripts/review-account.html",
          kind: "success",
        })
      }
    />
  );
}
const reviewRoot = createRoot(document.getElementById("root")!);
reviewRoot.render(<ReviewJourneys />);
if (import.meta.hot) import.meta.hot.dispose(() => reviewRoot.unmount());
