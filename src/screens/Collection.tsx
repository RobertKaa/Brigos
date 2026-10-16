import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Layers3,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import {
  COLORS,
  FAMILY_NAMES,
  RARITIES,
  RARITY_INFO,
  BOX_DROP_COUNT,
  albumCatalog,
} from "../game/catalog";
import type { Brigo, ColorId, Family, Rarity } from "../game/catalog";
import { inventoryCount, reservedCount } from "../game/engine";
import { matchesSearch } from "../game/search";
import { BrigoCard } from "../components/BrigoCard";
import { collectionSummary, sortCollection } from "./collectionView";
import type { CollectionSort, CollectionStatus } from "./collectionView";
import type { Game } from "./types";
import "./collection.css";

const format = (value: number) => value.toLocaleString("fr-FR");

export function Collection({
  game,
  onBrigo,
}: {
  game: Game;
  onBrigo: (brigo: Brigo) => void;
}) {
  const { state } = game;
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState<Family | "">("");
  const [rarity, setRarity] = useState<Rarity | "">("");
  const [color, setColor] = useState<ColorId | "">("");
  const [status, setStatus] = useState<CollectionStatus>("owned");
  const [sort, setSort] = useState<CollectionSort>("number");
  const [page, setPage] = useState(1);
  const reserved = useMemo(() => {
    const result: Record<string, number> = {};
    state.constructions.forEach((construction) =>
      Object.entries(construction.pieces).forEach(([id, count]) => {
        result[id] = (result[id] ?? 0) + count;
      }),
    );
    for (const project of state.sandboxProjects ?? []) {
      for (const placement of project.placements)
        result[placement.brigoId] = (result[placement.brigoId] ?? 0) + 1;
    }
    return result;
  }, [state.constructions, state.sandboxProjects]);
  const album = useMemo(
    () => albumCatalog(state.discovered),
    [state.discovered],
  );
  const discovered = useMemo(
    () => new Set(state.discovered),
    [state.discovered],
  );
  const summary = useMemo(
    () => collectionSummary(album, state.inventory, reserved, state.discovered),
    [album, state.inventory, reserved, state.discovered],
  );
  const filtered = useMemo(
    () =>
      sortCollection(
        album.filter((brigo) => {
          const owned =
            (state.inventory[brigo.id] ?? 0) + (reserved[brigo.id] ?? 0);
          return (
            matchesSearch(brigo, query) &&
            (!family || brigo.model.family === family) &&
            (!rarity || brigo.rarity === rarity) &&
            (!color || brigo.color.id === color) &&
            (status === "all" ||
              (status === "owned" && owned > 0) ||
              (status === "missing" && !discovered.has(brigo.id)) ||
              (status === "duplicates" && owned > 1))
          );
        }),
        sort,
        state.inventory,
        reserved,
      ),
    [
      query,
      family,
      rarity,
      color,
      status,
      sort,
      state.inventory,
      discovered,
      reserved,
      album,
    ],
  );
  const pageSize = 24;
  const maxPage = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, maxPage);
  const items = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const advancedCount = Number(!!family) + Number(!!rarity) + Number(!!color);
  const hasFilters = !!(
    query ||
    family ||
    rarity ||
    color ||
    status !== "owned"
  );
  const needsFirstBrigos =
    status === "owned" && summary.owned === 0 && !query && !advancedCount;
  const selectedColor = COLORS.find((item) => item.id === color);
  const clear = () => {
    setQuery("");
    setFamily("");
    setRarity("");
    setColor("");
    setStatus("owned");
    setPage(1);
  };

  return (
    <div className="collection-studio">
      <div className="page-intro">
        <div>
          <span className="eyebrow">
            <i /> L’ALBUM
          </span>
          <h1>Votre collection.</h1>
          <p>Retrouvez vos pièces et celles de vos créations.</p>
        </div>
        <a href="#boxes" className="text-link collection-get-pieces">
          Obtenir des Brigos <ChevronRight size={17} aria-hidden="true" />
        </a>
      </div>
      <details className="collection-overview">
        <summary>
          <span>Album et stock</span>
          <strong>
            {format(summary.discovered)} / {format(album.length)} découvertes
          </strong>
          <ChevronRight size={17} aria-hidden="true" />
        </summary>
        <section
          className="collection-summary"
          aria-label="Résumé de la collection"
        >
          <div className="collection-summary-album">
            <span>Références découvertes</span>
            <strong>
              {format(summary.discovered)}{" "}
              <small>/ {format(album.length)}</small>
            </strong>
            <div
              className="collection-album-track"
              role="progressbar"
              aria-label="Album complété"
              aria-valuemin={0}
              aria-valuemax={album.length}
              aria-valuenow={summary.discovered}
            >
              <span
                style={{
                  width: `${album.length ? (summary.discovered / album.length) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
          <div>
            <span>Brigos disponibles</span>
            <strong>{format(inventoryCount(state))}</strong>
            <small>Prêts à construire</small>
          </div>
          <div>
            <span>Dans vos créations</span>
            <strong>{format(reservedCount(state))}</strong>
            <small>Récupérables au démontage</small>
          </div>
          <div>
            <span>Exemplaires en plus</span>
            <strong>{format(summary.spareCopies)}</strong>
            <small>De quoi voir plus grand</small>
          </div>
        </section>
      </details>
      <section
        className="collection-controls"
        aria-label="Rechercher et filtrer les Brigos"
      >
        <div className="collection-search-row">
          <label className="collection-search-field">
            <Search size={20} aria-hidden="true" />
            <input
              type="search"
              aria-label="Rechercher un Brigo"
              placeholder="Forme, couleur ou numéro…"
              value={query}
              maxLength={100}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
            />
          </label>
        </div>
        <div
          className="collection-status-tabs"
          role="group"
          aria-label="État de la collection"
        >
          {(
            [
              ["owned", "Mes Brigos"],
              ["all", "Tout l’album"],
              ["missing", "À découvrir"],
              ["duplicates", "Doublons"],
            ] as const
          ).map(([id, label]) => (
            <button
              type="button"
              key={id}
              aria-pressed={status === id}
              className={status === id ? "active" : ""}
              onClick={() => {
                setStatus(id);
                setPage(1);
              }}
            >
              {label}
              <span>{format(summary[id])}</span>
            </button>
          ))}
        </div>
        <details className="collection-advanced">
          <summary>
            <SlidersHorizontal size={18} aria-hidden="true" />
            <span>Filtres et tri</span>
            {advancedCount > 0 && (
              <strong>
                {advancedCount} filtre{advancedCount > 1 ? "s" : ""}
              </strong>
            )}
            <ChevronRight size={17} aria-hidden="true" />
          </summary>
          <div className="collection-advanced-content">
            <label className="collection-sort-field">
              <span>Trier par</span>
              <select
                aria-label="Trier les Brigos"
                value={sort}
                onChange={(event) => {
                  setSort(event.target.value as CollectionSort);
                  setPage(1);
                }}
              >
                <option value="number">Numéro de collection</option>
                <option value="quantity">Quantité décroissante</option>
                <option value="rarity">Plus rares d’abord</option>
                <option value="name">Nom de la forme</option>
              </select>
            </label>
            <div className="collection-selects">
              <label>
                <span>Forme</span>
                <select
                  aria-label="Famille de Brigos"
                  value={family}
                  onChange={(event) => {
                    setFamily(event.target.value as Family | "");
                    setPage(1);
                  }}
                >
                  <option value="">Toutes les formes</option>
                  {Object.entries(FAMILY_NAMES).map(([id, name]) => (
                    <option value={id} key={id}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Rareté</span>
                <select
                  aria-label="Rareté des Brigos"
                  value={rarity}
                  onChange={(event) => {
                    setRarity(event.target.value as Rarity | "");
                    setPage(1);
                  }}
                >
                  <option value="">Toutes les raretés</option>
                  {RARITIES.map((id) => (
                    <option value={id} key={id}>
                      {RARITY_INFO[id].name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="collection-colors">
              <span>
                Couleur <strong>{selectedColor?.name ?? "Toutes"}</strong>
              </span>
              <div role="group" aria-label="Couleur des Brigos">
                <button
                  type="button"
                  className={`collection-color-all ${!color ? "active" : ""}`}
                  aria-pressed={!color}
                  onClick={() => {
                    setColor("");
                    setPage(1);
                  }}
                >
                  Toutes
                </button>
                {COLORS.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    className={`collection-color ${color === item.id ? "active" : ""}`}
                    aria-label={`Couleur ${item.name}`}
                    aria-pressed={color === item.id}
                    title={item.name}
                    style={{ "--swatch": item.hex } as React.CSSProperties}
                    onClick={() => {
                      setColor(item.id);
                      setPage(1);
                    }}
                  >
                    <i />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </details>
      </section>
      <div className="collection-results">
        <p role="status">
          <strong>{format(filtered.length)}</strong> référence
          {filtered.length > 1 ? "s" : ""}
          {status === "missing"
            ? " à découvrir"
            : status === "duplicates"
              ? " en plusieurs exemplaires"
              : ""}
          {selectedColor ? ` · ${selectedColor.name}` : ""}
        </p>
        {hasFilters && (
          <button type="button" className="text-link" onClick={clear}>
            <X size={16} aria-hidden="true" /> Réinitialiser les filtres
          </button>
        )}
      </div>
      {items.length ? (
        <div className="collection-grid">
          {items.map((brigo) => (
            <BrigoCard
              key={brigo.id}
              brigo={brigo}
              count={state.inventory[brigo.id] ?? 0}
              reserved={reserved[brigo.id] ?? 0}
              discovered={discovered.has(brigo.id)}
              onClick={() => onBrigo(brigo)}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <Layers3 size={32} aria-hidden="true" />
          <h2>
            {needsFirstBrigos
              ? "Vos premiers Brigos vous attendent."
              : "Aucune pièce ne correspond."}
          </h2>
          <p>
            {needsFirstBrigos
              ? `Une boîte contient ${BOX_DROP_COUNT} Brigos pour commencer votre collection.`
              : "Modifiez votre recherche ou réinitialisez les filtres."}
          </p>
          {needsFirstBrigos ? (
            <a className="button button-primary" href="#boxes">
              Ouvrir une boîte
            </a>
          ) : (
            <button
              type="button"
              className="button button-secondary"
              onClick={clear}
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>
      )}
      {filtered.length > pageSize && (
        <nav
          className="pagination collection-pagination"
          aria-label="Pages du catalogue"
        >
          <span>
            {format((currentPage - 1) * pageSize + 1)}–
            {format(Math.min(currentPage * pageSize, filtered.length))} sur{" "}
            {format(filtered.length)}
          </span>
          <div>
            <button
              type="button"
              className="icon-button"
              aria-label="Page précédente"
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
            >
              <ChevronLeft size={19} />
            </button>
            <span>
              Page {currentPage} / {maxPage}
            </span>
            <button
              type="button"
              className="icon-button"
              aria-label="Page suivante"
              disabled={currentPage === maxPage}
              onClick={() => setPage(currentPage + 1)}
            >
              <ChevronRight size={19} />
            </button>
          </div>
        </nav>
      )}
      <p className="collection-footnote">
        L’album conserve vos découvertes, même si vous utilisez ou recyclez vos
        pièces.
      </p>
    </div>
  );
}
