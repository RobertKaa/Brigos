import { useEffect, useRef, useState } from "react";
import {
  Coins,
  Download,
  FlaskConical,
  Hammer,
  Layers3,
  Package,
  Plus,
  RotateCcw,
  Shield,
  SlidersHorizontal,
  Trash2,
  Upload,
} from "lucide-react";
import {
  BOXES,
  BOX_IDS,
  BOX_DROP_COUNT,
  CATALOG,
  RARITIES,
  RARITY_INFO,
  RECIPES,
} from "../game/catalog";
import type { BoxId, Rarity, Weights } from "../game/catalog";
import { GameError, inventoryCount, validateWeights } from "../game/engine";
import type { GameState } from "../game/engine";
import { importSave, SAVE_IMPORT_MAX_BYTES } from "../game/save";
import { matchesSearch } from "../game/search";
import { Modal } from "../components/Modal";
import type { AdminAction, Game } from "./types";

function downloadSave(state: GameState) {
  const blob = new Blob([JSON.stringify(state, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `brigo-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function AdminPanel({
  game,
  admin,
  forcedRarity,
  onForcedRarity,
  onClose,
}: {
  game: Game;
  admin: AdminAction;
  forcedRarity: Rarity | "";
  onForcedRarity: (rarity: Rarity | "") => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"resources" | "draws" | "save">("resources");
  const [coins, setCoins] = useState("1000");
  const [boxes, setBoxes] = useState("10");
  const [boxId, setBoxId] = useState<BoxId>("discovery");
  const [pieceQuery, setPieceQuery] = useState("");
  const [pieceId, setPieceId] = useState(CATALOG[0].id);
  const [pieceAmount, setPieceAmount] = useState("1");
  const [catalogAmount, setCatalogAmount] = useState("3");
  const [recipeId, setRecipeId] = useState(RECIPES[0].id);
  const [oddsBox, setOddsBox] = useState<BoxId>("discovery");
  const [weights, setWeights] = useState<Record<Rarity, string>>(
    () =>
      Object.fromEntries(
        RARITIES.map((rarity) => [
          rarity,
          String(game.state.rates.discovery[rarity]),
        ]),
      ) as Record<Rarity, string>,
  );
  const [confirmation, setConfirmation] = useState<"reset" | "import" | null>(
    null,
  );
  const [resetText, setResetText] = useState("");
  const [pendingImport, setPendingImport] = useState<GameState | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setWeights(
      Object.fromEntries(
        RARITIES.map((rarity) => [
          rarity,
          String(game.state.rates[oddsBox][rarity]),
        ]),
      ) as Record<Rarity, string>,
    );
  }, [oddsBox, game.state.rates]);
  const parsedWeights = Object.fromEntries(
    RARITIES.map((rarity) => [rarity, Number(weights[rarity])]),
  ) as Weights;
  const total = RARITIES.reduce(
    (sum, rarity) => sum + parsedWeights[rarity],
    0,
  );
  const valid = validateWeights(parsedWeights);
  const filteredPieces = CATALOG.filter((brigo) =>
    matchesSearch(brigo, pieceQuery),
  );
  const disabled = game.busy || !game.ready;
  return (
    <Modal
      title="Les commandes du créateur."
      eyebrow="ADMINISTRATION · MODE TEST LOCAL"
      onClose={onClose}
      wide
      className="admin-modal"
    >
      <div className="admin-scope">
        <Shield size={20} />
        <p>
          Ces outils modifient votre partie sur cet appareil. Ils sont activés
          pour le développement ; aucun compte administrateur n’est encore
          connecté.
        </p>
      </div>
      <div className="admin-stats">
        <span>
          <Coins size={16} />
          <strong>{game.state.coins.toLocaleString("fr-FR")}</strong> pièces
        </span>
        <span>
          <Layers3 size={16} />
          <strong>{inventoryCount(game.state)}</strong> Brigos disponibles
        </span>
        <span>
          <FlaskConical size={16} />
          <strong>{game.state.boxesOpened}</strong> boîtes ouvertes
        </span>
      </div>
      <div className="view-tabs admin-tabs">
        {[
          ["resources", "Ressources"],
          ["draws", "Tirages"],
          ["save", "Sauvegarde"],
        ].map(([id, label]) => (
          <button
            type="button"
            key={id}
            className={tab === id ? "active" : ""}
            aria-pressed={tab === id}
            onClick={() => setTab(id as typeof tab)}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "resources" && (
        <div className="admin-grid">
          <form
            className="admin-card"
            onSubmit={(event) => {
              event.preventDefault();
              void admin(
                { type: "coins", amount: Number(coins) },
                `${Number(coins).toLocaleString("fr-FR")} pièces ajoutées.`,
              );
            }}
          >
            <h3>
              <Coins size={18} />
              La réserve de pièces
            </h3>
            <p>De quoi ouvrir toutes les boîtes que vous voulez tester.</p>
            <label>
              Pièces à ajouter
              <input
                type="number"
                min="1"
                max="100000"
                step="1"
                required
                value={coins}
                onChange={(event) => setCoins(event.target.value)}
              />
            </label>
            <button
              type="submit"
              className="button button-secondary"
              disabled={disabled}
            >
              <Plus size={16} />
              Ajouter des pièces
            </button>
          </form>
          <form
            className="admin-card"
            onSubmit={(event) => {
              event.preventDefault();
              void admin(
                { type: "boxes", boxId, amount: Number(boxes) },
                `${boxes} boîtes ${BOXES[boxId].name} ajoutées.`,
              );
            }}
          >
            <h3>
              <Package size={18} />
              Des boîtes en réserve
            </h3>
            <p>Les boîtes offertes sont utilisées avant vos pièces.</p>
            <div className="form-row">
              <label>
                Type de boîte
                <select
                  value={boxId}
                  onChange={(event) => setBoxId(event.target.value as BoxId)}
                >
                  {BOX_IDS.map((id) => (
                    <option value={id} key={id}>
                      {BOXES[id].name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Quantité
                <input
                  type="number"
                  min="1"
                  max="100000"
                  step="1"
                  required
                  value={boxes}
                  onChange={(event) => setBoxes(event.target.value)}
                />
              </label>
            </div>
            <button
              type="submit"
              className="button button-secondary"
              disabled={disabled}
            >
              <Plus size={16} />
              Ajouter des boîtes
            </button>
          </form>
          <form
            className="admin-card admin-card-full"
            onSubmit={(event) => {
              event.preventDefault();
              void admin(
                {
                  type: "piece",
                  brigoId: pieceId,
                  amount: Number(pieceAmount),
                },
                "Les Brigos ont été ajoutés à votre inventaire.",
              );
            }}
          >
            <h3>
              <Layers3 size={18} />
              Un Brigo en particulier
            </h3>
            <p>
              Pour tester une variante ou compléter une construction précise.
            </p>
            <div className="form-row piece-admin-row">
              <label>
                Rechercher un Brigo
                <input
                  type="search"
                  placeholder="Ex. Brique, Menthe…"
                  maxLength={100}
                  value={pieceQuery}
                  onChange={(event) => {
                    setPieceQuery(event.target.value);
                    setPieceId(
                      CATALOG.find((brigo) =>
                        matchesSearch(brigo, event.target.value),
                      )?.id ?? "",
                    );
                  }}
                />
              </label>
              <label>
                Brigo ciblé
                <select
                  value={pieceId}
                  onChange={(event) => setPieceId(event.target.value)}
                >
                  {filteredPieces.length ? (
                    filteredPieces.map((brigo) => (
                      <option value={brigo.id} key={brigo.id}>
                        #{String(brigo.number).padStart(3, "0")} · {brigo.name}
                      </option>
                    ))
                  ) : (
                    <option value="">Aucun résultat</option>
                  )}
                </select>
              </label>
              <label>
                Exemplaires
                <input
                  type="number"
                  min="1"
                  max="100000"
                  step="1"
                  required
                  value={pieceAmount}
                  onChange={(event) => setPieceAmount(event.target.value)}
                />
              </label>
            </div>
            <button
              type="submit"
              className="button button-secondary"
              disabled={disabled || !pieceId}
            >
              <Plus size={16} />
              Ajouter ce Brigo
            </button>
          </form>
          <form
            className="admin-card"
            onSubmit={(event) => {
              event.preventDefault();
              void admin(
                { type: "catalog", amount: Number(catalogAmount) },
                `Catalogue ajouté : ${CATALOG.length * Number(catalogAmount)} Brigos disponibles en plus.`,
              );
            }}
          >
            <h3>
              <FlaskConical size={18} />
              Tout le catalogue
            </h3>
            <p>
              Ajoutez les {CATALOG.length} variantes pour explorer la collection
              et l’atelier.
            </p>
            <label>
              Exemplaires par variante
              <input
                type="number"
                min="1"
                max="100"
                step="1"
                required
                value={catalogAmount}
                onChange={(event) => setCatalogAmount(event.target.value)}
              />
            </label>
            <button
              type="submit"
              className="button button-primary"
              disabled={disabled}
            >
              <Plus size={16} />
              Ajouter tout le catalogue
            </button>
          </form>
          <form
            className="admin-card"
            onSubmit={(event) => {
              event.preventDefault();
              void admin(
                { type: "recipe", recipeId },
                "Les pièces manquantes du plan ont été ajoutées.",
              );
            }}
          >
            <h3>
              <Hammer size={18} />
              Un plan prêt à tester
            </h3>
            <p>Ajoutez uniquement les pièces qui vous manquent encore.</p>
            <label>
              Plan à compléter
              <select
                value={recipeId}
                onChange={(event) => setRecipeId(event.target.value)}
              >
                {RECIPES.map((recipe) => (
                  <option value={recipe.id} key={recipe.id}>
                    {recipe.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="button button-secondary"
              disabled={disabled}
            >
              <Plus size={16} />
              Compléter ce plan
            </button>
          </form>
        </div>
      )}
      {tab === "draws" && (
        <div className="admin-draws">
          <section className="admin-card">
            <h3>
              <SparkleIcon />
              La prochaine ouverture
            </h3>
            <p>
              Forcez la rareté des {BOX_DROP_COUNT} Brigos de la prochaine
              boîte. L’ouverture utilise normalement une boîte ou des pièces ;
              le réglage revient ensuite à « Tirage normal ».
            </p>
            <label>
              Rareté à forcer
              <select
                value={forcedRarity}
                onChange={(event) =>
                  onForcedRarity(event.target.value as Rarity | "")
                }
              >
                <option value="">Tirage normal</option>
                {RARITIES.map((rarity) => (
                  <option value={rarity} key={rarity}>
                    {RARITY_INFO[rarity].name} · {BOX_DROP_COUNT} Brigos
                  </option>
                ))}
              </select>
            </label>
            {forcedRarity && (
              <div className="forced-notice">
                <FlaskConical size={15} />
                Prochaine boîte : {BOX_DROP_COUNT} Brigos{" "}
                {RARITY_INFO[forcedRarity].name.toLowerCase()}s.
              </div>
            )}
          </section>
          <form
            className="admin-card"
            onSubmit={(event) => {
              event.preventDefault();
              void admin(
                { type: "rates", boxId: oddsBox, weights: parsedWeights },
                `Probabilités de la boîte ${BOXES[oddsBox].name} enregistrées.`,
              );
            }}
          >
            <h3>
              <SlidersHorizontal size={18} />
              Probabilités par boîte
            </h3>
            <p>
              Chaque pourcentage s’applique à un Brigo. Le total doit être égal
              à 100 %.
            </p>
            <label>
              Boîte à régler
              <select
                value={oddsBox}
                onChange={(event) => setOddsBox(event.target.value as BoxId)}
              >
                {BOX_IDS.map((id) => (
                  <option value={id} key={id}>
                    {BOXES[id].name}
                  </option>
                ))}
              </select>
            </label>
            <div className="rate-inputs">
              {RARITIES.map((rarity) => (
                <label key={rarity} className={`rarity-${rarity}`}>
                  <span className="rarity-label">
                    {RARITY_INFO[rarity].symbol} {RARITY_INFO[rarity].name}
                  </span>
                  <span>
                    <input
                      aria-label={`Probabilité ${RARITY_INFO[rarity].name}`}
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      required
                      value={weights[rarity]}
                      onChange={(event) =>
                        setWeights((previous) => ({
                          ...previous,
                          [rarity]: event.target.value,
                        }))
                      }
                    />
                    %
                  </span>
                </label>
              ))}
            </div>
            <div
              className={`rates-total ${valid ? "valid" : "invalid"}`}
              role="status"
            >
              Total : {Number.isFinite(total) ? Number(total.toFixed(4)) : "—"}{" "}
              %{!valid && " · Ajustez les valeurs pour atteindre 100 %."}
            </div>
            <div className="action-group">
              <button
                type="submit"
                className="button button-primary"
                disabled={disabled || !valid}
              >
                Enregistrer les probabilités
              </button>
              <button
                type="button"
                className="button button-secondary"
                disabled={disabled}
                onClick={() =>
                  void admin(
                    { type: "reset-rates" },
                    "Les probabilités des trois boîtes ont été rétablies.",
                  )
                }
              >
                <RotateCcw size={15} />
                Rétablir les trois boîtes
              </button>
            </div>
          </form>
          <section className="admin-card">
            <h3>
              <Package size={18} />
              Les dernières ouvertures
            </h3>
            {game.state.history.length ? (
              <div className="history-list">
                {game.state.history.slice(0, 8).map((opening) => (
                  <div key={opening.id}>
                    <span>
                      <strong>{BOXES[opening.boxId].name}</strong>
                      {opening.testRarity && (
                        <small className="history-test">
                          Test · {RARITY_INFO[opening.testRarity].name}
                        </small>
                      )}
                      <small>
                        {new Intl.DateTimeFormat("fr-FR", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        }).format(new Date(opening.createdAt))}
                      </small>
                    </span>
                    <span>
                      {opening.drops.filter((drop) => drop.isNew).length}{" "}
                      découverte(s) · {opening.drops.length} Brigos
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p>Aucune boîte ouverte pour le moment.</p>
            )}
          </section>
        </div>
      )}
      {tab === "save" && (
        <div className="admin-save">
          <section className="admin-card">
            <h3>
              <Download size={18} />
              Votre partie, de côté
            </h3>
            <p>
              Exportez votre progression avant un test ou importez une
              sauvegarde Brigo. L’import remplacera la partie sur cet appareil
              après confirmation.
            </p>
            <div className="action-group">
              <button
                type="button"
                className="button button-primary"
                disabled={disabled}
                onClick={() => {
                  downloadSave(game.state);
                  game.notify("Votre sauvegarde a été exportée.");
                }}
              >
                <Download size={16} />
                Exporter ma partie
              </button>
              <button
                type="button"
                className="button button-secondary"
                disabled={disabled}
                onClick={() => fileInput.current?.click()}
              >
                <Upload size={16} />
                Importer une partie
              </button>
            </div>
            <input
              className="visually-hidden"
              ref={fileInput}
              type="file"
              accept=".json,application/json"
              aria-label="Fichier de sauvegarde"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                void (async () => {
                  try {
                    if (file.size > SAVE_IMPORT_MAX_BYTES)
                      throw new GameError("La sauvegarde dépasse 3 Mo.");
                    const parsed = importSave(await file.text());
                    setPendingImport(parsed);
                    setConfirmation("import");
                  } catch (error) {
                    game.notify(
                      error instanceof GameError
                        ? error.message
                        : "Impossible de lire cette sauvegarde.",
                      "error",
                    );
                  }
                })();
              }}
            />
            <p className="form-help">
              Fichier JSON · 3 Mo maximum. Les quantités, les Brigos, les plans
              et les probabilités sont vérifiés avant l’import.
            </p>
          </section>
          <section className="admin-card reset-card">
            <h3>
              <Trash2 size={18} />
              Repartir de zéro
            </h3>
            <p>
              Efface la progression de cette partie et rétablit le départ : 1
              200 pièces, 3 boîtes Découverte et un album vide.
            </p>
            <button
              type="button"
              className="button button-danger"
              disabled={disabled}
              onClick={() => {
                setResetText("");
                setConfirmation("reset");
              }}
            >
              Réinitialiser la partie
            </button>
          </section>
        </div>
      )}
      {confirmation && (
        <Modal
          title={
            confirmation === "reset"
              ? "Repartir de zéro ?"
              : "Remplacer votre partie ?"
          }
          eyebrow="CONFIRMATION"
          onClose={() => {
            setConfirmation(null);
            setPendingImport(null);
          }}
        >
          <div className="confirmation-content">
            <p>
              {confirmation === "reset"
                ? "La collection, les constructions et l’historique de cette partie seront effacés. Exportez votre sauvegarde pour pouvoir les retrouver."
                : "Votre progression actuelle sera remplacée par la sauvegarde sélectionnée. Exportez-la d’abord si vous souhaitez la conserver."}
            </p>
            {confirmation === "reset" ? (
              <label>
                Écrivez EFFACER pour confirmer
                <input
                  value={resetText}
                  onChange={(event) => setResetText(event.target.value)}
                  autoComplete="off"
                  placeholder="EFFACER"
                />
              </label>
            ) : (
              pendingImport && (
                <div className="import-preview">
                  <strong>
                    {pendingImport.discovered.length} Brigos découverts
                  </strong>
                  <span>
                    {pendingImport.coins} pièces ·{" "}
                    {pendingImport.constructions.length} créations
                  </span>
                  <p>
                    Les anciens plans corrigés ou retirés sont démontés à
                    l’import : leurs Brigos exacts retournent dans l’inventaire,
                    et leur XP est retirée.
                  </p>
                </div>
              )
            )}
          </div>
          <div className="modal-actions">
            <button
              type="button"
              className="button button-secondary"
              onClick={() => {
                setConfirmation(null);
                setPendingImport(null);
              }}
            >
              Annuler
            </button>
            <button
              type="button"
              className={`button ${confirmation === "reset" ? "button-danger" : "button-primary"}`}
              disabled={
                disabled ||
                (confirmation === "reset" && resetText !== "EFFACER")
              }
              onClick={() => {
                if (confirmation === "reset")
                  void admin(
                    { type: "reset" },
                    "Nouvelle partie : vos premières boîtes vous attendent.",
                  ).then((success) => {
                    if (success) {
                      setConfirmation(null);
                      onForcedRarity("");
                      onClose();
                    }
                  });
                else if (pendingImport)
                  void game
                    .localAct?.(
                      () => pendingImport,
                      "Votre sauvegarde a été importée.",
                      { observeEngagement: false },
                    )
                    .then((success) => {
                      if (success) {
                        setConfirmation(null);
                        setPendingImport(null);
                        onForcedRarity("");
                        onClose();
                      }
                    });
              }}
            >
              {confirmation === "reset"
                ? "Effacer et recommencer"
                : "Remplacer ma partie"}
            </button>
          </div>
        </Modal>
      )}
    </Modal>
  );
}
function SparkleIcon() {
  return <FlaskConical size={18} />;
}
