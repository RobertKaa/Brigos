import { describe, expect, it } from "vitest";
import {
  getConnectedPuzzleTiles,
  getDailyPuzzle,
  getPuzzleHint,
  isDailyPuzzleSolved,
  isPuzzleDayKey,
  puzzleConnections,
} from "./dailyPuzzle";

describe("circuit des facettes quotidien", () => {
  it("reproduit le même circuit pour le même jour UTC sans dépendre d’une horloge", () => {
    expect(getDailyPuzzle("2026-10-15")).toEqual(getDailyPuzzle("2026-10-15"));
    expect(getDailyPuzzle("2026-10-15")).not.toEqual(
      getDailyPuzzle("2026-10-16"),
    );
  });

  it("offre toujours une solution accessible et demande au moins un geste", () => {
    const variants = new Set<string>();
    for (let day = 0; day < 1200; day++) {
      const dayKey = new Date(Date.UTC(2024, 0, 1 + day))
        .toISOString()
        .slice(0, 10);
      const puzzle = getDailyPuzzle(dayKey);
      expect(puzzle.tiles).toHaveLength(16);
      expect(puzzle.entry % 4).toBe(0);
      expect(puzzle.exit % 4).toBe(3);
      expect(isDailyPuzzleSolved(dayKey, puzzle.solutionRotations)).toBe(true);
      expect(isDailyPuzzleSolved(dayKey, puzzle.initialRotations)).toBe(false);
      expect(
        getConnectedPuzzleTiles(dayKey, puzzle.solutionRotations).length,
      ).toBeGreaterThanOrEqual(12);
      variants.add(`${puzzle.entry}:${puzzle.exit}:${puzzle.tiles.join()}`);
    }
    expect(variants.size).toBeGreaterThanOrEqual(8);
  });

  it.each([
    "",
    "2026-02-30",
    "2026-13-01",
    "2026-10-15T12:00Z",
    "2026-1-1",
    "__proto__",
    null,
    {},
  ])("refuse un jour invalide : %s", (day) => {
    expect(isPuzzleDayKey(day)).toBe(false);
    expect(isDailyPuzzleSolved(day as string, Array(16).fill(0))).toBe(false);
    expect(() => getDailyPuzzle(day as string)).toThrow(RangeError);
  });

  it("accepte un jour bissextile réel", () => {
    expect(isPuzzleDayKey("2024-02-29")).toBe(true);
    expect(isPuzzleDayKey("2025-02-29")).toBe(false);
  });

  it.each([
    null,
    {},
    [],
    Array(15).fill(0),
    Array(17).fill(0),
    Array(16),
    [0.5, ...Array(15).fill(0)],
    [-1, ...Array(15).fill(0)],
    [4, ...Array(15).fill(0)],
    [NaN, ...Array(15).fill(0)],
    [Infinity, ...Array(15).fill(0)],
    ["0", ...Array(15).fill(0)],
  ])(
    "refuse les rotations malformées avant de valider une récompense : %j",
    (value) => {
      expect(isDailyPuzzleSolved("2026-10-15", value)).toBe(false);
      expect(getConnectedPuzzleTiles("2026-10-15", value)).toEqual([]);
    },
  );

  it("exige une sortie réellement reliée et ignore la symétrie des lignes droites", () => {
    const day = "2026-10-15";
    const puzzle = getDailyPuzzle(day);
    const rotations = [...puzzle.solutionRotations];
    for (const [index, tile] of puzzle.tiles.entries()) {
      if (tile === "straight") rotations[index] = (rotations[index] + 2) % 4;
    }
    expect(isDailyPuzzleSolved(day, rotations)).toBe(true);
    rotations[puzzle.entry] = (rotations[puzzle.entry] + 1) % 4;
    expect(isDailyPuzzleSolved(day, rotations)).toBe(false);
  });

  it("propose un seul réglage utile, puis laisse terminer par indices sans impasse", () => {
    const day = "2026-10-15";
    const rotations = [...getDailyPuzzle(day).initialRotations];
    let hints = 0;
    while (!isDailyPuzzleSolved(day, rotations) && hints < 16) {
      const hint = getPuzzleHint(day, rotations);
      expect(hint).not.toBeNull();
      expect(hint?.rotation).not.toBe(rotations[hint!.index]);
      rotations[hint!.index] = hint!.rotation;
      hints++;
    }
    expect(isDailyPuzzleSolved(day, rotations)).toBe(true);
    expect(getPuzzleHint(day, rotations)).toBeNull();
  });

  it("tourne les deux connecteurs sans fabriquer de croisement", () => {
    expect(puzzleConnections("bend", 3)).toEqual([3, 0]);
    expect(puzzleConnections("straight", 3)).toEqual([3, 1]);
  });
});
