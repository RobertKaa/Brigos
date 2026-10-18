import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { openDB } from "idb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  adminCommand,
  buildRecipe,
  createGame,
  MAX_VALUE,
  reservedCount,
} from "./engine";
import {
  createSandboxProject,
  deleteSandboxProject,
  moveSandboxBrigo,
  placeSandboxBrigo,
  removeSandboxBrigo,
} from "./sandbox";
import {
  emptyFreeGallery,
  exposeSandboxProject,
  featureFreeExhibit,
  parseFreeGallery,
  sandboxGeometryFingerprint,
  withoutFreeExhibit,
} from "./freeGallery";
import { applyGameCommand, parseGameCommand } from "./commands";
import { importSave, parseSave, parseSaveResult } from "./save";
import { connectRepository, SaveConflict } from "./storage";
import type { Repository } from "./storage";

const NOW = Date.parse("2026-10-18T12:00:00Z");
const BRIGO = "brick-1x1:coral";
const presentation = {
  description: "Un jardin.\nUne idée.",
  rotation: 90 as const,
  backgroundId: "ink" as const,
};
function builtProject() {
  const state = createSandboxProject(
    { ...createGame(), inventory: { [BRIGO]: 2 }, discovered: [BRIGO] },
    "Mon jardin",
    NOW,
  );
  return placeSandboxBrigo(
    state,
    state.sandboxProjects![0].id,
    { brigoId: BRIGO, x: 1, y: 1, z: 0, rotation: 0 },
    NOW,
  );
}
function exposed() {
  const state = builtProject();
  const id = state.sandboxProjects![0].id;
  return featureFreeExhibit(
    exposeSandboxProject(state, id, "Mon jardin", presentation, NOW),
    id,
  );
}

