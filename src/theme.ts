export type Theme = "light" | "dark";
export type ThemePreference = Theme | "system";
export const THEME_STORAGE_KEY = "brigo-club:theme";

type ThemeStorage = Pick<Storage, "getItem" | "setItem">;

export function readThemePreference(storage?: ThemeStorage): ThemePreference {
  try {
    const value = storage?.getItem(THEME_STORAGE_KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

export function writeThemePreference(
  preference: ThemePreference,
  storage?: ThemeStorage,
): void {
  try {
    storage?.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Appearance remains usable when browser storage is unavailable.
  }
}

export function resolveTheme(
  preference: ThemePreference,
  systemDark: boolean,
): Theme {
  return preference === "system" ? (systemDark ? "dark" : "light") : preference;
}

export function browserThemePreference(): ThemePreference {
  try {
    return readThemePreference(window.localStorage);
  } catch {
    return "system";
  }
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", theme === "dark" ? "#191b22" : "#f7f1e5");
}

export function initializeTheme(): void {
  applyTheme(
    resolveTheme(
      browserThemePreference(),
      window.matchMedia("(prefers-color-scheme: dark)").matches,
    ),
  );
}
