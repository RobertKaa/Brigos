import { useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Box,
  Check,
  ChevronLeft,
  ChevronRight,
  Grid2X2,
  Layers3,
  MousePointer2,
  Plus,
  RotateCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { BrigoArt } from "../components/BrigoArt";
import { SandboxWorld } from "../components/SandboxWorld";
import { BRIGO_BY_ID, CATALOG, COLORS, FAMILY_NAMES } from "../game/catalog";
import type { Brigo } from "../game/catalog";
import type { Rotation } from "../game/geometry";
import {
  sandboxAutoHeight,
  sandboxPlacementIssue,
  SANDBOX_GRID_SIZE,
  SANDBOX_MAX_HEIGHT,
  SANDBOX_MAX_PLACEMENTS,
  SANDBOX_MAX_PROJECTS,
} from "../game/sandbox";
import type { SandboxCandidate, SandboxPlacement } from "../game/sandbox";
import type { Game } from "./types";
import "./sandbox.css";

export const SANDBOX_PALETTE_PAGE_SIZE = 24;
const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr-FR");

export function sandboxPalette(
  inventory: Record<string, number>,
  query = "",
  color = "all",
  family = "all",
): Brigo[] {
  const search = normalize(query.trim());
  return CATALOG.filter(
    (brigo) =>
      inventory[brigo.id] > 0 &&
      (color === "all" || brigo.color.id === color) &&
      (family === "all" || brigo.model.family === family) &&
      (!search ||
        normalize(
          `${brigo.name} ${brigo.model.name} ${brigo.color.name} ${brigo.number}`,
        ).includes(search)),
  );
}

export function Sandbox({ game }: { game: Game }) {
  const { state, act, ready, busy } = game;
  const projects = state.sandboxProjects ?? [];
  const [projectId, setProjectId] = useState<string | null>(
    () => projects[0]?.id ?? null,
  );
  const project = projects.find((item) => item.id === projectId) ?? projects[0];
  const [newName, setNewName] = useState("");
  const [draftName, setDraftName] = useState<{
    id: string;
    value: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [interactionMode, setInteractionMode] = useState<"place" | "select">(
    "place",
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [brigoId, setBrigoId] = useState<string | null>(
    () => CATALOG.find((item) => state.inventory[item.id] > 0)?.id ?? null,
  );
  const [cursor, setCursor] = useState({ x: 11, y: 11 });
  const [rotation, setRotation] = useState<Rotation>(0);
  const [automatic, setAutomatic] = useState(true);
  const [height, setHeight] = useState(0);
  const buildArea = useRef<HTMLElement>(null);
  const [query, setQuery] = useState("");
  const [color, setColor] = useState("all");
  const [family, setFamily] = useState("all");
  const [palettePage, setPalettePage] = useState(1);
  const locked = busy || !ready;
  const placements = project?.placements ?? [];
  const selected =
    interactionMode === "select"
      ? placements.find((item) => item.id === selectedId)
      : undefined;
  const waitingForSelection = interactionMode === "select" && !selected;
  const activeId =
    selected?.brigoId ?? (interactionMode === "place" ? brigoId : null);
  const activeBrigo = activeId ? BRIGO_BY_ID.get(activeId) : undefined;
  const available = activeId ? (state.inventory[activeId] ?? 0) : 0;
  const stockCount = Object.values(state.inventory).reduce(
    (total, amount) => total + amount,
    0,
  );
  const palette = useMemo(
    () => sandboxPalette(state.inventory, query, color, family),
    [state.inventory, query, color, family],
  );
  const pages = Math.max(
    1,
    Math.ceil(palette.length / SANDBOX_PALETTE_PAGE_SIZE),
  );
  const page = Math.min(palettePage, pages);
  const visiblePalette = palette.slice(
    (page - 1) * SANDBOX_PALETTE_PAGE_SIZE,
    page * SANDBOX_PALETTE_PAGE_SIZE,
  );
  const candidateBase = activeId
    ? { brigoId: activeId, ...cursor, rotation }
    : null;
  const autoHeight = candidateBase
    ? sandboxAutoHeight(placements, candidateBase, selected?.id)
    : null;
  const candidate: SandboxCandidate | null = candidateBase
    ? { ...candidateBase, z: automatic ? (autoHeight ?? 0) : height }
    : null;
  const issue = waitingForSelection
    ? "Choisissez une pièce posée sur le terrain pour la modifier."
    : !activeBrigo
      ? "Choisissez un Brigo dans votre stock."
      : !selected && available < 1
        ? "Ce Brigo est épuisé. Choisissez une autre pièce ou retirez-en une du projet."
        : !selected && placements.length >= SANDBOX_MAX_PLACEMENTS
          ? `Ce projet a atteint ses ${SANDBOX_MAX_PLACEMENTS} Brigos. Retirez une pièce pour continuer.`
          : automatic && autoHeight === null
            ? "Aucune place à cette position. Déplacez le repère ou choisissez une autre hauteur."
            : candidate
              ? sandboxPlacementIssue(placements, candidate, selected?.id)
              : null;
  const valid = !!candidate && !issue;
  const currentName = project
    ? draftName?.id === project.id
      ? draftName.value
      : project.name
    : "";

  function changeProject(id: string) {
    setProjectId(id);
    setInteractionMode("place");
    setSelectedId(null);
    setDeleting(false);
    setAutomatic(true);
    setDraftName(null);
  }
  async function createProject() {
    const name = newName.trim();
    const response = await act(
      name ? { type: "create-project", name } : { type: "create-project" },
      "Votre nouvel espace de création est prêt.",
    );
    const createdId = response?.result.projectId;
    if (typeof createdId === "string") {
      changeProject(createdId);
      setNewName("");
    }
  }
  function selectPiece(piece: SandboxPlacement) {
    setInteractionMode("select");
    setSelectedId(piece.id);
    setBrigoId(piece.brigoId);
    setCursor({ x: piece.x, y: piece.y });
    setRotation(piece.rotation);
    setHeight(piece.z);
    setAutomatic(false);
  }
  function chooseBrigo(id: string) {
    setInteractionMode("place");
    setSelectedId(null);
    setBrigoId(id);
    setAutomatic(true);
    if (window.matchMedia("(max-width: 650px)").matches) {
      const reduceMotion =
        state.preferences.reducedMotion ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      buildArea.current?.scrollIntoView({
        block: "start",
        behavior: reduceMotion ? "instant" : "smooth",
      });
    }
  }
  function changeTool(mode: "place" | "select") {
    if (locked || mode === interactionMode) return;
    setInteractionMode(mode);
    setSelectedId(null);
    setAutomatic(true);
  }
  async function place() {
    if (!project || !candidate || !valid || locked) return;
    await act(
      selected
        ? {
            type: "move-brigo",
            projectId: project.id,
            placementId: selected.id,
            candidate,
          }
        : { type: "place-brigo", projectId: project.id, candidate },
    );
  }
  async function remove() {
    if (!project || !selected || locked) return;
    if (
      await act(
        {
          type: "remove-brigo",
          projectId: project.id,
          placementId: selected.id,
        },
        "Brigo remis dans votre stock.",
      )
    ) {
      setSelectedId(null);
      setAutomatic(true);
    }
  }
  async function deleteProject() {
    if (!project || locked) return;
    if (
      await act(
        { type: "delete-project", projectId: project.id },
        "Projet démonté. Tous ses Brigos ont retrouvé votre stock.",
      )
    ) {
      changeProject("");
    }
  }

  const palettePanel = (
    <section className="sandbox-palette" aria-labelledby="sandbox-stock-title">
      <div className="sandbox-panel-heading">
        <h2 id="sandbox-stock-title">Votre stock</h2>
        <span>{stockCount.toLocaleString("fr-FR")} disponibles</span>
      </div>
      <label className="sandbox-search">
        <Search size={16} aria-hidden="true" />
        <input
          aria-label="Chercher un Brigo dans le stock"
          placeholder="Une forme, une couleur…"
          maxLength={100}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPalettePage(1);
          }}
        />
      </label>
      <div className="sandbox-filters">
        <label>
          <span>Couleur</span>
          <select
            value={color}
            onChange={(event) => {
              setColor(event.target.value);
              setPalettePage(1);
            }}
          >
            <option value="all">Toutes</option>
            {COLORS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Famille</span>
          <select
            value={family}
            onChange={(event) => {
              setFamily(event.target.value);
              setPalettePage(1);
            }}
          >
            <option value="all">Toutes</option>
            {Object.entries(FAMILY_NAMES).map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="sandbox-stock-grid" aria-label="Brigos disponibles">
        {visiblePalette.map((brigo) => (
          <button
            type="button"
            className={`sandbox-stock-piece${activeId === brigo.id && !selected ? " is-active" : ""}`}
            key={brigo.id}
            disabled={locked}
            aria-pressed={activeId === brigo.id && !selected}
            aria-label={`${brigo.model.name}, ${brigo.color.name}, ${state.inventory[brigo.id]} disponibles`}
            onClick={() => chooseBrigo(brigo.id)}
          >
            <BrigoArt brigo={brigo} />
            <span className="sandbox-piece-name">
              {brigo.model.name}
              <small>{brigo.color.name}</small>
            </span>
            <b>×{state.inventory[brigo.id]}</b>
          </button>
        ))}
      </div>
      {!palette.length && (
        <div className="sandbox-stock-empty">
          <Layers3 size={26} aria-hidden="true" />
          <p>
            {stockCount
              ? "Aucun Brigo ne correspond à ces filtres."
              : "Vos Brigos disponibles apparaîtront ici. Ouvrez une boîte pour commencer."}
          </p>
          {!stockCount && <a href="#boxes">Découvrir les boîtes</a>}
        </div>
      )}
      {pages > 1 && (
        <nav className="sandbox-pagination" aria-label="Pages du stock">
          <button
            type="button"
            aria-label="Stock précédent"
            disabled={page <= 1}
            onClick={() => setPalettePage(page - 1)}
          >
            <ChevronLeft size={18} />
          </button>
          <span>
            {page} / {pages}
          </span>
          <button
            type="button"
            aria-label="Stock suivant"
            disabled={page >= pages}
            onClick={() => setPalettePage(page + 1)}
          >
            <ChevronRight size={18} />
          </button>
        </nav>
      )}
    </section>
  );

  return (
    <div className={`sandbox-screen${project ? " has-project" : ""}`}>
      <a href="#workshop" className="sandbox-back">
        <ArrowLeft size={17} aria-hidden="true" /> Retour à l’atelier
      </a>
      <div className="page-intro sandbox-intro">
        <div>
          <span className="eyebrow">
            <i /> CONSTRUCTION LIBRE
          </span>
          <h1>À vous d’inventer la suite.</h1>
          <p>
            Explorez votre création en 3D, sous tous les angles. Chaque pièce
            posée est prise dans votre stock et vous revient quand vous la
            retirez.
          </p>
        </div>
        <span className="sandbox-page-mark" aria-hidden="true">
          <Grid2X2 size={38} />
        </span>
      </div>
      {!project ? (
        <section className="sandbox-welcome">
          <div className="sandbox-welcome-drawing" aria-hidden="true">
            <Layers3 size={62} strokeWidth={1.2} />
            <span>01 / L’IDÉE</span>
          </div>
          <div>
            <span className="eyebrow">
              SANS PLAN, SANS LIMITE D’IMAGINATION
            </span>
            <h2>Votre première page blanche.</h2>
            <p>
              Assemblez vos propres créations sur une grille de{" "}
              {SANDBOX_GRID_SIZE} × {SANDBOX_GRID_SIZE}. Empilez, tournez et
              recommencez : vos projets se sauvegardent à chaque geste.
            </p>
            <label className="sandbox-new-name">
              Nom de votre projet
              <input
                maxLength={48}
                placeholder="Ma première création"
                value={newName}
                disabled={locked}
                onChange={(event) => setNewName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void createProject();
                  }
                }}
              />
            </label>
            <button
              type="button"
              className="sandbox-primary"
              disabled={locked}
              onClick={() => void createProject()}
            >
              <Plus size={18} aria-hidden="true" /> Créer mon espace
            </button>
            <small>
              {stockCount.toLocaleString("fr-FR")} Brigos disponibles · Aucun
              coût de création
            </small>
          </div>
        </section>
      ) : (
        <>
          <div className="sandbox-project-bar">
            <label className="sandbox-project-choice">
              <span>Mes projets</span>
              <select
                aria-label="Projet libre"
                value={project.id}
                disabled={locked}
                onChange={(event) => changeProject(event.target.value)}
              >
                {projects.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} · {item.placements.length} Brigos
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="sandbox-secondary"
              disabled={locked || projects.length >= SANDBOX_MAX_PROJECTS}
              onClick={() => void createProject()}
            >
              <Plus size={17} aria-hidden="true" /> Nouveau projet
            </button>
            <span className="sandbox-stock-total">
              <Layers3 size={15} aria-hidden="true" />{" "}
              {stockCount.toLocaleString("fr-FR")} en stock
            </span>
            <span className="sandbox-save-status" role="status">
              <Check size={15} aria-hidden="true" />{" "}
              {busy
                ? "Sauvegarde…"
                : ready
                  ? "Sauvegarde automatique"
                  : "Chargement…"}
            </span>
          </div>
          <div className="sandbox-workspace">
            <div className="sandbox-palette-column">{palettePanel}</div>
            <div className="sandbox-main-column">
              <section
                className="sandbox-build-area"
                aria-labelledby="sandbox-project-title"
                ref={buildArea}
              >
                <div className="sandbox-canvas-heading">
                  <div>
                    <span className="eyebrow">
                      {placements.length} / {SANDBOX_MAX_PLACEMENTS} BRIGOS
                      POSÉS
                    </span>
                    <h2 id="sandbox-project-title">{project.name}</h2>
                  </div>
                  <span className="sandbox-view-badge">
                    <Box size={16} aria-hidden="true" /> Vue 3D
                  </span>
                </div>
                <div className="sandbox-interaction-bar">
                  <div
                    role="group"
                    aria-label="Outils du bac à sable"
                    className="sandbox-interaction-tools"
                  >
                    <button
                      type="button"
                      aria-label="Poser des Brigos"
                      aria-pressed={interactionMode === "place"}
                      disabled={locked}
                      onClick={() => changeTool("place")}
                    >
                      <Plus size={17} aria-hidden="true" /> Poser
                    </button>
                    <button
                      type="button"
                      aria-label="Modifier une pièce"
                      aria-pressed={interactionMode === "select"}
                      disabled={locked}
                      onClick={() => changeTool("select")}
                    >
                      <MousePointer2 size={17} aria-hidden="true" /> Modifier
                    </button>
                  </div>
                  <p>
                    {interactionMode === "place"
                      ? "Visez une surface pour empiler vos Brigos."
                      : "Choisissez une brique à déplacer ou à retirer."}
                  </p>
                </div>
                <SandboxWorld
                  resetKey={project.id}
                  disabled={locked}
                  placements={placements}
                  selectedId={selected?.id ?? null}
                  cursor={{ ...cursor, z: candidate?.z ?? 0 }}
                  candidate={candidate}
                  candidateValid={valid && !locked}
                  interactionMode={interactionMode}
                  stackAutomatically={automatic}
                  pickHeight={automatic ? 0 : (candidate?.z ?? 0)}
                  onCell={(x, y) => {
                    if (!locked) setCursor({ x, y });
                  }}
                  onSelect={(id) => {
                    if (locked || interactionMode !== "select") return;
                    const piece = placements.find((item) => item.id === id);
                    if (piece) selectPiece(piece);
                  }}
                  onPlace={() => void place()}
                  onCursorMove={(point) => {
                    if (!locked) setCursor({ x: point.x, y: point.y });
                  }}
                />
                <p className="sandbox-canvas-hint">
                  <MousePointer2 size={15} aria-hidden="true" />{" "}
                  {interactionMode === "place"
                    ? "Visez une surface, vérifiez l’aperçu, puis posez votre Brigo."
                    : "Sélectionnez une brique pour la déplacer ou la remettre en stock."}{" "}
                  <span className="sandbox-desktop-hint">
                    Glisser : tourner · Molette : zoomer · Maj + glisser :
                    déplacer la vue. Clavier : flèches pour viser, Entrée pour{" "}
                    {interactionMode === "place" ? "poser" : "confirmer"}.
                  </span>
                  <span className="sandbox-touch-hint">
                    Glissez pour tourner. Deux doigts pour zoomer ou déplacer la
                    vue.
                  </span>
                </p>
              </section>
              <section
                className="sandbox-tools"
                aria-labelledby="sandbox-tools-title"
              >
                <div className="sandbox-active-piece">
                  <div className="sandbox-active-art">
                    {activeBrigo ? (
                      <BrigoArt brigo={activeBrigo} />
                    ) : (
                      <Layers3 size={30} aria-hidden="true" />
                    )}
                  </div>
                  <div>
                    <span className="eyebrow">
                      {selected
                        ? "PIÈCE SÉLECTIONNÉE"
                        : waitingForSelection
                          ? "MODIFIER LA CRÉATION"
                          : "PROCHAINE PIÈCE"}
                    </span>
                    <h2 id="sandbox-tools-title">
                      {activeBrigo?.model.name ??
                        (waitingForSelection
                          ? "Sélectionnez une pièce"
                          : "Choisissez un Brigo")}
                    </h2>
                    <p>
                      {activeBrigo
                        ? `${activeBrigo.color.name} · ${available} en stock`
                        : waitingForSelection
                          ? "Touchez une brique déjà posée sur le terrain."
                          : "Les pièces de votre stock se trouvent dans la palette."}
                    </p>
                  </div>
                  {selected && (
                    <button
                      type="button"
                      className="sandbox-icon-button"
                      aria-label="Annuler la sélection"
                      onClick={() => {
                        setSelectedId(null);
                        setAutomatic(true);
                      }}
                    >
                      <X size={18} aria-hidden="true" />
                    </button>
                  )}
                </div>
                <div className="sandbox-placement-controls">
                  <label>
                    Colonne X
                    <input
                      type="number"
                      aria-label="Colonne X"
                      min={1}
                      max={SANDBOX_GRID_SIZE}
                      value={cursor.x + 1}
                      disabled={locked || waitingForSelection}
                      onChange={(event) => {
                        const value = Number(event.target.value);
                        if (
                          Number.isInteger(value) &&
                          value >= 1 &&
                          value <= SANDBOX_GRID_SIZE
                        )
                          setCursor((current) => ({
                            ...current,
                            x: value - 1,
                          }));
                      }}
                    />
                  </label>
                  <label>
                    Ligne Y
                    <input
                      type="number"
                      aria-label="Ligne Y"
                      min={1}
                      max={SANDBOX_GRID_SIZE}
                      value={cursor.y + 1}
                      disabled={locked || waitingForSelection}
                      onChange={(event) => {
                        const value = Number(event.target.value);
                        if (
                          Number.isInteger(value) &&
                          value >= 1 &&
                          value <= SANDBOX_GRID_SIZE
                        )
                          setCursor((current) => ({
                            ...current,
                            y: value - 1,
                          }));
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    className="sandbox-rotation"
                    disabled={locked || !activeBrigo}
                    onClick={() =>
                      setRotation((value) => ((value + 90) % 360) as Rotation)
                    }
                  >
                    <RotateCw size={17} aria-hidden="true" /> Pièce {rotation}°
                  </button>
                  <label>
                    Hauteur
                    <input
                      type="number"
                      aria-label="Hauteur du Brigo"
                      min={0}
                      max={SANDBOX_MAX_HEIGHT - 1}
                      value={candidate?.z ?? height}
                      disabled={locked || automatic}
                      onChange={(event) => {
                        const value = Number(event.target.value);
                        if (
                          Number.isInteger(value) &&
                          value >= 0 &&
                          value < SANDBOX_MAX_HEIGHT
                        )
                          setHeight(value);
                      }}
                    />
                  </label>
                </div>
                <label className="sandbox-auto-height">
                  <input
                    type="checkbox"
                    checked={automatic}
                    disabled={locked || waitingForSelection}
                    onChange={(event) => {
                      setAutomatic(event.target.checked);
                      if (!event.target.checked)
                        setHeight(candidate?.z ?? height);
                    }}
                  />
                  <span>
                    Empiler automatiquement
                    <small>
                      La pièce se pose sur le sol ou au-dessus des autres.
                    </small>
                  </span>
                </label>
                <div
                  className={`sandbox-placement-message${issue ? " has-issue" : ""}`}
                  role="status"
                >
                  {issue ??
                    (selected
                      ? "Position libre. Vous pouvez déplacer cette pièce."
                      : `Prêt à poser en X ${cursor.x + 1}, Y ${cursor.y + 1}, hauteur ${candidate?.z ?? 0}.`)}
                </div>
                <div className="sandbox-actions">
                  <button
                    type="button"
                    className="sandbox-primary"
                    disabled={locked || !valid}
                    onClick={() => void place()}
                  >
                    {selected ? (
                      <MousePointer2 size={18} aria-hidden="true" />
                    ) : (
                      <Plus size={19} aria-hidden="true" />
                    )}
                    {selected
                      ? "Déplacer le Brigo"
                      : waitingForSelection
                        ? "Choisir une pièce posée"
                        : "Poser le Brigo"}
                  </button>
                  {selected && (
                    <button
                      type="button"
                      className="sandbox-remove"
                      disabled={locked}
                      onClick={() => void remove()}
                    >
                      <Trash2 size={17} aria-hidden="true" /> Remettre en stock
                    </button>
                  )}
                </div>
              </section>
              <details className="sandbox-project-settings">
                <summary>Gérer le projet et les pièces posées</summary>
                <div className="sandbox-settings-content">
                  <div className="sandbox-rename">
                    <label>
                      Nom du projet
                      <input
                        maxLength={48}
                        value={currentName}
                        disabled={locked}
                        onChange={(event) =>
                          setDraftName({
                            id: project.id,
                            value: event.target.value,
                          })
                        }
                      />
                    </label>
                    <button
                      type="button"
                      className="sandbox-secondary"
                      disabled={
                        locked ||
                        !currentName.trim() ||
                        currentName.trim() === project.name
                      }
                      onClick={() =>
                        void act(
                          {
                            type: "rename-project",
                            projectId: project.id,
                            name: currentName,
                          },
                          "Projet renommé.",
                        )
                      }
                    >
                      Renommer
                    </button>
                  </div>
                  <label className="sandbox-piece-picker">
                    Pièce à modifier
                    <select
                      aria-label="Choisir une pièce posée"
                      value={selected?.id ?? ""}
                      disabled={locked || !placements.length}
                      onChange={(event) => {
                        const piece = placements.find(
                          (item) => item.id === event.target.value,
                        );
                        if (piece) selectPiece(piece);
                      }}
                    >
                      <option value="">
                        Choisir parmi {placements.length} Brigos posés
                      </option>
                      {placements.map((piece, index) => {
                        const brigo = BRIGO_BY_ID.get(piece.brigoId);
                        return (
                          <option key={piece.id} value={piece.id}>
                            {index + 1}. {brigo?.model.name} {brigo?.color.name}{" "}
                            · X{piece.x + 1} Y{piece.y + 1} H{piece.z}
                          </option>
                        );
                      })}
                    </select>
                  </label>
                  {deleting ? (
                    <div className="sandbox-delete-confirm">
                      <p>
                        Démonter « {project.name} » ? Ses {placements.length}{" "}
                        Brigos retourneront dans votre stock. Le projet sera
                        supprimé.
                      </p>
                      <button
                        type="button"
                        className="sandbox-remove"
                        disabled={locked}
                        onClick={() => void deleteProject()}
                      >
                        Démonter et supprimer
                      </button>
                      <button
                        type="button"
                        className="sandbox-secondary"
                        disabled={locked}
                        onClick={() => setDeleting(false)}
                      >
                        Garder le projet
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="sandbox-delete-link"
                      disabled={locked}
                      onClick={() => setDeleting(true)}
                    >
                      <Trash2 size={15} aria-hidden="true" /> Démonter ce projet
                    </button>
                  )}
                </div>
              </details>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