describe("galerie personnelle et conservation du stock", () => {
  it("expose et renomme atomiquement sans gains ni nouvelle réservation", () => {
    const state = builtProject();
    const before = structuredClone(state);
    const id = state.sandboxProjects![0].id;
    const next = exposeSandboxProject(
      state,
      id,
      "  Jardin corail  ",
      presentation,
      NOW,
    );
    expect(state).toEqual(before);
    expect(next.sandboxProjects![0].name).toBe("Jardin corail");
    expect(next.inventory).toEqual(state.inventory);
    expect(reservedCount(next)).toBe(reservedCount(state));
    expect({
      ...next,
      sandboxProjects: state.sandboxProjects,
      freeGallery: state.freeGallery,
    }).toEqual(state);
    expect(next.freeGallery!.exhibits).toHaveLength(1);
    expect(
      exposeSandboxProject(next, id, "Jardin corail", presentation, NOW)
        .freeGallery!.exhibits,
    ).toHaveLength(1);
  });
  it("garde une seule vedette et retirer une exposition conserve le projet", () => {
    let state = exposed();
    const first = state.sandboxProjects![0].id;
    state = createSandboxProject(state, "Deuxième", NOW);
    const second = state.sandboxProjects![1].id;
    state = placeSandboxBrigo(
      state,
      second,
      { brigoId: BRIGO, x: 0, y: 0, z: 0, rotation: 0 },
      NOW,
    );
    state = exposeSandboxProject(state, second, "Deuxième", presentation, NOW);
    state = featureFreeExhibit(state, second);
    expect(state.freeGallery!.featuredProjectId).toBe(second);
    expect(
      withoutFreeExhibit(state, first).freeGallery!.featuredProjectId,
    ).toBe(second);
    const hidden = withoutFreeExhibit(state, second);
    expect(hidden.freeGallery!.featuredProjectId).toBeNull();
    expect(hidden.inventory).toEqual(state.inventory);
    expect(hidden.sandboxProjects).toEqual(state.sandboxProjects);
    expect(() => featureFreeExhibit(hidden, second)).toThrow("Exposez");
  });
  it("refuse un projet vide, étranger ou des données de présentation malveillantes", () => {
    const empty = createSandboxProject(createGame(), "Vide", NOW);
    expect(() =>
      exposeSandboxProject(
        empty,
        empty.sandboxProjects![0].id,
        "Vide",
        presentation,
        NOW,
      ),
    ).toThrow("au moins un");
    expect(() =>
      exposeSandboxProject(empty, "other-account", "Autre", presentation, NOW),
    ).toThrow("n’existe");
    const state = builtProject();
    for (const patch of [
      { rotation: 45 },
      { backgroundId: "https://evil.example" },
      { description: "x".repeat(241) },
      { description: "secret\u202etext" },
    ]) {
      expect(() =>
        exposeSandboxProject(
          state,
          state.sandboxProjects![0].id,
          "Jardin",
          { ...presentation, ...patch } as typeof presentation,
          NOW,
        ),
      ).toThrow();
    }
  });
  it("détecte les changements de géométrie sans dépendre des noms, ids de pose ou de leur ordre", () => {
    let state = builtProject();
    const id = state.sandboxProjects![0].id;
    state = placeSandboxBrigo(
      state,
      id,
      { brigoId: BRIGO, x: 3, y: 3, z: 0, rotation: 0 },
      NOW,
    );
    const project = state.sandboxProjects![0];
    const hash = sandboxGeometryFingerprint(project);
    expect(
      sandboxGeometryFingerprint({
        ...project,
        name: "Autre",
        placements: [...project.placements]
          .reverse()
          .map((p) => ({ ...p, id: crypto.randomUUID() })),
      }),
    ).toBe(hash);
    const moved = moveSandboxBrigo(
      state,
      id,
      project.placements[0].id,
      { ...project.placements[0], x: 5 },
      NOW,
    );
    expect(sandboxGeometryFingerprint(moved.sandboxProjects![0])).not.toBe(
      hash,
    );
  });
  it("retire exposition et vedette avec la dernière pièce ou le démontage exact", () => {
    const state = exposed(),
      project = state.sandboxProjects![0];
    const removed = removeSandboxBrigo(
      state,
      project.id,
      project.placements[0].id,
      NOW,
    );
    expect(removed.freeGallery).toEqual(emptyFreeGallery());
    expect(removed.sandboxProjects).toHaveLength(1);
    expect(removed.inventory[BRIGO]).toBe(2);
    const dismantled = deleteSandboxProject(state, project.id);
    expect(dismantled.freeGallery).toEqual(emptyFreeGallery());
    expect(dismantled.sandboxProjects).toEqual([]);
    expect(dismantled.inventory[BRIGO]).toBe(2);
    const full = { ...state, inventory: { [BRIGO]: MAX_VALUE } };
    const original = structuredClone(full);
    expect(() => deleteSandboxProject(full, project.id)).toThrow("plein");
    expect(() =>
      removeSandboxBrigo(full, project.id, project.placements[0].id, NOW),
    ).toThrow("plein");
    expect(full).toEqual(original);
  });
  it("passe les nouvelles actions par la frontière stricte des commandes", () => {
    const state = builtProject(),
      id = state.sandboxProjects![0].id;
    const command = {
      type: "expose-project" as const,
      projectId: id,
      name: "Mon jardin",
      ...presentation,
    };
    const next = applyGameCommand(state, command, NOW).state;
    expect(next.freeGallery!.exhibits).toHaveLength(1);
    expect(next.coins).toBe(state.coins);
    for (const patch of [
      { coins: 99 },
      { confirmedGeometry: "forged" },
      { rotation: "90" },
      { name: "" },
    ])
      expect(() => parseGameCommand({ ...command, ...patch })).toThrow();
    expect(
      parseGameCommand({ type: "feature-exhibit", projectId: null }),
    ).toEqual({ type: "feature-exhibit", projectId: null });
  });
});

