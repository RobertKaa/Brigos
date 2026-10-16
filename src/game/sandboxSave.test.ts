import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { openDB } from "idb";
import {
  adminCommand,
  buildRecipe,
  createGame,
  inventoryCount,
  reservedCount,
} from "./engine";
import {
  importSave,
  parseSave,
  parseSaveResult,
  SAVE_IMPORT_MAX_BYTES,
} from "./save";
import {
  createSandboxProject,
  placeSandboxBrigo,
  removeSandboxBrigo,
  deleteSandboxProject,
  parseSandboxProjects,
  SANDBOX_MAX_PROJECTS,
  SANDBOX_MAX_PLACEMENTS,
} from "./sandbox";
import type { SandboxProject } from "./sandbox";
import { CURRENT_SAVE_VERSION } from "./releaseVersion";
import { connectRepository, SaveConflict } from "./storage";
import type { Repository } from "./storage";

const BRIGO = "brick-1x1:coral";
const CANDIDATE = { brigoId: BRIGO, x: 0, y: 0, z: 0, rotation: 0 as const };
function placedState() {
  const state = createSandboxProject(
    adminCommand(
      createGame(),
      { type: "piece", brigoId: BRIGO, amount: 2 },
      true,
    ),
  );
  return placeSandboxBrigo(state, state.sandboxProjects![0].id, CANDIDATE);
}

describe("sauvegarde des créations libres", () => {
  it("exporte et importe sans créditer deux fois les pièces réservées", () => {
    const state = placedState();
    const imported = importSave(JSON.stringify(state));
    expect(imported).toEqual(state);
    expect(imported.inventory[BRIGO]).toBe(1);
    expect(reservedCount(imported)).toBe(1);
    expect(parseSave(imported)).toEqual(imported);
    const restored = deleteSandboxProject(
      imported,
      imported.sandboxProjects![0].id,
    );
    expect(restored.inventory[BRIGO]).toBe(2);
    expect(reservedCount(restored)).toBe(0);
  });

  it("migre la v7 sans toucher les plans, les pièces, l’XP ou les marqueurs du carnet", () => {
    const migratedAt = Date.now();
    const built = buildRecipe(
      adminCommand(createGame(), { type: "recipe", recipeId: "totem" }, true),
      "totem",
      migratedAt,
    );
    const {
      sandboxProjects: _notYetAvailable,
      production: _futureProduction,
      ...previous
    } = built;
    const result = parseSaveResult({ ...previous, version: 7 }, migratedAt);
    expect(result.state).toEqual({ ...built, version: CURRENT_SAVE_VERSION });
    expect(result.migration).toBeUndefined();
    expect(result.state.sandboxProjects).toEqual([]);
    expect(parseSave(result.state)).toEqual(result.state);
    expect(() => parseSave({ ...placedState(), version: 7 })).toThrow(
      "incompatibles",
    );
  });

  it("refuse une v8 privée de ses créations au lieu de perdre les pièces réservées", () => {
    const { sandboxProjects: _stripped, ...stripped } = placedState();
    expect(() => parseSave(stripped)).toThrow("création libre");
    expect(() => parseSave({ ...createGame(), sandboxProjects: null })).toThrow(
      "création libre",
    );
  });

  it("un lecteur v7 rejette la v8 avant de pouvoir perdre ses projets", async () => {
    const state = placedState();
    vi.resetModules();
    vi.doMock("./releaseVersion", () => ({ CURRENT_SAVE_VERSION: 7 }));
    try {
      const oldReader = await import("./save");
      expect(() => oldReader.parseSave(state)).toThrow("version plus récente");
    } finally {
      vi.doUnmock("./releaseVersion");
      vi.resetModules();
    }
  });

  it("refuse les références non découvertes et les duplications de projets ou placements", () => {
    const state = placedState();
    const project = state.sandboxProjects![0];
    expect(() =>
      parseSave({ ...state, inventory: {}, discovered: [] }),
    ).toThrow("album incomplet");
    expect(() =>
      parseSave({ ...state, sandboxProjects: [project, project] }),
    ).toThrow("double");
    expect(() =>
      parseSave({
        ...state,
        sandboxProjects: [project, { ...project, id: "another-project" }],
      }),
    ).toThrow("double");
    expect(() =>
      parseSave({
        ...state,
        sandboxProjects: [
          {
            ...project,
            placements: [
              ...project.placements,
              { ...project.placements[0], id: "another-piece" },
            ],
          },
        ],
      }),
    ).toThrow("superposés");
  });

  it.each([
    { name: " " },
    { name: "x".repeat(49) },
    { name: "multiligne\nnom" },
    { name: "dissimulé\u202enom" },
    { name: " espace " },
    { id: "../project" },
    { createdAt: "incorrect" },
    { updatedAt: "1900-01-01T00:00:00.000Z" },
    { placements: null },
    { placements: new Array(501).fill({}) },
  ])("rejette un projet mal formé %j", (patch) => {
    const state = placedState();
    expect(() =>
      parseSave({
        ...state,
        sandboxProjects: [{ ...state.sandboxProjects![0], ...patch }],
      }),
    ).toThrow("création libre");
  });

  it.each([
    { id: "<script>" },
    { brigoId: "__proto__" },
    { brigoId: "constructor" },
    { x: -1 },
    { x: 24 },
    { z: 34 },
    { y: 0.5 },
    { z: "0" },
    { rotation: 45 },
    { rotation: "90" },
    { x: NaN },
  ])("rejette un placement mal formé %j", (patch) => {
    const state = placedState();
    const project = state.sandboxProjects![0];
    expect(() =>
      parseSave({
        ...state,
        sandboxProjects: [
          { ...project, placements: [{ ...project.placements[0], ...patch }] },
        ],
      }),
    ).toThrow("création libre");
  });

  it("garde les noms comme du texte et élimine tous les champs inconnus", () => {
    const state = placedState();
    const project = state.sandboxProjects![0];
    const restored = parseSave({
      ...state,
      sandboxProjects: [
        {
          ...project,
          name: "<b>Mon idée</b>",
          markup: "<svg onload=bad()>",
          placements: [
            {
              ...project.placements[0],
              material: "foreign",
              extra: { code: "bad()" },
            },
          ],
        },
      ],
    });
    expect(restored.sandboxProjects![0].name).toBe("<b>Mon idée</b>");
    expect(restored.sandboxProjects![0]).not.toHaveProperty("markup");
    expect(restored.sandboxProjects![0].placements[0]).toEqual(
      project.placements[0],
    );
    expect(() => parseSandboxProjects(new Array(21).fill(project))).toThrow(
      "liste",
    );
  });

  it("réimporte un export au plafond de 20 créations et 10 000 placements", () => {
    const timestamp = "2026-10-15T00:00:00.000Z";
    const projects: SandboxProject[] = Array.from(
      { length: SANDBOX_MAX_PROJECTS },
      (_, p) => ({
        id: `project-${p}`,
        name: `Création au plafond ${p}`,
        createdAt: timestamp,
        updatedAt: timestamp,
        placements: Array.from({ length: SANDBOX_MAX_PLACEMENTS }, (_, n) => ({
          ...CANDIDATE,
          id: `piece-${p}-${n}`.padEnd(36, "a"),
          x: n % 24,
          y: Math.floor(n / 24),
        })),
      }),
    );
    const state = {
      ...createGame(),
      discovered: [BRIGO],
      sandboxProjects: projects,
    };
    const exported = JSON.stringify(state);
    expect(exported.length).toBeGreaterThan(1_000_000);
    expect(new TextEncoder().encode(exported).length).toBeLessThan(
      SAVE_IMPORT_MAX_BYTES,
    );
    const imported = importSave(exported);
    expect(imported).toEqual(state);
    expect(reservedCount(imported)).toBe(10_000);
    expect(inventoryCount(imported)).toBe(0);
  });
});

