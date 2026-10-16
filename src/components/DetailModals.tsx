import { memo, useMemo, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Hammer,
  Layers3,
  Plus,
  RotateCw,
  Shield,
  Target,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  BRIGO_BY_ID,
  CATALOG,
  COLORS,
  FAMILY_NAMES,
  RARITY_INFO,
} from "../game/catalog";
import type { Brigo, Recipe } from "../game/catalog";
import {
  matchesRequirement,
  recipeProgress,
  reservedBrigoCount,
} from "../game/engine";
import { BrigoArt, ConstructionArt } from "./BrigoArt";
import { Modal } from "./Modal";
import { RecyclePanel, RecipeOrder } from "./PieceEconomy";
import { recipeXp } from "../game/progression";
import type { AdminAction, Game } from "../screens/types";
import "./instructions.css";
import { ProductionYield } from "./ProductionYield";

export function BrigoDetail({
  brigo,
  game,
  adminEnabled,
  admin,
  onBrigo,
  onClose,
}: {
  brigo: Brigo;
  game: Game;
  adminEnabled: boolean;
  admin: AdminAction;
  onBrigo: (brigo: Brigo) => void;
  onClose: () => void;
}) {
  const available = game.state.inventory[brigo.id] ?? 0;
  const reserved = reservedBrigoCount(game.state, brigo.id);
  return (
    <Modal
      title={brigo.model.name}
      eyebrow={`BRIGO #${String(brigo.number).padStart(3, "0")}`}
      onClose={onClose}
    >
      <div className={`detail-art rarity-${brigo.rarity}`}>
        <span className="rarity-label">
          {RARITY_INFO[brigo.rarity].symbol} {RARITY_INFO[brigo.rarity].name}
        </span>
        <BrigoArt brigo={brigo} />
      </div>
      <div className="detail-info">
        <div className="detail-color-name">
          <i style={{ background: brigo.color.hex }} />
          <h3>{brigo.color.name}</h3>
          {game.state.discovered.includes(brigo.id) && (
            <span>
              <Check size={12} />
              Découvert
            </span>
          )}
        </div>
        <dl className="piece-specs">
          <div>
            <dt>Famille</dt>
            <dd>{FAMILY_NAMES[brigo.model.family]}</dd>
          </div>
          <div>
            <dt>Dimensions</dt>
            <dd>
              {brigo.model.width} × {brigo.model.depth} unités
            </dd>
          </div>
          <div>
            <dt>Hauteur</dt>
            <dd>
              {brigo.model.height} unité{brigo.model.height > 1 ? "s" : ""}
            </dd>
          </div>
        </dl>
        <div className="stock-overview">
          <span>
            <strong>{available}</strong> disponible{available > 1 ? "s" : ""}
          </span>
          <span>
            <strong>{reserved}</strong> dans vos créations
          </span>
        </div>
        <p className="form-help">
          {brigo.model.archived &&
            "Pièce d’archive : conservée dans votre album, elle n’est plus distribuée dans les boîtes. "}
          Une unité de hauteur correspond à une plaque fine. La rareté est liée
          à cette forme, identique dans toutes ses couleurs.
          {brigo.model.shape === "cone" &&
            (brigo.model.studs
              ? " Cette pièce archivée possède des raccords Brigo facettés sur son sommet. Ses flancs restent lisses."
              : " Sa pointe est lisse : aucune pièce ne s’attache au-dessus.")}
        </p>
        <div className="detail-variants">
          <span>Les {COLORS.length} couleurs</span>
          <div>
            {COLORS.map((color) => {
              const variant = BRIGO_BY_ID.get(`${brigo.model.id}:${color.id}`)!;
              return (
                <button
                  type="button"
                  className={`color-swatch ${color.id === brigo.color.id ? "active" : ""}`}
                  key={color.id}
                  aria-label={`Voir la variante ${color.name}`}
                  aria-pressed={color.id === brigo.color.id}
                  title={color.name}
                  style={{ "--swatch": color.hex } as React.CSSProperties}
                  onClick={() => onBrigo(variant)}
                />
              );
            })}
          </div>
        </div>
      </div>
      <RecyclePanel key={brigo.id} brigo={brigo} game={game} />
      {adminEnabled && (
        <div className="modal-actions">
          <span className="admin-inline-label">
            <Shield size={13} />
            Admin local
          </span>
          <button
            type="button"
            className="button button-secondary"
            disabled={game.busy || !game.ready}
            onClick={() =>
              void admin(
                { type: "piece", brigoId: brigo.id, amount: 1 },
                "Un Brigo ajouté à votre inventaire.",
              )
            }
          >
            <Plus size={16} />
            Ajouter un exemplaire
          </button>
        </div>
      )}
    </Modal>
  );
}
// Keep instruction state local: moving through thousands of placements must not
// redraw the piece catalogue or calculate the stock/order quote again.
const RecipeAssemblyPreview = memo(function RecipeAssemblyPreview({
  recipe,
  total,
  pieces,
}: {
  recipe: Recipe;
  total: number;
  pieces?: Record<string, number>;
}) {
  const [step, setStep] = useState(recipe.placements.length);
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(0);
  const [zoom, setZoom] = useState(1);
  const [instructions, setInstructions] = useState(false);
  const monumental = recipe.placements.length > 180;
  const zoomable = recipe.placements.length > 80;
  const lotSize = 150;
  const lots = Math.ceil(recipe.placements.length / lotSize);
  const currentPlacement = step > 0 ? recipe.placements[step - 1] : undefined;
  const currentPart = currentPlacement
    ? BRIGO_BY_ID.get(
        `${currentPlacement.modelId}:${currentPlacement.colorId ?? "coral"}`,
      )!
    : undefined;
  return (
    <div className="recipe-detail-art" style={{ background: recipe.color }}>
      {zoomable ? (
        <div
          className="assembly-monument-viewport"
          tabIndex={0}
          aria-label="Aperçu de la construction, défilement possible après agrandissement"
        >
          <div
            className="assembly-monument-canvas"
            style={{ width: `${zoom * 100}%`, height: `${zoom * 260}px` }}
          >
            <ConstructionArt
              recipeId={recipe.id}
              pieces={pieces}
              quality={
                !instructions || recipe.placements.length > 80
                  ? "preview"
                  : "detail"
              }
              step={instructions ? step : undefined}
              rotation={rotation}
            />
          </div>
        </div>
      ) : (
        <ConstructionArt
          recipeId={recipe.id}
          pieces={pieces}
          quality={
            !instructions || recipe.placements.length > 80
              ? "preview"
              : "detail"
          }
          step={instructions ? step : undefined}
          rotation={rotation}
        />
      )}
      {zoomable && (
        <div className="assembly-zoom-controls">
          <button
            type="button"
            className="icon-button"
            aria-label="Réduire la vue"
            disabled={zoom === 1}
            onClick={() => setZoom((value) => value - 1)}
          >
            <ZoomOut size={18} />
          </button>
          <span>Vue ×{zoom}</span>
          <button
            type="button"
            className="icon-button"
            aria-label="Agrandir la vue"
            disabled={zoom === 4}
            onClick={() => setZoom((value) => value + 1)}
          >
            <ZoomIn size={18} />
          </button>
        </div>
      )}
      <div className="assembly-view-controls">
        <button
          type="button"
          className="button button-secondary"
          onClick={() => {
            setInstructions((value) => !value);
            setStep(instructions ? recipe.placements.length : 0);
          }}
        >
          <Layers3 size={16} />
          {instructions ? "Voir l’ensemble" : "Voir les étapes"}
        </button>
        <button
          type="button"
          className="icon-button"
          aria-label="Tourner la construction de 90 degrés"
          onClick={() =>
            setRotation((value) => ((value + 90) % 360) as typeof rotation)
          }
        >
          <RotateCw size={18} />
        </button>
      </div>
      {instructions && monumental && (
        <label className="assembly-lot-select">
          Parcourir les lots de montage
          <select
            aria-label="Lot de montage"
            value={step === 0 ? 0 : Math.ceil(step / lotSize)}
            onChange={(event) => {
              setInstructions(true);
              setStep(
                Math.min(
                  recipe.placements.length,
                  Number(event.target.value) * lotSize,
                ),
              );
            }}
          >
            <option value={0}>Avant le montage</option>
            {Array.from({ length: lots }, (_, index) => (
              <option key={index} value={index + 1}>
                Lot {index + 1} · pièces {index * lotSize + 1}–
                {Math.min(recipe.placements.length, (index + 1) * lotSize)}
              </option>
            ))}
          </select>
        </label>
      )}
      {instructions && (
        <div className="assembly-step-controls">
          <button
            type="button"
            className="icon-button"
            aria-label="Pièce précédente"
            disabled={step === 0}
            onClick={() => {
              setInstructions(true);
              setStep((value) => Math.max(0, value - 1));
            }}
          >
            <ChevronLeft size={20} />
          </button>
          <label>
            <span>
              Montage · {step.toLocaleString("fr-FR")} /{" "}
              {recipe.placements.length.toLocaleString("fr-FR")} pièces
            </span>
            <input
              type="range"
              min={0}
              max={recipe.placements.length}
              value={step}
              aria-label="Étape de montage"
              onChange={(event) => {
                setInstructions(true);
                setStep(Number(event.target.value));
              }}
            />
          </label>
          <button
            type="button"
            className="icon-button"
            aria-label="Pièce suivante"
            disabled={step === recipe.placements.length}
            onClick={() => {
              setInstructions(true);
              setStep((value) => Math.min(recipe.placements.length, value + 1));
            }}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}
      <p className="assembly-current-part" aria-live="polite">
        {!instructions
          ? "Vue d’ensemble · découvrez la création et son décor."
          : currentPart
            ? `${step}. ${currentPart.model.name}${currentPlacement?.colorId ? ` · ${currentPart.color.name}` : " · couleur libre"}${currentPlacement?.rotation ? ` · tournée de ${currentPlacement.rotation}°` : ""}`
            : "Commencez par la première pièce au sol."}
      </p>
      <p>{recipe.description}</p>
      <span>
        <Layers3 size={16} />
        {total.toLocaleString("fr-FR")} Brigos à assembler
      </span>
      <span className="recipe-xp-explanation">
        +{recipeXp(recipe).toLocaleString("fr-FR")} XP tant que cette création
        est exposée
      </span>
    </div>
  );
});

export function RecipeDetail({
  recipe,
  game,
  adminEnabled,
  admin,
  onClose,
  onBuilt,
}: {
  recipe: Recipe;
  game: Game;
  adminEnabled: boolean;
  admin: AdminAction;
  onClose: () => void;
  onBuilt?: () => void;
}) {
  // Navigating an instruction changes only the preview below. Inventory
  // allocation is independent of step, rotation, zoom, and unrelated rewards.
  const progress = useMemo(
    () => recipeProgress(game.state, recipe),
    [game.state.inventory, recipe],
  );
  const builtCount = useMemo(
    () =>
      game.state.constructions.filter(
        (construction) => construction.recipeId === recipe.id,
      ).length,
    [game.state.constructions, recipe.id],
  );
  const followed = game.state.goalRecipeId === recipe.id;
  return (
    <Modal
      title={recipe.name}
      eyebrow={`PLAN · ${recipe.difficulty.toUpperCase()}`}
      onClose={onClose}
      wide
      className="recipe-dialog"
    >
      <section
        className="recipe-next-action"
        aria-label="Prochaine étape du plan"
      >
        <div className="recipe-readiness">
          <span>
            <Layers3 size={17} aria-hidden="true" />{" "}
            {progress.available.toLocaleString("fr-FR")} /{" "}
            {progress.total.toLocaleString("fr-FR")} Brigos disponibles
          </span>
          <strong>
            {progress.canBuild
              ? "Tout est prêt pour construire."
              : `${(progress.total - progress.available).toLocaleString("fr-FR")} Brigos à réunir.`}
          </strong>
        </div>
        {progress.canBuild ? (
          <button
            type="button"
            className="button button-primary"
            disabled={game.busy || !game.ready}
            onClick={() =>
              void game
                .act(
                  { type: "build-recipe", recipeId: recipe.id },
                  `Création assemblée : ${recipe.name}. +${recipeXp(recipe)} XP dans votre galerie !`,
                )
                .then((success) => {
                  if (success) (onBuilt ?? onClose)();
                })
            }
          >
            <Hammer size={17} aria-hidden="true" />
            {builtCount > 0
              ? "Assembler un autre exemplaire"
              : "Assembler ma création"}
          </button>
        ) : (
          <RecipeOrder recipe={recipe} game={game} onNavigate={onClose} />
        )}
      </section>
      <div className="recipe-detail-layout">
        <RecipeAssemblyPreview
          key={recipe.id}
          recipe={recipe}
          total={progress.total}
          pieces={progress.canBuild ? progress.pieces : undefined}
        />
        <div className="recipe-requirements">
          <ProductionYield recipe={recipe} />
          {builtCount > 0 && (
            <p className="recipe-built-note">
              <strong>
                Déjà dans votre galerie : {builtCount} exemplaire
                {builtCount > 1 ? "s" : ""}.
              </strong>
              Les pièces ci-dessous servent à en assembler un autre.
            </p>
          )}
          <details className="recipe-parts-details">
            <summary>
              <span>Voir les pièces du plan</span>
              <strong>
                {progress.available.toLocaleString("fr-FR")} /{" "}
                {progress.total.toLocaleString("fr-FR")}
              </strong>
            </summary>
            {progress.requirements.map((requirement, index) => {
              const preview = CATALOG.find((brigo) =>
                matchesRequirement(brigo, requirement),
              )!;
              return (
                <div
                  className={`requirement-row ${requirement.missing === 0 ? "complete" : ""}`}
                  key={index}
                >
                  <span className="requirement-art">
                    <BrigoArt brigo={preview} />
                  </span>
                  <div>
                    <strong>{requirement.label}</strong>
                    <span>
                      {requirement.missing === 0
                        ? "Toutes les pièces sont là"
                        : `Encore ${requirement.missing} à trouver`}
                    </span>
                  </div>
                  <span className="requirement-amount">
                    {requirement.missing === 0 && <Check size={13} />}{" "}
                    {requirement.available}/{requirement.quantity}
                  </span>
                </div>
              );
            })}
            <p className="form-help">
              {recipe.requirements.some((item) => !item.colorId)
                ? "Couleurs libres : vos pièces les plus communes sont utilisées en priorité."
                : "Ce plan utilise les couleurs indiquées."}
            </p>
          </details>
          <button
            type="button"
            className="button button-secondary"
            aria-pressed={followed}
            disabled={game.busy || !game.ready}
            onClick={() =>
              void game.act(
                {
                  type: "follow-recipe",
                  recipeId: followed ? null : recipe.id,
                },
                followed
                  ? "Objectif retiré."
                  : `${recipe.name} devient votre objectif de collection.`,
              )
            }
          >
            <Target size={16} />
            {followed ? "Mon objectif · retirer" : "Suivre ce plan"}
          </button>
          {adminEnabled && !progress.canBuild && (
            <button
              type="button"
              className="button button-admin"
              disabled={game.busy || !game.ready}
              onClick={() =>
                void admin(
                  { type: "recipe", recipeId: recipe.id },
                  "Les pièces manquantes ont été ajoutées.",
                )
              }
            >
              <Shield size={15} />
              Compléter les pièces · admin
            </button>
          )}
        </div>
      </div>
      <div className="recipe-return-note">
        <span>
          <Layers3 size={15} />
          Démontage : pièces récupérées et −{recipeXp(recipe)} XP.
        </span>
      </div>
    </Modal>
  );
}
