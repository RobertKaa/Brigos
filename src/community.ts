import { getSupabaseClient, readAuthConfiguration } from "./auth/client";
import { BRIGO_BY_ID } from "./game/catalog";
import type { SandboxProject } from "./game/sandbox";
import type { Rotation } from "./game/geometry";

export type CommunityTab = "creations" | "players" | "mine";
export interface PublicProfile {
  id: string;
  pseudo: string;
  bio: string;
  avatar: "coral" | "mint" | "gold";
  featuredCreationId: string | null;
  publishedCount: number;
}
export interface PublicCreation {
  id: string;
  title: string;
  description: string;
  rotation: Rotation;
  backgroundId: "paper" | "ink";
  publishedAt: string;
  placements: SandboxProject["placements"];
  author: PublicProfile;
}
export interface OwnCommunity {
  profile:
    | (PublicProfile & {
        visible: boolean;
        moderated: boolean;
        revision: number;
      })
    | null;
  creations: {
    id: string;
    projectId: string;
    title: string;
    moderated: boolean;
  }[];
}
export interface CommunityPage {
  items: (PublicProfile | PublicCreation)[];
  hasMore: boolean;
  profile: PublicProfile | null;
}
export type CommunityAction =
  | "players"
  | "creations"
  | "profile"
  | "creation"
  | "mine"
  | "save-profile"
  | "publish"
  | "unpublish"
  | "report";
export interface CommunityApi {
  request(
    action: CommunityAction,
    input?: Record<string, unknown>,
  ): Promise<unknown>;
}
export class CommunityError extends Error {
  constructor(
    message: string,
    readonly code = "UNAVAILABLE",
  ) {
    super(message);
  }
}
const messages: Record<string, string> = {
  AUTH_REQUIRED: "Connectez-vous à votre compte pour retrouver la communauté.",
  RATE_LIMITED:
    "Trop de demandes rapprochées. Patientez un instant puis réessayez.",
  PROFILE_PRIVATE: "Rendez votre profil visible avant de publier une création.",
  PROFILE_CONFLICT:
    "Votre profil a changé dans une autre fenêtre. Actualisez-le avant d’enregistrer pour conserver le dernier choix de visibilité.",
  NOT_FOUND: "Ce profil ou cette création n’est plus disponible.",
  INVALID_INPUT: "Vérifiez les champs saisis et réessayez.",
};

/** No global result cache: withdrawal must be respected even on a direct link. */
export function createCommunityApi(userId: string | null): CommunityApi {
  return {
    async request(action, input = {}) {
      const client = getSupabaseClient();
      const configuration = readAuthConfiguration(import.meta.env);
      if (!client || !userId || !configuration)
        throw new CommunityError(messages.AUTH_REQUIRED, "AUTH_REQUIRED");
      const {
        data: { session },
        error: sessionError,
      } = await client.auth.getSession();
      if (sessionError || session?.user.id !== userId)
        throw new CommunityError(messages.AUTH_REQUIRED, "AUTH_REQUIRED");
      // Capture this account's token. A shared SDK account switch must never
      // redirect an in-flight publication to another account.
      const response = await fetch(
        `${configuration.url}/rest/v1/rpc/brigo_community`,
        {
          method: "POST",
          headers: {
            apikey: configuration.key,
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ p_action: action, p_input: input }),
          cache: "no-store",
          signal: AbortSignal.timeout(15_000),
        },
      ).catch(() => {
        throw new CommunityError(
          "Connexion interrompue. Actualisez pour vérifier votre action.",
        );
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          code?: string;
        } | null;
        if (payload?.code === "PGRST202")
          throw new CommunityError(
            "Les galeries partagées ne sont pas encore activées sur ce serveur.",
            "SETUP_REQUIRED",
          );
        throw new CommunityError(
          response.status === 401
            ? messages.AUTH_REQUIRED
            : "La communauté est momentanément indisponible. Réessayez.",
        );
      }
      const data: unknown = await response.json();
      if (data && typeof data === "object" && "error" in data) {
        const code = String(data.error);
        throw new CommunityError(
          messages[code] ?? "La communauté est momentanément indisponible.",
          code,
        );
      }
      return data;
    },
  };
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isPublicId = (v: unknown): v is string =>
  typeof v === "string" && uuid.test(v);