describe("sauvegardes v11 de la galerie", () => {
  it("réimporte 20 expositions de 500 Brigos sans agrandir la limite de fichier ni perdre de réservation", () => {
    const brigoId = "plate-6x6:blue";
    let state = {
      ...createGame(),
      inventory: {},
      discovered: [brigoId],
      sandboxProjects: Array.from({ length: 20 }, (_, projectIndex) => ({
        id: `dense-${projectIndex}`,
        name: `Projet ${projectIndex}`,
        createdAt: new Date(NOW).toISOString(),
        updatedAt: new Date(NOW).toISOString(),
        placements: Array.from({ length: 500 }, (_, index) => ({
          id: `p-${projectIndex}-${index}`,
          brigoId,
          x: (index % 4) * 6,
          y: (Math.floor(index / 4) % 4) * 6,
          z: Math.floor(index / 16),
          rotation: 0 as const,
        })),
      })),
    };
    for (const project of state.sandboxProjects)
      state = exposeSandboxProject(
        state,
        project.id,
        project.name,
        presentation,
        NOW,
      ) as typeof state;
    const imported = importSave(JSON.stringify(state));
    expect(imported.freeGallery!.exhibits).toHaveLength(20);
    expect(imported.sandboxProjects).toEqual(state.sandboxProjects);
    expect(reservedCount(imported)).toBe(10_000);
    expect(imported.inventory).toEqual({});
  });
  it("migre la v10 sans toucher aux constructions, revenus, pièces ou quêtes", () => {
    const built = buildRecipe(
      adminCommand(builtProject(), { type: "recipe", recipeId: "totem" }, true),
      "totem",
      NOW,
    );
    const { freeGallery: _future, ...previous } = built;
    const source = { ...previous, version: 10 };
    const before = structuredClone(source);
    const next = parseSaveResult(source, NOW).state;
    expect(next).toEqual({
      ...built,
      version: 11,
      freeGallery: emptyFreeGallery(),
    });
    expect(source).toEqual(before);
    expect(parseSave(next)).toEqual(next);
  });
  it("exporte et importe la présentation, la vedette et les réservations", () => {
    const state = exposed();
    expect(importSave(JSON.stringify(state))).toEqual(state);
    expect(() => parseSave({ ...state, version: 10 })).toThrow("incompatible");
    const { freeGallery: _required, ...stripped } = state;
    expect(() => parseSave(stripped)).toThrow("galerie libre manquante");
    expect(() => parseSave({ ...state, freeGallery: null })).toThrow("galerie");
  });
  it("refuse doublons, références absentes, vedettes orphelines, angles et champs surdimensionnés", () => {
    const state = exposed(),
      gallery = state.freeGallery!,
      exhibit = gallery.exhibits[0];
    for (const invalid of [
      { ...gallery, exhibits: [exhibit, exhibit] },
      { ...gallery, exhibits: [{ ...exhibit, projectId: "other-account" }] },
      { ...gallery, featuredProjectId: "missing" },
      { ...gallery, exhibits: Array(21).fill(exhibit) },
      ...[
        { confirmedGeometry: "forged" },
        { description: " padded " },
        { description: "x".repeat(241) },
        { rotation: -90 },
        { backgroundId: "aurora" },
      ].map((patch) => ({ ...gallery, exhibits: [{ ...exhibit, ...patch }] })),
    ])
      expect(() => parseFreeGallery(invalid, state.sandboxProjects!)).toThrow(
        "galerie",
      );
    expect(
      parseFreeGallery(
        {
          ...gallery,
          injected: "ignored",
          exhibits: [{ ...exhibit, markup: "<script>" }],
        },
        state.sandboxProjects!,
      ),
    ).toEqual(gallery);
  });
  it("un lecteur v10 refuse la v11 avant de pouvoir effacer les présentations", async () => {
    const state = exposed();
    vi.resetModules();
    vi.doMock("./releaseVersion", () => ({ CURRENT_SAVE_VERSION: 10 }));
    try {
      const old = await import("./save");
      expect(() => old.parseSave(state)).toThrow("version plus récente");
    } finally {
      vi.doUnmock("./releaseVersion");
      vi.resetModules();
    }
  });
});

describe("transactions de galerie", () => {
  const connections: Repository[] = [];
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
  });
  afterEach(() => {
    connections.splice(0).forEach((connection) => connection.close());
  });
  const connect = async () => {
    const connection = await connectRepository();
    connections.push(connection);
    return connection;
  };
  it("persiste une seule migration depuis la v10 quand deux onglets chargent", async () => {
    const first = await connect(),
      second = await connect();
    const db = await openDB("brigo-club", 1);
    const { freeGallery: _future, ...previous } = builtProject();
    await db.put(
      "saves",
      { revision: 4, state: { ...previous, version: 10 } },
      "player",
    );
    db.close();
    const [a, b] = await Promise.all([first.load(), second.load()]);
    expect(a).toEqual(b);
    expect(a.revision).toBe(5);
    expect(a.state.version).toBe(11);
    expect(await first.load()).toEqual(a);
  });
  it("refuse une présentation obsolète et conserve les mises à jour après rechargement", async () => {
    const first = await connect(),
      second = await connect();
    await first.commit(builtProject(), 0);
    const a = await first.load(),
      b = await second.load(),
      id = a.state.sandboxProjects![0].id;
    const next = exposeSandboxProject(a.state, id, "Jardin", presentation, NOW);
    await first.commit(next, a.revision);
    await expect(
      second.commit(
        exposeSandboxProject(b.state, id, "Obsolète", presentation, NOW),
        b.revision,
      ),
    ).rejects.toBeInstanceOf(SaveConflict);
    expect((await second.load()).state).toEqual(next);
  });
});
