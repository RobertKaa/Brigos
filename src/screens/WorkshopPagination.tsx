import { ChevronLeft, ChevronRight } from "lucide-react";
import { workshopPageNumbers } from "./workshopLibrary";

export function WorkshopPagination({
  page,
  pages,
  start,
  end,
  total,
  kind,
  position,
  onPage,
}: {
  page: number;
  pages: number;
  start: number;
  end: number;
  total: number;
  kind: "plans" | "créations" | "piles";
  position: "top" | "bottom";
  onPage: (page: number) => void;
}) {
  const placement = position === "top" ? "haut" : "bas";
  const noun =
    total === 1
      ? { plans: "plan", créations: "création", piles: "pile" }[kind]
      : kind;
  return (
    <div className={`workshop-pagination workshop-pagination-${position}`}>
      <p
        aria-live={position === "top" ? "polite" : undefined}
        aria-atomic="true"
      >
        {total ? (
          <>
            <strong>
              {start.toLocaleString("fr-FR")}–{end.toLocaleString("fr-FR")}
            </strong>{" "}
            sur <strong>{total.toLocaleString("fr-FR")}</strong> {noun}
          </>
        ) : kind === "plans" ? (
          "Aucun plan"
        ) : kind === "piles" ? (
          "Aucune pile"
        ) : (
          "Aucune création"
        )}
      </p>
      {pages > 1 && (
        <nav aria-label={`Pagination des ${kind} (${placement})`}>
          <button
            type="button"
            className="workshop-page-arrow"
            aria-label="Page précédente"
            onClick={() => onPage(page - 1)}
            disabled={page <= 1}
          >
            <ChevronLeft size={19} aria-hidden="true" />
            <span>Précédente</span>
          </button>
          <div className="workshop-page-numbers">
            {workshopPageNumbers(page, pages).map((value, index) =>
              value === "gap" ? (
                <span
                  className="workshop-page-gap"
                  key={`gap-${index}`}
                  aria-hidden="true"
                >
                  …
                </span>
              ) : (
                <button
                  type="button"
                  key={value}
                  aria-label={`Page ${value}`}
                  aria-current={page === value ? "page" : undefined}
                  onClick={() => onPage(value)}
                >
                  {value}
                </button>
              ),
            )}
          </div>
          <label className="workshop-page-select">
            <span className="visually-hidden">
              Aller à la page des {kind} ({placement})
            </span>
            <select
              value={page}
              onChange={(event) => onPage(Number(event.target.value))}
            >
              {Array.from({ length: pages }, (_, index) => (
                <option key={index + 1} value={index + 1}>
                  Page {index + 1} / {pages}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="workshop-page-arrow"
            aria-label="Page suivante"
            onClick={() => onPage(page + 1)}
            disabled={page >= pages}
          >
            <span>Suivante</span>
            <ChevronRight size={19} aria-hidden="true" />
          </button>
        </nav>
      )}
    </div>
  );
}
