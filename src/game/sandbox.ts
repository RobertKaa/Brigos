import { BRIGO_BY_ID } from "./catalog";
import { GameError, MAX_VALUE } from "./engine";
import type { GameState } from "./engine";
import { rotatedSize } from "./geometry";
import type { Rotation } from "./geometry";

export const SANDBOX_GRID_SIZE = 24;
export const SANDBOX_MAX_HEIGHT = 36;
export const SANDBOX_MAX_PLACEMENTS = 500;
export const SANDBOX_MAX_PROJECTS = 20;
export const SANDBOX_MAX_NAME_LENGTH = 48;

export interface SandboxCandidate {
  brigoId: string;
  /** Minimum corner of the normalized, rotated footprint. */
  x: number;
  y: number;
  z: number;
  rotation: Rotation;
}
export interface SandboxPlacement extends SandboxCandidate {
  id: string;
}
export interface SandboxProject {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  placements: SandboxPlacement[];
}

const rotations: readonly number[] = [0, 90, 180, 270];
const invalidNameCharacters =
  /[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/;
function projectName(value: string): string {
  if (typeof value !== "string")
    throw new GameError("Saisissez un nom pour votre création.");
  const name = value.trim();
  if (
    !name ||
    name.length > SANDBOX_MAX_NAME_LENGTH ||
    invalidNameCharacters.test(name)
  )
    throw new GameError(
      `Choisissez un nom de 1 à ${SANDBOX_MAX_NAME_LENGTH} caractères, sur une seule ligne.`,
    );
  return name;
}

function bounds(candidate: SandboxCandidate) {
  const model = BRIGO_BY_ID.get(candidate.brigoId)?.model;
  if (!model) return null;
  const size = rotatedSize(model, candidate.rotation);
  return {
    minX: candidate.x,
    maxX: candidate.x + size.width,
    minY: candidate.y,
    maxY: candidate.y + size.depth,
    minZ: candidate.z,
    maxZ: candidate.z + model.height,
  };
}
const overlaps = (a0: number, a1: number, b0: number, b1: number) =>
  a0 < b1 && a1 > b0;

/** Conservative envelopes keep all Brigo shapes separate, including arches. */
export function sandboxPlacementIssue(
  placements: readonly SandboxPlacement[],
  candidate: SandboxCandidate,
  ignoreId?: string,
): string | null {
  if (!candidate || !BRIGO_BY_ID.has(candidate.brigoId))
    return "Ce Brigo n’existe pas.";
  if (!rotations.includes(candidate.rotation))
    return "Choisissez une rotation de 0, 90, 180 ou 270 degrés.";
  if (![candidate.x, candidate.y, candidate.z].every(Number.isSafeInteger))
    return "La position doit utiliser des coordonnées entières.";
  const box = bounds(candidate)!;
  if (
    box.minX < 0 ||
    box.minY < 0 ||
    box.maxX > SANDBOX_GRID_SIZE ||
    box.maxY > SANDBOX_GRID_SIZE
  )
    return `Le Brigo doit rester dans le plateau de ${SANDBOX_GRID_SIZE} × ${SANDBOX_GRID_SIZE}.`;
  if (box.minZ < 0 || box.maxZ > SANDBOX_MAX_HEIGHT)
    return `La création doit rester entre 0 et ${SANDBOX_MAX_HEIGHT} en hauteur.`;
  for (const piece of placements) {
    if (piece.id === ignoreId) continue;
    const other = bounds(piece);
    if (
      other &&
      overlaps(box.minX, box.maxX, other.minX, other.maxX) &&
      overlaps(box.minY, box.maxY, other.minY, other.maxY) &&
      overlaps(box.minZ, box.maxZ, other.minZ, other.maxZ)
    )
      return "Cet emplacement est déjà occupé par un autre Brigo.";
  }
  return null;
}

/** Place on top of the highest overlapping footprint; no structural simulation. */
export function sandboxAutoHeight(
  placements: readonly SandboxPlacement[],
  candidate: Omit<SandboxCandidate, "z">,
  ignoreId?: string,
): number | null {
  const base = { ...candidate, z: 0 };
  const box = bounds(base);
  if (!box) return null;
  let z = 0;
  for (const piece of placements) {
    if (piece.id === ignoreId) continue;
    const other = bounds(piece);
    if (
      other &&
      overlaps(box.minX, box.maxX, other.minX, other.maxX) &&
      overlaps(box.minY, box.maxY, other.minY, other.maxY)
    )
      z = Math.max(z, other.maxZ);
  }
  return sandboxPlacementIssue(placements, { ...candidate, z }, ignoreId)
    ? null
    : z;
}

export function sandboxReservedCount(
  state: GameState,
  brigoId?: string,
): number {
  return (state.sandboxProjects ?? []).reduce(
    (sum, project) =>
      sum +
      project.placements.reduce(
        (count, piece) =>
          count + (brigoId === undefined || piece.brigoId === brigoId ? 1 : 0),
        0,
      ),
    0,
  );
}

function findProject(state: GameState, projectId: string): SandboxProject {
  const project = state.sandboxProjects?.find((item) => item.id === projectId);
  if (!project)
    throw new GameError("Cette création libre n’est plus dans votre atelier.");
  return project;
}
function updateProject(state: GameState, next: SandboxProject): GameState {
  return {
    ...state,
    sandboxProjects: (state.sandboxProjects ?? []).map((item) =>
      item.id === next.id ? next : item,
    ),
  };
}
function updatedAt(project: SandboxProject, nowMs = Date.now()): string {
  // A restored backup or a clock correction must not make the next save invalid.
  return new Date(
    Math.max(
      nowMs,
      Date.parse(project.updatedAt),
      Date.parse(project.createdAt),
    ),
  ).toISOString();
}
function returnedInventory(
  state: GameState,
  placements: readonly SandboxPlacement[],
) {
  const inventory = { ...state.inventory };
  for (const piece of placements) {
    const available = inventory[piece.brigoId] ?? 0;
    if (available >= MAX_VALUE)
      throw new GameError(
        "L’inventaire de ce Brigo est plein. Aucun changement n’a été appliqué.",
      );
    inventory[piece.brigoId] = available + 1;
  }
  return inventory;
}

export function createSandboxProject(
  state: GameState,
  name?: string,
  nowMs = Date.now(),
): GameState {
  const projects = state.sandboxProjects ?? [];
  if (projects.length >= SANDBOX_MAX_PROJECTS)
    throw new GameError(
      `Votre atelier peut accueillir ${SANDBOX_MAX_PROJECTS} créations libres. Démontez-en une pour faire de la place.`,
    );
  const createdAt = new Date(nowMs).toISOString();
  const project: SandboxProject = {
    id: crypto.randomUUID(),
    name: projectName(name ?? `Création libre ${projects.length + 1}`),
    createdAt,
    updatedAt: createdAt,
    placements: [],
  };
  return { ...state, sandboxProjects: [...projects, project] };
}
export function renameSandboxProject(
  state: GameState,
  projectId: string,
  name: string,
  nowMs = Date.now(),
): GameState {
  const project = findProject(state, projectId);
  return updateProject(state, {
    ...project,
    name: projectName(name),
    updatedAt: updatedAt(project, nowMs),
  });
}
export function placeSandboxBrigo(
  state: GameState,
  projectId: string,
  candidate: SandboxCandidate,
  nowMs = Date.now(),
): GameState {
  const project = findProject(state, projectId);
  if (project.placements.length >= SANDBOX_MAX_PLACEMENTS)
    throw new GameError(
      `Une création libre peut contenir ${SANDBOX_MAX_PLACEMENTS} Brigos au maximum.`,
    );
  const issue = sandboxPlacementIssue(project.placements, candidate);
  if (issue) throw new GameError(issue);
  const available = state.inventory[candidate.brigoId] ?? 0;
  if (!Number.isSafeInteger(available) || available < 1)
    throw new GameError("Ce Brigo n’est plus disponible dans votre stock.");
  const inventory = { ...state.inventory };
  if (available === 1) delete inventory[candidate.brigoId];
  else inventory[candidate.brigoId] = available - 1;
  const placement: SandboxPlacement = {
    id: crypto.randomUUID(),
    brigoId: candidate.brigoId,
    x: candidate.x,
    y: candidate.y,
    z: candidate.z,
    rotation: candidate.rotation,
  };
  return {
    ...updateProject(state, {
      ...project,
      placements: [...project.placements, placement],
      updatedAt: updatedAt(project, nowMs),
    }),
    inventory,
  };
}
export function moveSandboxBrigo(
  state: GameState,
  projectId: string,
  placementId: string,
  candidate: SandboxCandidate,
  nowMs = Date.now(),
): GameState {
  const project = findProject(state, projectId);
  const placement = project.placements.find((item) => item.id === placementId);
  if (!placement)
    throw new GameError("Ce Brigo n’est plus dans votre création.");
  if (candidate.brigoId !== placement.brigoId)
    throw new GameError("Un déplacement doit conserver le même Brigo.");
  const issue = sandboxPlacementIssue(
    project.placements,
    candidate,
    placementId,
  );
  if (issue) throw new GameError(issue);
  const next: SandboxPlacement = {
    id: placementId,
    brigoId: placement.brigoId,
    x: candidate.x,
    y: candidate.y,
    z: candidate.z,
    rotation: candidate.rotation,
  };
  return updateProject(state, {
    ...project,
    placements: project.placements.map((item) =>
      item.id === placementId ? next : item,
    ),
    updatedAt: updatedAt(project, nowMs),
  });
}
export function removeSandboxBrigo(
  state: GameState,
  projectId: string,
  placementId: string,
  nowMs = Date.now(),
): GameState {
  const project = findProject(state, projectId);
  const placement = project.placements.find((item) => item.id === placementId);
  if (!placement)
    throw new GameError("Ce Brigo n’est plus dans votre création.");
  const inventory = returnedInventory(state, [placement]);
  return {
    ...updateProject(state, {
      ...project,
      placements: project.placements.filter((item) => item.id !== placementId),
      updatedAt: updatedAt(project, nowMs),
    }),
    inventory,
  };
}
export function deleteSandboxProject(
  state: GameState,
  projectId: string,
): GameState {
  const project = findProject(state, projectId);
  const inventory = returnedInventory(state, project.placements);
  return {
    ...state,
    inventory,
    sandboxProjects: (state.sandboxProjects ?? []).filter(
      (item) => item.id !== projectId,
    ),
  };
}

/** Strict save boundary. Keep only recognized plain data, never imported markup. */
export function parseSandboxProjects(value: unknown): SandboxProject[] {
  const fail = (detail: string): never => {
    throw new GameError(`Sauvegarde invalide : création libre ${detail}.`);
  };
  const record = (item: unknown): Record<string, unknown> => {
    if (!item || typeof item !== "object" || Array.isArray(item))
      return fail("incorrecte");
    return item as Record<string, unknown>;
  };
  const identifier = (item: unknown): string => {
    if (typeof item !== "string" || !/^[a-zA-Z0-9-]{1,80}$/.test(item))
      return fail("avec identifiant incorrect");
    return item;
  };
  const date = (item: unknown): string => {
    if (
      typeof item !== "string" ||
      item.length > 30 ||
      Number.isNaN(Date.parse(item))
    )
      return fail("avec date incorrecte");
    return new Date(item).toISOString();
  };
  if (!Array.isArray(value) || value.length > SANDBOX_MAX_PROJECTS)
    return fail("avec liste trop grande ou incorrecte");
  const projectIds = new Set<string>();
  const placementIds = new Set<string>();
  return value.map((raw) => {
    const item = record(raw);
    const id = identifier(item.id);
    if (projectIds.has(id)) return fail("en double");
    projectIds.add(id);
    if (typeof item.name !== "string") return fail("avec nom incorrect");
    let name: string;
    try {
      name = projectName(item.name);
    } catch {
      return fail("avec nom incorrect");
    }
    if (name !== item.name) return fail("avec nom non normalisé");
    const createdAt = date(item.createdAt);
    const updatedAt = date(item.updatedAt);
    if (Date.parse(updatedAt) < Date.parse(createdAt))
      return fail("avec dates incohérentes");
    if (
      !Array.isArray(item.placements) ||
      item.placements.length > SANDBOX_MAX_PLACEMENTS
    )
      return fail("avec trop de Brigos");
    const placements: SandboxPlacement[] = [];
    // A save is validated after every committed gesture. Index each footprint
    // once rather than compare all 500 placements against one another.
    const columns = new Map<number, NonNullable<ReturnType<typeof bounds>>[]>();
    for (const rawPlacement of item.placements) {
      const piece = record(rawPlacement);
      const placementId = identifier(piece.id);
      if (placementIds.has(placementId)) return fail("avec Brigo en double");
      placementIds.add(placementId);
      const candidate = {
        brigoId: piece.brigoId,
        x: piece.x,
        y: piece.y,
        z: piece.z,
        rotation: piece.rotation,
      } as SandboxCandidate;
      const issue = sandboxPlacementIssue([], candidate);
      if (issue) return fail(`incorrecte (${issue})`);
      const box = bounds(candidate)!;
      for (let x = box.minX; x < box.maxX; x++) {
        for (let y = box.minY; y < box.maxY; y++) {
          const cell = x + y * SANDBOX_GRID_SIZE;
          const occupants = columns.get(cell) ?? [];
          if (
            occupants.some((other) =>
              overlaps(box.minZ, box.maxZ, other.minZ, other.maxZ),
            )
          )
            return fail("avec Brigos superposés");
          occupants.push(box);
          columns.set(cell, occupants);
        }
      }
      placements.push({ id: placementId, ...candidate });
    }
    return { id, name, createdAt, updatedAt, placements };
  });
}
