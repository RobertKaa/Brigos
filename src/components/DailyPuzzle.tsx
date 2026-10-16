import { useId, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { ArrowRight, Check, Coins, Lightbulb, RotateCw } from "lucide-react";
import {
  getConnectedPuzzleTiles,
  getDailyPuzzle,
  getPuzzleHint,
  isDailyPuzzleSolved,
  puzzleConnections,
} from "../game/dailyPuzzle";
import "./DailyPuzzle.css";

export interface DailyPuzzleProps {
  dayKey: string;
  completed: boolean;
  disabled: boolean;
  onComplete: (rotations: readonly number[]) => void;
}

const DIRECTIONS = ["nord", "est", "sud", "ouest"] as const;

/** No game state or wallet mutation: the parent validates and claims the reward. */
export function DailyPuzzle(props: DailyPuzzleProps) {
  return <PuzzleRound key={props.dayKey} {...props} />;
}

function PuzzleRound({
  dayKey,
  completed,
  disabled,
  onComplete,
}: DailyPuzzleProps) {
  const headingId = useId();
  const instructionsId = useId();
  const puzzle = useMemo(() => getDailyPuzzle(dayKey), [dayKey]);
  const [rotations, setRotations] = useState(() => [
    ...puzzle.initialRotations,
  ]);
  const [hint, setHint] = useState<{ index: number; rotation: number } | null>(
    null,
  );
  const [hintUsed, setHintUsed] = useState(false);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const solved = isDailyPuzzleSolved(dayKey, rotations);
  const connected = getConnectedPuzzleTiles(dayKey, rotations);

  function rotate(index: number) {
    if (disabled) return;
    setRotations((current) =>
      current.map((rotation, tile) =>
        tile === index ? (rotation + 1) % 4 : rotation,
      ),
    );
  }

  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const offsets: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -4,
      ArrowDown: 4,
    };
    const offset = offsets[event.key];
    if (offset === undefined) return;
    event.preventDefault();
    const next = index + offset;
    if (next < 0 || next >= 16) return;
    if (
      (event.key === "ArrowLeft" || event.key === "ArrowRight") &&
      Math.floor(next / 4) !== Math.floor(index / 4)
    )
      return;
    buttons.current[next]?.focus();
  }

  return (
    <section
      className={`daily-puzzle${solved ? " is-solved" : ""}`}
      aria-labelledby={headingId}
    >
      <div className="daily-puzzle-heading">
        <div>
          <span className="daily-puzzle-kicker">Le défi gratuit du jour</span>
          <h3 id={headingId}>Circuit des facettes</h3>
        </div>
        <span className="daily-puzzle-prize">
          <Coins size={17} aria-hidden="true" />
          150
        </span>
      </div>
      <p id={instructionsId} className="daily-puzzle-instructions">
        Tournez les tuiles pour relier l’entrée à la sortie. Chaque clic fait un
        quart de tour. Aucun coût, autant d’essais que vous voulez.
      </p>
      <div
        className="daily-puzzle-board"
        role="group"
        aria-label="Circuit de 16 tuiles"
        aria-describedby={instructionsId}
      >
        <span
          className="daily-puzzle-port is-entry"
          style={{ gridRow: Math.floor(puzzle.entry / 4) + 1 }}
        >
          <span>Entrée</span>
          <ArrowRight size={20} aria-hidden="true" />
        </span>
        <div className="daily-puzzle-grid">
          {puzzle.tiles.map((tile, index) => {
            const directions = puzzleConnections(tile, rotations[index])
              .map((direction) => DIRECTIONS[direction])
              .join(" et ");
            const isConnected = connected.includes(index);
            const isHint = hint?.index === index;
            return (
              <button
                key={index}
                ref={(element) => {
                  buttons.current[index] = element;
                }}
                type="button"
                className={`daily-puzzle-tile${isConnected ? " is-connected" : ""}${isHint ? " is-hint" : ""}`}
                aria-label={`Ligne ${Math.floor(index / 4) + 1}, colonne ${(index % 4) + 1} : ${directions}. Tourner d’un quart de tour.`}
                disabled={disabled}
                onClick={() => rotate(index)}
                onKeyDown={(event) => navigate(event, index)}
              >
                <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
                  <path
                    className="daily-puzzle-facet"
                    d="M8 1H56L63 8V56L56 63H8L1 56V8Z"
                  />
                  <g transform={`rotate(${rotations[index] * 90} 32 32)`}>
                    <path
                      className="daily-puzzle-track"
                      d={
                        tile === "bend" ? "M32 0V24Q32 32 40 32H64" : "M32 0V64"
                      }
                    />
                    <path
                      className="daily-puzzle-track-core"
                      d={
                        tile === "bend" ? "M32 0V24Q32 32 40 32H64" : "M32 0V64"
                      }
                    />
                  </g>
                  <path
                    className="daily-puzzle-rivet"
                    d="M32 27L37 32L32 37L27 32Z"
                  />
                </svg>
                {isHint && (
                  <Lightbulb
                    size={12}
                    className="daily-puzzle-hint-icon"
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
        </div>
        <span
          className="daily-puzzle-port is-exit"
          style={{ gridRow: Math.floor(puzzle.exit / 4) + 1 }}
        >
          <ArrowRight size={20} aria-hidden="true" />
          <span>Sortie</span>
        </span>
      </div>
      <p className="daily-puzzle-status" role="status" aria-live="polite">
        {completed ? (
          <>
            <Check size={16} aria-hidden="true" />
            Récompense reçue. Vous pouvez continuer à jouer.
          </>
        ) : solved ? (
          <>
            <Check size={16} aria-hidden="true" />
            Circuit relié ! Vos 150 pièces sont prêtes.
          </>
        ) : (
          <>
            <RotateCw size={16} aria-hidden="true" />
            {connected.length}{" "}
            {connected.length === 1 ? "tuile reliée" : "tuiles reliées"} à
            l’entrée.
          </>
        )}
      </p>
      {hint && !solved && (
        <p className="daily-puzzle-hint-text">
          Indice : ligne {Math.floor(hint.index / 4) + 1}, colonne{" "}
          {(hint.index % 4) + 1}. Reliez{" "}
          {puzzleConnections(puzzle.tiles[hint.index], hint.rotation)
            .map((direction) => DIRECTIONS[direction])
            .join(" et ")}{" "}
          sur la tuile marquée.
        </p>
      )}
      <div className="daily-puzzle-actions">
        <button
          type="button"
          className="daily-puzzle-hint-button"
          disabled={disabled || hintUsed || solved}
          onClick={() => {
            setHint(getPuzzleHint(dayKey, rotations));
            setHintUsed(true);
          }}
        >
          <Lightbulb size={16} aria-hidden="true" />
          {hintUsed ? "Indice affiché" : "Afficher un indice"}
        </button>
        <button
          type="button"
          className="daily-puzzle-claim"
          disabled={disabled || completed || !solved}
          onClick={() => {
            if (!disabled && !completed && solved) onComplete([...rotations]);
          }}
        >
          {completed ? (
            <Check size={17} aria-hidden="true" />
          ) : (
            <Coins size={17} aria-hidden="true" />
          )}
          {completed ? "150 pièces reçues" : "Réclamer 150 pièces"}
        </button>
      </div>
      <p className="daily-puzzle-keyboard">
        Clavier : flèches pour se déplacer, Entrée ou Espace pour tourner.
      </p>
    </section>
  );
}