describe("transactions des créations libres", () => {
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

  it("migre deux chargements v7 une seule fois et protège l’ancien onglet", async () => {
    const first = await connect();
    const second = await connect();
    const db = await openDB("brigo-club", 1);
    const {
      sandboxProjects: _notYetAvailable,
      production: _futureProduction,
      ...old
    } = createGame();
    const source = { ...old, version: 7 };
    await db.put("saves", { revision: 4, state: source }, "player");
    db.close();
    const results = await Promise.all([first.load(), second.load()]);
    expect(results.map((result) => result.revision)).toEqual([5, 5]);
    expect(results[0].state.version).toBe(CURRENT_SAVE_VERSION);
    expect(results[1].state.sandboxProjects).toEqual([]);
    await expect(
      first.commit(source as ReturnType<typeof createGame>, 4),
    ).rejects.toBeInstanceOf(SaveConflict);
    expect((await second.load()).revision).toBe(5);
  });

  it("deux onglets ne réservent pas le même dernier Brigo ni ne le restituent deux fois", async () => {
    const first = await connect();
    const second = await connect();
    const initial = createSandboxProject(
      adminCommand(
        createGame(),
        { type: "piece", brigoId: BRIGO, amount: 1 },
        true,
      ),
    );
    await first.commit(initial, 0);
    const firstSnapshot = await first.load();
    const secondSnapshot = await second.load();
    const id = initial.sandboxProjects![0].id;
    const results = await Promise.allSettled([
      first.commit(
        placeSandboxBrigo(firstSnapshot.state, id, CANDIDATE),
        firstSnapshot.revision,
      ),
      second.commit(
        placeSandboxBrigo(secondSnapshot.state, id, { ...CANDIDATE, x: 1 }),
        secondSnapshot.revision,
      ),
    ]);
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.status === "rejected"),
    ).toHaveLength(1);
    const placed = await first.load();
    expect(placed.state.inventory[BRIGO]).toBeUndefined();
    expect(reservedCount(placed.state)).toBe(1);
    const placementId = placed.state.sandboxProjects![0].placements[0].id;
    const returned = removeSandboxBrigo(placed.state, id, placementId);
    const returns = await Promise.allSettled([
      first.commit(returned, placed.revision),
      second.commit(returned, placed.revision),
    ]);
    expect(
      returns.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    const latest = await second.load();
    expect(latest.state.inventory[BRIGO]).toBe(1);
    expect(latest.state.sandboxProjects![0].placements).toEqual([]);
  });
});
