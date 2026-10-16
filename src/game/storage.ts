import { openDB } from "idb";
import type { DBSchema } from "idb";
import { createGame, GameError } from "./engine";
import type { GameState } from "./engine";
import { parseSaveResult } from "./save";

interface SaveDatabase extends DBSchema {
  saves: { key: string; value: { revision: number; state: GameState } };
}
export class SaveConflict extends GameError {}
export async function connectRepository() {
  const database = await openDB<SaveDatabase>("brigo-club", 1, {
    upgrade(db) {
      db.createObjectStore("saves");
    },
  });
  return {
    async load() {
      // Serialize migrations with actions in other tabs. A migrated snapshot is
      // persisted immediately so its exact refund and notice happen only once.
      const transaction = database.transaction("saves", "readwrite");
      const saved = await transaction.store.get("player");
      if (!saved) {
        await transaction.done;
        return { revision: 0, state: createGame() };
      }
      if (!Number.isSafeInteger(saved.revision) || saved.revision < 1)
        throw new GameError("Sauvegarde locale illisible.");
      const { state, migration } = parseSaveResult(saved.state);
      // A retained snapshot can lack an entry for an existing construction.
      // Persist its first observation in this same serialized transaction;
      // otherwise every reload would restart that construction's first cycle.
      const productionInitialized =
        saved.state.production?.observedAt !== state.production?.observedAt ||
        Object.keys(saved.state.production?.entries ?? {}).length !==
          Object.keys(state.production?.entries ?? {}).length;
      const needsMigration =
        saved.state.version !== state.version ||
        saved.state.planRevision !== state.planRevision ||
        productionInitialized;
      const revision = saved.revision + (needsMigration ? 1 : 0);
      if (!Number.isSafeInteger(revision))
        throw new GameError("Révision de sauvegarde hors limite.");
      if (needsMigration)
        await transaction.store.put({ revision, state }, "player");
      await transaction.done;
      return {
        revision,
        state,
        ...(migration && {
          migration,
          ...(migration.refundedConstructions > 0 && {
            migratedConstructions: migration.refundedConstructions,
          }),
        }),
      };
    },
    async commit(state: GameState, expectedRevision: number) {
      if (
        !Number.isSafeInteger(expectedRevision) ||
        expectedRevision < 0 ||
        expectedRevision >= Number.MAX_SAFE_INTEGER
      )
        throw new GameError("Révision de sauvegarde hors limite.");
      const transaction = database.transaction("saves", "readwrite");
      const previous = await transaction.store.get("player");
      if ((previous?.revision ?? 0) !== expectedRevision) {
        await transaction.done;
        throw new SaveConflict(
          "Votre partie a changé dans un autre onglet. Elle a été actualisée ; réessayez votre action.",
        );
      }
      const revision = expectedRevision + 1;
      await transaction.store.put({ revision, state }, "player");
      await transaction.done;
      return revision;
    },
    close() {
      database.close();
    },
  };
}
export type Repository = Awaited<ReturnType<typeof connectRepository>>;
