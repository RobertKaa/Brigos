import { MODELS, pieceCount } from "../game/catalog";
import type { Recipe } from "../game/catalog";
import { recipeXp } from "../game/progression";

export const WORKSHOP_PAGE_SIZE = 12;
export type RecipeFormat = "all" | "small" | "intermediate" | "legendary";
export type WorkshopFilters = {
  query: string;
  theme: string;
  difficulty: string;
  format: RecipeFormat;
  sort: string;
};
export type WorkshopLibraryState = WorkshopFilters & { page: number };
export const INITIAL_WORKSHOP_LIBRARY: WorkshopLibraryState = {
  query: "",
  theme: "all",
  difficulty: "all",
  format: "all",
  sort: "close",
  page: 1,
};
type LibraryAction =
  | { type: "filters"; changes: Partial<WorkshopFilters> }
  | { type: "page"; page: number }
  | { type: "clear" };

export function workshopLibraryReducer(
  state: WorkshopLibraryState,
  action: LibraryAction,
): WorkshopLibraryState {
  if (action.type === "page") return { ...state, page: action.page };
  if (action.type === "clear") {
    return { ...INITIAL_WORKSHOP_LIBRARY, sort: state.sort };
  }
  return { ...state, ...action.changes, page: 1 };
}

export function withAvailableWorkshopGoal(
  state: WorkshopLibraryState,
  goalRecipeId: string | null,
): WorkshopLibraryState {
  return state.difficulty === "tracked" && !goalRecipeId
    ? { ...state, difficulty: "all", page: 1 }
    : state;
}

/** Format describes project size; difficulty remains an independent filter. */
export function recipeFormat(recipe: Recipe): Exclude<RecipeFormat, "all"> {
  const total = pieceCount(recipe);
  if (recipe.difficulty === "Légendaire" || total >= 900) return "legendary";
  return total >= 50 ? "intermediate" : "small";
}

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr");

const modelNames = new Map(MODELS.map((model) => [model.id, model.name]));

function recipeSearchText(recipe: Recipe) {
  // The bill of materials is already grouped, so searching a monument does not
  // traverse its thousands of placements on every keystroke.
  const usedModels = recipe.requirements.flatMap((requirement) => {
    const name = requirement.modelId && modelNames.get(requirement.modelId);
    return name ? [name] : [];
  });
  return normalize([recipe.name, recipe.description, ...usedModels].join(" "));
}

type PlanEntry = {
  recipe: Recipe;
  progress: { total: number; available: number; canBuild: boolean };
};
export function filterWorkshopPlans<T extends PlanEntry>(
  entries: readonly T[],
  filters: WorkshopFilters,
  goalRecipeId: string | null,
): T[] {
  const query = normalize(filters.query.trim());
  return entries
    .filter(
      ({ recipe, progress }) =>
        (!query || recipeSearchText(recipe).includes(query)) &&
        (filters.theme === "all" || recipe.theme === filters.theme) &&
        (filters.format === "all" || recipeFormat(recipe) === filters.format) &&
        (filters.difficulty === "all" ||
          (filters.difficulty === "starter" &&
            recipe.difficulty === "Premiers pas") ||
          (filters.difficulty === "creative" &&
            recipe.difficulty === "Créatif") ||
          (filters.difficulty === "expert" && recipe.difficulty === "Expert") ||
          (filters.difficulty === "legendary" &&
            recipe.difficulty === "Légendaire") ||
          (filters.difficulty === "ready" && progress.canBuild) ||
          (filters.difficulty === "tracked" && recipe.id === goalRecipeId)),
    )
    .sort((a, b) =>
      filters.sort === "pieces"
        ? a.progress.total - b.progress.total
        : filters.sort === "xp"
          ? recipeXp(b.recipe) - recipeXp(a.recipe)
          : filters.sort === "close"
            ? a.progress.total -
                a.progress.available -
                (b.progress.total - b.progress.available) ||
              a.progress.total - b.progress.total
            : 0,
    );
}

export function paginateWorkshop<T>(
  items: readonly T[],
  requestedPage: number,
) {
  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / WORKSHOP_PAGE_SIZE));
  const page = Math.max(
    1,
    Math.min(
      pages,
      Number.isFinite(requestedPage) ? Math.floor(requestedPage) : 1,
    ),
  );
  const offset = (page - 1) * WORKSHOP_PAGE_SIZE;
  return {
    page,
    pages,
    total,
    start: total ? offset + 1 : 0,
    end: Math.min(offset + WORKSHOP_PAGE_SIZE, total),
    items: items.slice(offset, offset + WORKSHOP_PAGE_SIZE),
  };
}

/** Keeps large libraries navigable without one button for every page. */
export function workshopPageNumbers(
  page: number,
  pages: number,
): (number | "gap")[] {
  const visible = Array.from({ length: pages }, (_, index) => index + 1).filter(
    (value) =>
      pages <= 7 ||
      value === 1 ||
      value === pages ||
      Math.abs(value - page) <= 1,
  );
  return visible.flatMap((value, index) =>
    index && value - visible[index - 1] > 1 ? ["gap", value] : [value],
  );
}