const object = (v: unknown): Record<string, unknown> => {
  if (!v || typeof v !== "object" || Array.isArray(v))
    throw new CommunityError("Réponse de la communauté illisible.");
  return v as Record<string, unknown>;
};
const text = (v: unknown, max: number, multiline = false): string => {
  if (
    typeof v !== "string" ||
    v.length > max ||
    (multiline
      ? /[\u0000-\u0009\u000b-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/
      : /[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/
    ).test(v)
  )
    throw new CommunityError("Texte de la communauté invalide.");
  return v;
};
export function parsePublicProfile(raw: unknown): PublicProfile {
  const v = object(raw);
  if (
    !isPublicId(v.id) ||
    !["coral", "mint", "gold"].includes(String(v.avatar)) ||
    !Number.isSafeInteger(v.publishedCount) ||
    Number(v.publishedCount) < 0 ||
    Number(v.publishedCount) > 20 ||
    (v.featuredCreationId !== null && !isPublicId(v.featuredCreationId))
  )
    throw new CommunityError("Profil de la communauté invalide.");
  return {
    id: v.id,
    pseudo: text(v.pseudo, 40),
    bio: text(v.bio, 240),
    avatar: v.avatar as PublicProfile["avatar"],
    featuredCreationId: v.featuredCreationId as string | null,
    publishedCount: v.publishedCount as number,
  };
}
export function parsePublicCreation(raw: unknown): PublicCreation {
  const v = object(raw);
  if (
    !isPublicId(v.id) ||
    ![0, 90, 180, 270].includes(Number(v.rotation)) ||
    typeof v.rotation !== "number" ||
    !["paper", "ink"].includes(String(v.backgroundId)) ||
    typeof v.publishedAt !== "string" ||
    !Number.isFinite(Date.parse(v.publishedAt)) ||
    !Array.isArray(v.placements) ||
    !v.placements.length ||
    v.placements.length > 500
  )
    throw new CommunityError("Création de la communauté invalide.");
  const placements = v.placements.map((raw, index) => {
    const p = object(raw);
    if (
      typeof p.brigoId !== "string" ||
      !BRIGO_BY_ID.has(p.brigoId) ||
      ![p.x, p.y, p.z].every(
        (n) => Number.isSafeInteger(n) && Number(n) >= 0 && Number(n) <= 36,
      ) ||
      typeof p.rotation !== "number" ||
      ![0, 90, 180, 270].includes(p.rotation)
    )
      throw new CommunityError("Aperçu de la communauté invalide.");
    return {
      id: `public-${index}`,
      brigoId: p.brigoId,
      x: p.x as number,
      y: p.y as number,
      z: p.z as number,
      rotation: p.rotation as Rotation,
    };
  });
  return {
    id: v.id,
    title: text(v.title, 48),
    description: text(v.description, 240, true),
    rotation: v.rotation as Rotation,
    backgroundId: v.backgroundId as PublicCreation["backgroundId"],
    publishedAt: v.publishedAt,
    placements,
    author: parsePublicProfile(v.author),
  };
}
export function parseCommunityPage(
  raw: unknown,
  players = false,
): CommunityPage {
  const v = object(raw);
  if (
    !Array.isArray(v.items) ||
    v.items.length > (players ? 12 : 6) ||
    typeof v.hasMore !== "boolean"
  )
    throw new CommunityError("Liste de la communauté invalide.");
  return {
    items: v.items.map((item) =>
      players ? parsePublicProfile(item) : parsePublicCreation(item),
    ),
    hasMore: v.hasMore,
    profile: v.profile ? parsePublicProfile(v.profile) : null,
  };
}
export function parseOwnCommunity(raw: unknown): OwnCommunity {
  const v = object(raw);
  const p = v.profile ? object(v.profile) : null;
  if (
    !Array.isArray(v.creations) ||
    v.creations.length > 20 ||
    (p &&
      (typeof p.visible !== "boolean" ||
        typeof p.moderated !== "boolean" ||
        !Number.isSafeInteger(p.revision) ||
        Number(p.revision) < 0))
  )
    throw new CommunityError("Votre profil n’a pas pu être lu.");
  return {
    profile: p
      ? {
          ...parsePublicProfile(p),
          visible: p.visible as boolean,
          moderated: p.moderated as boolean,
          revision: p.revision as number,
        }
      : null,
    creations: v.creations.map((raw) => {
      const c = object(raw);
      if (
        !isPublicId(c.id) ||
        typeof c.projectId !== "string" ||
        c.projectId.length > 80 ||
        typeof c.moderated !== "boolean"
      )
        throw new CommunityError("Publication invalide.");
      return {
        id: c.id,
        projectId: c.projectId,
        title: text(c.title, 48),
        moderated: c.moderated,
      };
    }),
  };
}
