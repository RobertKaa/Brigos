import {
  lazy,
  memo,
  Suspense,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import type { KeyboardEvent } from "react";
import {
  ArrowDownToLine,
  Focus,
  Hand,
  LoaderCircle,
  Minus,
  Plus,
  RotateCw,
} from "lucide-react";
import type { SandboxSceneProps } from "./SandboxScene";
import type { SandboxWorldController } from "./sandbox3d/world";
import { SANDBOX_GRID_SIZE } from "../game/sandbox";
import "./SandboxWorld.css";

export interface SandboxWorldProps extends SandboxSceneProps {
  disabled?: boolean;
  resetKey?: string;
}

const FallbackScene = lazy(() =>
  import("./SandboxScene").then((module) => ({ default: module.SandboxScene })),
);

/** Only the editor loads WebGL. Camera movement never writes to the game. */
export const SandboxWorld = memo(function SandboxWorld(
  props: SandboxWorldProps,
) {
  const host = useRef<HTMLDivElement>(null);
  const controller = useRef<SandboxWorldController | null>(null);
  const current = useRef(props);
  current.current = props;
  const [status, setStatus] = useState<"loading" | "ready" | "fallback">(
    "loading",
  );
  const [attempt, setAttempt] = useState(0);
  const [navigation, setNavigation] = useState<"orbit" | "pan">("orbit");
  const instructions = useId();

  useEffect(() => {
    let alive = true;
    setStatus("loading");
    const unavailable = () => {
      if (alive) {
        controller.current?.dispose();
        controller.current = null;
        setStatus("fallback");
      }
    };
    import("./sandbox3d/world")
      .then(({ createSandboxWorld }) => {
        if (!alive || !host.current) return;
        try {
          controller.current = createSandboxWorld(
            host.current,
            current.current,
            unavailable,
          );
          setStatus("ready");
        } catch {
          unavailable();
        }
      })
      .catch(unavailable);
    return () => {
      alive = false;
      controller.current?.dispose();
      controller.current = null;
    };
  }, [attempt]);

  useEffect(() => {
    controller.current?.update(props);
  }, [props]);
  useEffect(() => {
    controller.current?.setNavigation(navigation);
  }, [navigation, status]);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (
      event.target !== event.currentTarget &&
      (event.target as HTMLElement).tagName !== "CANVAS"
    )
      return;
    if (event.ctrlKey || event.altKey || event.metaKey) return;
    const movement = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    }[event.key];
    if (movement) {
      event.preventDefault();
      if (props.disabled) return;
      const point = {
        ...props.cursor,
        x: Math.max(
          0,
          Math.min(SANDBOX_GRID_SIZE - 1, props.cursor.x + movement[0]),
        ),
        y: Math.max(
          0,
          Math.min(SANDBOX_GRID_SIZE - 1, props.cursor.y + movement[1]),
        ),
      };
      if (props.onCursorMove) props.onCursorMove(point);
      else props.onCell(point.x, point.y);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!props.disabled && props.candidateValid) props.onPlace?.();
    } else if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      controller.current?.zoom(0.8);
    } else if (event.key === "-") {
      event.preventDefault();
      controller.current?.zoom(1.25);
    } else if (event.key.toLowerCase() === "f") {
      event.preventDefault();
      controller.current?.frame();
    } else if (event.key.toLowerCase() === "t") {
      event.preventDefault();
      controller.current?.top();
    }
  }

  return (
    <div
      className="sandbox-world"
      data-status={status}
      data-navigation={navigation}
    >
      <div
        className="sandbox-world-toolbar"
        role="group"
        aria-label="Caméra 3D"
      >
        <div className="sandbox-world-navigation">
          <button
            type="button"
            aria-label="Tourner la vue 3D"
            title="Glisser pour tourner · un doigt sur mobile"
            aria-pressed={navigation === "orbit"}
            onClick={() => setNavigation("orbit")}
          >
            <RotateCw size={16} aria-hidden="true" />
            <span>Tourner</span>
          </button>
          <button
            type="button"
            aria-label="Déplacer la vue 3D"
            title="Glisser pour déplacer la caméra"
            aria-pressed={navigation === "pan"}
            onClick={() => setNavigation("pan")}
          >
            <Hand size={16} aria-hidden="true" />
            <span>Déplacer</span>
          </button>
        </div>
        <div className="sandbox-world-camera-actions">
          <button
            type="button"
            aria-label="Éloigner la caméra"
            title="Éloigner (−)"
            disabled={status !== "ready"}
            onClick={() => controller.current?.zoom(1.25)}
          >
            <Minus size={17} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Rapprocher la caméra"
            title="Rapprocher (+)"
            disabled={status !== "ready"}
            onClick={() => controller.current?.zoom(0.8)}
          >
            <Plus size={17} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Vue du dessus"
            title="Vue du dessus (T)"
            disabled={status !== "ready"}
            onClick={() => controller.current?.top()}
          >
            <ArrowDownToLine size={17} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Recentrer la construction"
            title="Recentrer (F)"
            disabled={status !== "ready"}
            onClick={() => controller.current?.frame()}
          >
            <Focus size={17} aria-hidden="true" />
          </button>
        </div>
      </div>
      <p id={instructions} className="sandbox-world-instructions">
        Clic bref pour viser, glisser pour tourner. En mode Déplacer, glisser
        déplace la caméra. Molette ou deux doigts pour zoomer. Flèches pour
        viser et Entrée pour confirmer. F recentre et T montre le dessus.
      </p>
      <div
        className="sandbox-world-stage"
        ref={host}
        tabIndex={0}
        role="group"
        aria-label="Espace 3D de construction libre"
        aria-describedby={instructions}
        onKeyDown={onKeyDown}
      >
        {status === "loading" && (
          <div className="sandbox-world-loading" role="status">
            <LoaderCircle size={23} aria-hidden="true" />
            Préparation de votre espace 3D…
          </div>
        )}
        {status === "fallback" && (
          <div className="sandbox-world-fallback">
            <p role="status">
              La 3D n’est pas disponible sur cet appareil. La vue de secours et
              les coordonnées restent utilisables.
            </p>
            <button
              type="button"
              onClick={() => setAttempt((value) => value + 1)}
            >
              Réessayer la 3D
            </button>
            <Suspense fallback={<p>Chargement de la vue de secours…</p>}>
              <FallbackScene {...props} />
            </Suspense>
          </div>
        )}
        {status === "ready" && (
          <div className="sandbox-world-overlay">
            <output aria-label="Position visée">
              X {props.cursor.x + 1} <span>·</span> Y {props.cursor.y + 1}{" "}
              <span>·</span> H {props.cursor.z}
            </output>
            <button
              type="button"
              className="sandbox-world-place"
              disabled={props.disabled || !props.candidateValid}
              onClick={() => {
                if (!props.disabled && props.candidateValid) props.onPlace?.();
              }}
            >
              <Plus size={17} aria-hidden="true" />
              {props.selectedId
                ? "Déplacer ici"
                : props.interactionMode === "select"
                  ? "Choisir une pièce"
                  : "Poser ici"}
            </button>
          </div>
        )}
      </div>
      <div className="sandbox-world-status" aria-live="polite">
        {navigation === "pan"
          ? "Glissez pour déplacer la vue. Revenez à Tourner pour viser une surface."
          : props.interactionMode === "select"
            ? "Touchez une pièce pour la modifier."
            : "Touchez le sol ou une brique pour viser. Confirmez avec Poser ici."}
      </div>
    </div>
  );
});
