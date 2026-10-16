/** Original Brigo circuit: turn faceted ink tiles to carry the line across. */
export type PuzzleDirection = 0 | 1 | 2 | 3;
export type PuzzleTile = "bend" | "straight";

export interface DailyPuzzleDefinition {
  dayKey: string;
  size: 4;
  tiles: readonly PuzzleTile[];
  initialRotations: readonly number[];
  solutionRotations: readonly number[];
  entry: number;
  exit: number;
}

const ROUTES = [
  [0, 1, 5, 4, 8, 9, 13, 14, 10, 6, 7, 11],
  [4, 0, 1, 5, 9, 8, 12, 13, 14, 10, 6, 2, 3, 7, 11, 15],
] as const;

/** A date-only key is deliberately interpreted as a UTC day, never local time. */
export function isPuzzleDayKey(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const time = Date.parse(`${value}T00:00:00.000Z`);
  return (
    Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value
  );
}

function seedFor(dayKey: string): number {
  let value = 2166136261;
  for (const character of dayKey) {
    value ^= character.charCodeAt(0);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

function directionBetween(from: number, to: number): PuzzleDirection {
  if (to === from - 4) return 0;
  if (to === from + 1) return 1;
  if (to === from + 4) return 2;
  return 3;
}

export function puzzleConnections(
  tile: PuzzleTile,
  rotation: number,
): readonly PuzzleDirection[] {
  return [
    rotation % 4,
    (rotation + (tile === "bend" ? 1 : 2)) % 4,
  ] as PuzzleDirection[];
}

function neighbor(index: number, direction: PuzzleDirection): number | null {
  const row = Math.floor(index / 4);
  const column = index % 4;
  if (direction === 0) return row > 0 ? index - 4 : null;
  if (direction === 1) return column < 3 ? index + 1 : null;
  if (direction === 2) return row < 3 ? index + 4 : null;
  return column > 0 ? index - 1 : null;
}

function traceCircuit(
  puzzle: DailyPuzzleDefinition,
  rotations: readonly number[],
): { connected: number[]; solved: boolean } {
  const connected: number[] = [];
  let current = puzzle.entry;
  let incoming: PuzzleDirection = 3;
  while (!connected.includes(current)) {
    const connections = puzzleConnections(
      puzzle.tiles[current],
      rotations[current],
    );
    if (!connections.includes(incoming)) break;
    connected.push(current);
    const outgoing = connections.find((value) => value !== incoming)!;
    if (current === puzzle.exit && outgoing === 1)
      return { connected, solved: true };
    const next = neighbor(current, outgoing);
    if (next === null) break;
    incoming = ((outgoing + 2) % 4) as PuzzleDirection;
    current = next;
  }
  return { connected, solved: false };
}

function validRotations(value: unknown): value is readonly number[] {
  return (
    Array.isArray(value) &&
    value.length === 16 &&
    Array.from(value).every(
      (rotation) => Number.isInteger(rotation) && rotation >= 0 && rotation < 4,
    )
  );
}

export function getDailyPuzzle(dayKey: string): DailyPuzzleDefinition {
  if (!isPuzzleDayKey(dayKey))
    throw new RangeError("Jour UTC du circuit invalide.");
  let seed = seedFor(dayKey);
  const variant = seed % 8;
  let route: number[] = [...ROUTES[variant % 2]];
  if (variant & 2)
    route = route.map((index) => (3 - Math.floor(index / 4)) * 4 + (index % 4));
  if (variant & 4)
    route = route
      .reverse()
      .map((index) => Math.floor(index / 4) * 4 + (3 - (index % 4)));
  const tiles: PuzzleTile[] = Array.from({ length: 16 }, (_, index) =>
    (seed >>> (index % 16)) & 1 ? "bend" : "straight",
  );
  const solutionRotations = Array<number>(16).fill(0);
  route.forEach((index, position) => {
    const before: PuzzleDirection =
      position === 0 ? 3 : directionBetween(index, route[position - 1]);
    const after: PuzzleDirection =
      position === route.length - 1
        ? 1
        : directionBetween(index, route[position + 1]);
    tiles[index] = (before + 2) % 4 === after ? "straight" : "bend";
    solutionRotations[index] =
      tiles[index] === "straight"
        ? before % 2
        : (before + 1) % 4 === after
          ? before
          : after;
  });
  const initialRotations = Array.from({ length: 16 }, () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed >>> 30;
  });
  const puzzle: DailyPuzzleDefinition = {
    dayKey,
    size: 4,
    tiles,
    initialRotations,
    solutionRotations,
    entry: route[0],
    exit: route[route.length - 1],
  };
  // The reward always requires at least one deliberate move.
  if (traceCircuit(puzzle, initialRotations).solved)
    initialRotations[puzzle.entry] = (initialRotations[puzzle.entry] + 1) % 4;
  return puzzle;
}

export function isDailyPuzzleSolved(
  dayKey: string,
  rotations: unknown,
): boolean {
  if (!isPuzzleDayKey(dayKey) || !validRotations(rotations)) return false;
  return traceCircuit(getDailyPuzzle(dayKey), rotations).solved;
}

export function getConnectedPuzzleTiles(
  dayKey: string,
  rotations: unknown,
): readonly number[] {
  if (!isPuzzleDayKey(dayKey) || !validRotations(rotations)) return [];
  return traceCircuit(getDailyPuzzle(dayKey), rotations).connected;
}

/** A hint advances just one useful tile, without revealing the finished grid. */
export function getPuzzleHint(
  dayKey: string,
  rotations: readonly number[],
): { index: number; rotation: number } | null {
  if (!isPuzzleDayKey(dayKey) || !validRotations(rotations)) return null;
  const puzzle = getDailyPuzzle(dayKey);
  if (traceCircuit(puzzle, rotations).solved) return null;
  // Find the first incorrect tile along the intended solution's live path.
  const route = traceCircuit(puzzle, puzzle.solutionRotations).connected;
  for (const index of route) {
    const expected = puzzleConnections(
      puzzle.tiles[index],
      puzzle.solutionRotations[index],
    );
    const actual = puzzleConnections(puzzle.tiles[index], rotations[index]);
    if (!expected.every((direction) => actual.includes(direction)))
      return { index, rotation: puzzle.solutionRotations[index] };
  }
  return null;
}
