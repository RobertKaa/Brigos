import { GameError } from "./engine";
import type { GameState } from "./engine";
import { renameSandboxProject, SANDBOX_MAX_PROJECTS } from "./sandbox";
import type { SandboxProject } from "./sandbox";
import type { Rotation } from "./geometry";

export const GALLERY_DESCRIPTION_MAX = 240;
export const GALLERY_BACKGROUNDS = ["paper", "ink"] as const;
export interface ExhibitPresentation {
  description: string;
  rotation: Rotation;
  backgroundId: (typeof GALLERY_BACKGROUNDS)[number];
}
export interface FreeExhibit extends ExhibitPresentation {
  projectId: string;
  confirmedGeometry: string;
}
export interface FreeGalleryState {
  exhibits: FreeExhibit[];
  featuredProjectId: string | null;
}
export const emptyFreeGallery = (): FreeGalleryState => ({
  exhibits: [],
  featuredProjectId: null,
});

/** A bounded change indicator, not an authenticity or ownership proof. */
export function sandboxGeometryFingerprint(project: SandboxProject): string {
  const source = project.placements
    .map((p) => JSON.stringify([p.brigoId, p.x, p.y, p.z, p.rotation]))
    .sort()
    .join("\n");
  let a = 2166136261,
    b = 5381;
  for (let index = 0; index < source.length; index++) {
    a = Math.imul(a ^ source.charCodeAt(index), 16777619);
    b = Math.imul(b, 33) ^ source.charCodeAt(index);
  }
  return `g1-${(a >>> 0).toString(16).padStart(8, "0")}${(b >>> 0).toString(16).padStart(8, "0")}`;
}
export function galleryPresentation(
  value: ExhibitPresentation,
): ExhibitPresentation {
  if (
    !value ||
    typeof value.description !== "string" ||
    value.description.length > GALLERY_DESCRIPTION_MAX ||
    /[\u0000-\u0009\u000b-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/.test(
      value.description,
    ) ||
    ![0, 90, 180, 270].includes(value.rotation) ||
    !GALLERY_BACKGROUNDS.includes(value.backgroundId)
  )
    throw new GameError(
      "Choisissez une description de 240 caractères maximum, un angle et un fond valides.",
    );
  return {
    description: value.description.trim(),
    rotation: value.rotation,
    backgroundId: value.backgroundId,
  };
}
export function exposeSandboxProject(
  state: GameState,
  projectId: string,
  name: string,
  presentation: ExhibitPresentation,
  nowMs = Date.now(),
): GameState {
  const project = state.sandboxProjects?.find((item) => item.id === projectId);
  if (!project) throw new GameError("Cette création n’existe plus.");
  if (!project.placements.length)
    throw new GameError(
      "Ajoutez au moins un Brigo avant d’exposer cette création.",
    );
  const parsed = galleryPresentation(presentation);
  const next = renameSandboxProject(state, projectId, name, nowMs);
  const gallery = state.freeGallery ?? emptyFreeGallery();
  return {
    ...next,
    freeGallery: {
      ...gallery,
      exhibits: [
        ...gallery.exhibits.filter((item) => item.projectId !== projectId),
        {
          projectId,
          ...parsed,
          confirmedGeometry: sandboxGeometryFingerprint(project),
        },
      ],
    },
  };
}
/** Also used by dismantling and removal of a project's last reserved piece. */
export function withoutFreeExhibit(
  state: GameState,
  projectId: string,
): GameState {
  if (!state.freeGallery) return state;
  return {
    ...state,
    freeGallery: {
      exhibits: state.freeGallery.exhibits.filter(
        (item) => item.projectId !== projectId,
      ),
      featuredProjectId:
        state.freeGallery.featuredProjectId === projectId
          ? null
          : state.freeGallery.featuredProjectId,
    },
  };
}
export function featureFreeExhibit(
  state: GameState,
  projectId: string | null,
): GameState {
  const gallery = state.freeGallery ?? emptyFreeGallery();
  if (
    projectId !== null &&
    !gallery.exhibits.some((item) => item.projectId === projectId)
  )
    throw new GameError(
      "Exposez cette création avant de la mettre en vedette.",
    );
  return {
    ...state,
    freeGallery: { ...gallery, featuredProjectId: projectId },
  };
}

export function parseFreeGallery(
  value: unknown,
  projects: readonly SandboxProject[],
): FreeGalleryState {
  const fail = (): never => {
    throw new GameError("Sauvegarde invalide : galerie libre incorrecte.");
  };
  if (!value || typeof value !== "object" || Array.isArray(value))
    return fail();
  const data = value as Record<string, unknown>;
  if (
    !Array.isArray(data.exhibits) ||
    data.exhibits.length > SANDBOX_MAX_PROJECTS
  )
    return fail();
  const ids = new Set<string>();
  const exhibits = data.exhibits.map((raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return fail();
    const item = raw as Record<string, unknown>;
    if (
      typeof item.projectId !== "string" ||
      ids.has(item.projectId) ||
      !projects.some(
        (project) =>
          project.id === item.projectId && project.placements.length > 0,
      ) ||
      typeof item.confirmedGeometry !== "string" ||
      !/^g1-[a-f0-9]{16}$/.test(item.confirmedGeometry)
    )
      return fail();
    ids.add(item.projectId);
    let presentation: ExhibitPresentation;
    try {
      presentation = galleryPresentation(
        item as unknown as ExhibitPresentation,
      );
    } catch {
      return fail();
    }
    if (presentation.description !== item.description) return fail();
    return {
      projectId: item.projectId,
      ...presentation,
      confirmedGeometry: item.confirmedGeometry,
    };
  });
  if (
    data.featuredProjectId !== null &&
    (typeof data.featuredProjectId !== "string" ||
      !ids.has(data.featuredProjectId))
  )
    return fail();
  return {
    exhibits,
    featuredProjectId: data.featuredProjectId as string | null,
  };
}
