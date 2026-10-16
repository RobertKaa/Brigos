import { describe, expect, it, vi } from "vitest";
import {
  readThemePreference,
  resolveTheme,
  THEME_STORAGE_KEY,
  writeThemePreference,
} from "./theme";

describe("préférence de thème", () => {
  it("suit le système seulement en l’absence d’un choix explicite", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });

  it.each(["dark", "light"] as const)("restaure le choix %s", (value) => {
    const storage = { getItem: vi.fn(() => value), setItem: vi.fn() };
    expect(readThemePreference(storage)).toBe(value);
    expect(storage.getItem).toHaveBeenCalledWith(THEME_STORAGE_KEY);
  });

  it.each([null, "system", "", "DARK", "<script>alert(1)</script>"])(
    "ignore une valeur absente ou étrangère : %s",
    (value) => {
      expect(
        readThemePreference({ getItem: () => value, setItem: vi.fn() }),
      ).toBe("system");
    },
  );

  it("reste fonctionnel quand le navigateur refuse le stockage", () => {
    const denied = () => {
      throw new Error("Storage denied");
    };
    expect(readThemePreference({ getItem: denied, setItem: denied })).toBe(
      "system",
    );
    expect(() =>
      writeThemePreference("dark", { getItem: denied, setItem: denied }),
    ).not.toThrow();
    expect(readThemePreference()).toBe("system");
  });

  it("mémorise le retour au thème du système sans toucher à la sauvegarde", () => {
    const storage = { getItem: vi.fn(), setItem: vi.fn() };
    writeThemePreference("system", storage);
    expect(storage.setItem).toHaveBeenCalledExactlyOnceWith(
      THEME_STORAGE_KEY,
      "system",
    );
  });
});
