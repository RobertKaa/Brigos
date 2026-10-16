import { useEffect, useState } from "react";
import {
  applyTheme,
  browserThemePreference,
  resolveTheme,
  THEME_STORAGE_KEY,
  writeThemePreference,
} from "./theme";
import type { ThemePreference } from "./theme";

export function useTheme() {
  const [preference, setPreferenceState] = useState(browserThemePreference);
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
  );
  const theme = resolveTheme(preference, systemDark);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const change = () => setSystemDark(media.matches);
    const sync = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY || event.key === null) {
        setPreferenceState(browserThemePreference());
      }
    };
    media.addEventListener("change", change);
    window.addEventListener("storage", sync);
    return () => {
      media.removeEventListener("change", change);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => applyTheme(theme), [theme]);

  const setPreference = (value: ThemePreference) => {
    setPreferenceState(value);
    try {
      writeThemePreference(value, window.localStorage);
    } catch {
      // Accessing localStorage itself may throw in restricted browser contexts.
    }
  };

  return {
    theme,
    preference,
    setPreference,
    toggleTheme: () => setPreference(theme === "dark" ? "light" : "dark"),
  };
}
