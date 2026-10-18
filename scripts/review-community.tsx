/** The actual GameApp and Community screens, with an in-memory test service.
 * No account session, storage access, network request or player save. */
import { useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { GameApp } from "../src/App";
import { createGame } from "../src/game/engine";
import { applyGameCommand } from "../src/game/commands";
import { createSandboxProject, placeSandboxBrigo } from "../src/game/sandbox";
import { exposeSandboxProject } from "../src/game/freeGallery";
import { CommunityError } from "../src/community";
import type {
  CommunityApi,
  OwnCommunity,
  PublicCreation,
  PublicProfile,
} from "../src/community";
import type { Game } from "../src/screens/types";
import "@fontsource-variable/dm-sans";
import "@fontsource-variable/outfit";
import "../src/styles.css";
import "../src/accessibility.css";
import "../src/studio-theme.css";
if (!import.meta.env.DEV) throw new Error("Aperçu réservé au développement.");
const scenario = new URLSearchParams(location.search).get("scenario");
const publicId = (i: number) =>
  `30000000-0000-4000-8000-${String(i).padStart(12, "0")}`;
const NOW = "2026-10-18T12:00:00Z";
let initial = createSandboxProject(
  {
    ...createGame(),
    inventory: {
      "plate-4x4:ivory": 1,
      "brick-2x2:coral": 2,
      "slope-2x2:coral": 2,
    },
    discovered: ["plate-4x4:ivory", "brick-2x2:coral", "slope-2x2:coral"],
  },
  "Le petit belvédère",
);
const projectId = initial.sandboxProjects![0].id;
for (const p of [
  { brigoId: "plate-4x4:ivory", x: 10, y: 10, z: 0, rotation: 0 as const },
  { brigoId: "brick-2x2:coral", x: 10, y: 10, z: 1, rotation: 0 as const },
  { brigoId: "brick-2x2:coral", x: 12, y: 10, z: 1, rotation: 0 as const },
  { brigoId: "slope-2x2:coral", x: 10, y: 10, z: 4, rotation: 0 as const },
  { brigoId: "slope-2x2:coral", x: 12, y: 10, z: 4, rotation: 0 as const },
])
  initial = placeSandboxBrigo(initial, projectId, p);
initial = exposeSandboxProject(initial, projectId, "Le petit belvédère", {
  description: "Un refuge corail au milieu des idées.",
  rotation: 0,
  backgroundId: "paper",
});
function Review() {
  const [state, setState] = useState(initial);
  const current = useRef(state);
  current.current = state;
  const [notice, setNotice] = useState<Game["notice"]>(null);
  const api = useMemo<CommunityApi>(() => {
    const profiles: PublicProfile[] = [
      "TreborKaa",
      "Papier Lune",
      "Nacre",
      "Sable chaud",
      "Atelier Mina",
      "Dune",
      "Corail",
    ].map((pseudo, i) => ({
      id: publicId(i + 1),
      pseudo,
      bio:
        i === 0
          ? "Des jardins, des abris et beaucoup d’idées à assembler."
          : "Un petit atelier ouvert sur l’imaginaire.",
      avatar: (["coral", "mint", "gold"] as const)[i % 3],
      publishedCount: 1,
      featuredCreationId: publicId(i + 100),
    }));
    let creations: PublicCreation[] = profiles.map((author, i) => ({
      id: publicId(i + 100),
      title: [
        "Le petit belvédère",
        "Refuge de papier",
        "Au bord du jardin",
        "La halte du soir",
        "Un abri pour demain",
        "À l’ombre des toits",
        "Point de départ",
      ][i],
      description:
        "Une création libre, construite avec les Brigos de sa collection.",
      rotation: ([0, 90, 180, 270] as const)[i % 4],
      backgroundId: i % 3 === 1 ? "ink" : "paper",
      placements: initial.sandboxProjects![0].placements,
      publishedAt: NOW,
      author,
    }));
    let own: OwnCommunity = {
      profile: {
        ...profiles[0],
        visible: scenario !== "private",
        moderated: false,
        revision: 0,
      },
      creations: [],
    };
    // The fixture's personal project starts private, independently of other
    // fictional profiles. Publication below is always a separate interaction.
    creations = creations.filter((c) => c.author.id !== profiles[0].id);
    profiles[0] = {
      ...profiles[0],
      publishedCount: 0,
      featuredCreationId: null,
    };
    own.profile = {
      ...profiles[0],
      visible: scenario !== "private",
      moderated: false,
      revision: 0,
    };
    return {
      async request(action, input = {}) {
        if (scenario === "error")
          throw new CommunityError(
            "La communauté est momentanément indisponible.",
          );
        if (scenario === "loading") return new Promise(() => {});
        const page = Number(input.page ?? 1),
          q = String(input.q ?? "").toLowerCase();
        const visible = () =>
          profiles.filter(
            (p) => p.id !== profiles[0].id || own.profile?.visible,
          );
        const publicCreations = () =>
          creations.filter((c) => visible().some((p) => p.id === c.author.id));
        if (action === "mine") return structuredClone(own);
        if (action === "save-profile") {
          if (input.expectedRevision !== own.profile?.revision)
            throw new CommunityError(
              "Votre profil a changé. Actualisez-le avant d’enregistrer.",
              "PROFILE_CONFLICT",
            );
          own.profile = {
            ...own.profile!,
            ...input,
            revision: own.profile!.revision + 1,
          } as NonNullable<OwnCommunity["profile"]>;
          profiles[0] = { ...own.profile };
          creations = creations.map((c) =>
            c.author.id === profiles[0].id ? { ...c, author: profiles[0] } : c,
          );
          return structuredClone(own);
        }
        if (action === "publish") {
          if (!own.profile?.visible)
            throw new CommunityError(
              "Rendez votre profil visible avant de publier.",
            );
          const p = current.current.sandboxProjects!.find(
            (p) => p.id === input.projectId,
          )!;
          const id = publicId(999);
          creations = creations.filter((c) => c.id !== id);
          creations.unshift({
            ...creations[0],
            id,
            title: p.name,
            placements: p.placements,
            author: profiles[0],
          });
          own.creations = [
            { id, projectId: p.id, title: p.name, moderated: false },
          ];
          own.profile.publishedCount = 1;
          profiles[0].publishedCount = 1;
          return { ok: true, id };
        }
        if (action === "unpublish") {
          creations = creations.filter((c) => c.id !== input.id);
          own.creations = [];
          own.profile!.publishedCount = 0;
          profiles[0].publishedCount = 0;
          return { ok: true };
        }
        if (action === "report") return { ok: true };
        if (action === "creation") {
          const creation = publicCreations().find((c) => c.id === input.id);
          if (!creation || scenario === "hidden")
            throw new CommunityError(
              "Ce profil ou cette création n’est plus disponible.",
            );
          return { creation };
        }
        if (action === "players") {
          const items =
            scenario === "empty"
              ? []
              : visible().filter((p) => p.pseudo.toLowerCase().includes(q));
          return {
            items: items.slice((page - 1) * 12, page * 12),
            hasMore: items.length > page * 12,
            profile: null,
          };
        }
        const profile =
          action === "profile"
            ? visible().find((p) => p.id === input.id)
            : null;
        if (action === "profile" && (!profile || scenario === "hidden"))
          throw new CommunityError(
            "Ce profil ou cette création n’est plus disponible.",
          );
        const items =
          scenario === "empty"
            ? []
            : publicCreations().filter(
                (c) =>
                  (!profile || c.author.id === profile.id) &&
                  (c.title.toLowerCase().includes(q) ||
                    c.author.pseudo.toLowerCase().includes(q)),
              );
        return {
          items: items.slice((page - 1) * 6, page * 6),
          hasMore: items.length > page * 6,
          profile,
        };
      },
    };
  }, []);
  const game: Game = {
    state,
    mode: scenario === "guest" ? "local" : "connected",
    ready: true,
    busy: false,
    persistent: true,
    notice,
    notify: (message, kind = "success") =>
      setNotice({ id: Date.now(), message, kind }),
    act: async (command) => {
      try {
        const applied = applyGameCommand(current.current, command, Date.now());
        current.current = applied.state;
        setState(applied.state);
        return {
          state: applied.state,
          revision: 1,
          serverTime: NOW,
          result: applied.result,
          replayed: false,
        };
      } catch {
        return null;
      }
    },
  };
  return (
    <>
      <p
        style={{
          padding: "10px 20px",
          background: "var(--studio-lemon)",
          color: "#242320",
          fontSize: 13,
          textAlign: "center",
        }}
      >
        Aperçu isolé · joueurs fictifs · aucune sauvegarde ni publication réelle
      </p>
      <GameApp
        game={game}
        communityApi={api}
        onOpenAccount={() =>
          setNotice({
            id: Date.now(),
            kind: "success",
            message: "Compte fictif de vérification ; aucune connexion réelle.",
          })
        }
      />
    </>
  );
}
if (!location.hash)
  history.replaceState(
    null,
    "",
    `${location.pathname}${location.search}#community`,
  );
const root = createRoot(document.getElementById("root")!);
root.render(<Review />);
if (import.meta.hot) import.meta.hot.dispose(() => root.unmount());
