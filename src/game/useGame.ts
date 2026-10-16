import { useCallback, useEffect, useRef, useState } from "react";
import { createGame, GameError } from "./engine";
import type { GameState } from "./engine";
import { connectRepository, SaveConflict } from "./storage";
import type { Repository } from "./storage";
import { parseSave, parseSaveResult } from "./save";
import type { SaveMigration } from "./save";
import { CURRENT_SAVE_VERSION } from "./releaseVersion";
import { syncEngagement } from "./engagement";
import { observeProduction } from "./production";
import { applyGameCommand } from "./commands";
import type { GameCommand, CommandResponse, GameSnapshot } from "./commands";
import {
  ConnectedRepository,
  RemoteGameError,
  supabaseGameTransport,
} from "./remote";
import { getSupabaseClient } from "../auth/client";

export const isCurrentReleaseState = (state: GameState): boolean =>
  state.version === CURRENT_SAVE_VERSION && state.planRevision === 1;

/** A retained React snapshot must be loaded/migrated before using new plans. */
export function applyCurrentReleaseAction(
  state: GameState,
  transform: (current: GameState) => GameState,
): GameState {
  if (!isCurrentReleaseState(state))
    throw new GameError(
      "Votre partie est en cours d’actualisation. Patientez un instant.",
    );
  const next = transform(state);
  if (!isCurrentReleaseState(next))
    throw new GameError("L’action utilise une version de partie incompatible.");
  return next;
}

function migrationMessage(migration: SaveMigration): string {
  const { refundedConstructions, returnedPieces, clearedGoal } = migration;
  return refundedConstructions
    ? `Plans revus : ${refundedConstructions} création${refundedConstructions > 1 ? "s" : ""} démontée${refundedConstructions > 1 ? "s" : ""}, ${returnedPieces} Brigos restitués à l’identique. Votre XP reflète les créations restantes.${clearedGoal ? " Le plan de votre objectif a été retiré." : ""}`
    : "Le plan de votre objectif a été retiré. Choisissez un nouveau projet dans l’atelier.";
}

export interface Notice {
  id: number;
  message: string;
  kind: "success" | "error";
}
export function useGame({
  userId = null,
  authReady = true,
}: { userId?: string | null; authReady?: boolean } = {}) {
  const identity = !authReady ? "auth-loading" : (userId ?? "local");
  const mode = userId ? ("connected" as const) : ("local" as const);
  const [state, setState] = useState(createGame);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [persistent, setPersistent] = useState(true);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loadedIdentity, setLoadedIdentity] = useState("");
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [serverTime, setServerTime] = useState<string | null>(null);
  const stateRef = useRef(state);
  const readyRef = useRef(false);
  const locked = useRef(false);
  const generation = useRef(0);
  const repository = useRef<Repository | null>(null);
  const connected = useRef<ConnectedRepository | null>(null);
  const latestIdentity = useRef(identity);
  latestIdentity.current = identity;
  const clock = useRef<{ server: number; monotonic: number } | null>(null);
  const revision = useRef(0);
  const channel = useRef<BroadcastChannel | null>(null);
  const notify = useCallback(
    (message: string, kind: Notice["kind"] = "success") => {
      setNotice({ id: Date.now(), message, kind });
    },
    [],
  );
  const applyState = useCallback((next: GameState) => {
    stateRef.current = next;
    setState(next);
  }, []);
  const now = useCallback(() => {
    const anchor = clock.current;
    return anchor
      ? Math.round(anchor.server + performance.now() - anchor.monotonic)
      : Date.now();
  }, [identity, serverTime]);
  const acceptSnapshot = useCallback(
    (snapshot: GameSnapshot) => {
      revision.current = snapshot.revision;
      clock.current = {
        server: Date.parse(snapshot.serverTime),
        monotonic: performance.now(),
      };
      setServerTime(snapshot.serverTime);
      applyState(snapshot.state);
      setConnectionError(null);
    },
    [applyState],
  );
  useEffect(() => {
    generation.current++;
    readyRef.current = false;
    locked.current = false;
    setReady(false);
    setBusy(false);
    setNotice(null);
    setConnectionError(null);
    setServerTime(null);
    clock.current = null;
    repository.current = null;
    connected.current = null;
    if (loadedIdentity !== identity) {
      stateRef.current = createGame();
      setState(stateRef.current);
    }
    let disposed = false;
    let connection: Repository | null = null;
    let broadcast: BroadcastChannel | null = null;
    const live = () => !disposed && latestIdentity.current === identity;
    void (async () => {
      if (!authReady) return;
      try {
        if (userId) {
          const client = getSupabaseClient();
          if (!client)
            throw new GameError(
              "La connexion aux comptes n’est pas configurée.",
            );
          const remote = new ConnectedRepository(
            supabaseGameTransport(client, userId),
            userId,
            window.sessionStorage,
          );
          connected.current = remote;
          // A focus/online event must not race this first read and later replace
          // a confirmed command with an older snapshot.
          locked.current = true;
          const snapshot = await remote.load();
          if (!live()) return;
          acceptSnapshot(snapshot);
          setLoadedIdentity(identity);
          setPersistent(true);
          readyRef.current = true;
          setReady(true);
          return;
        }
        connection = await connectRepository();
        // Strict Mode can dispose the first effect while IndexedDB connects.
        // Let the live effect migrate so its restitution notice reaches the UI.
        if (!live()) {
          connection.close();
          return;
        }
        const saved = await connection.load();
        if (!live()) {
          connection.close();
          return;
        }
        repository.current = connection;
        revision.current = saved.revision;
        applyState(saved.state);
        setLoadedIdentity(identity);
        setPersistent(true);
        if (saved.migration) notify(migrationMessage(saved.migration));
        if ("BroadcastChannel" in window) {
          broadcast = new BroadcastChannel("brigo-club-save");
          channel.current = broadcast;
          broadcast.onmessage = async () => {
            if (locked.current || disposed || !connection) return;
            try {
              const latest = await connection.load();
              if (
                !disposed &&
                !locked.current &&
                latest.revision > revision.current
              ) {
                revision.current = latest.revision;
                applyState(latest.state);
              }
            } catch {
              /* The next action also checks the stored revision. */
            }
          };
        }
      } catch (error) {
        connection?.close();
        if (live()) {
          if (userId) {
            const message =
              error instanceof GameError
                ? error.message
                : "La partie connectée est indisponible. Actualisez pour réessayer.";
            setConnectionError(message);
            notify(message, "error");
            setPersistent(true);
            return;
          }
          repository.current = null;
          setPersistent(false);
          let sessionMigration: SaveMigration | undefined;
          // An existing temporary session also survives a release switch.
          // A corrupt persistent save is left untouched by the repository.
          if (!isCurrentReleaseState(stateRef.current)) {
            try {
              const migrated = parseSaveResult(stateRef.current);
              applyState(migrated.state);
              sessionMigration = migrated.migration;
            } catch {
              applyState(createGame());
            }
          }
          notify(
            `${sessionMigration ? `${migrationMessage(sessionMigration)} ` : ""}La sauvegarde locale est indisponible ou illisible. Cette session reste temporaire ; exportez-la avant de quitter. Les données existantes sont conservées.`,
            "error",
          );
          setLoadedIdentity(identity);
        }
      } finally {
        if (live() && userId) locked.current = false;
        if (live() && !userId && authReady) {
          readyRef.current = true;
          setReady(true);
        }
      }
    })();
    return () => {
      disposed = true;
      generation.current++;
      readyRef.current = false;
      connection?.close();
      broadcast?.close();
      repository.current = null;
      connected.current = null;
      channel.current = null;
    };
  }, [
    identity,
    userId,
    authReady,
    applyState,
    acceptSnapshot,
    notify,
    CURRENT_SAVE_VERSION,
  ]);
  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(
      () => setNotice(null),
      notice.kind === "error" ? 9000 : 4000,
    );
    return () => window.clearTimeout(timeout);
  }, [notice]);
  const localAct = useCallback(
    async (
      transform: (current: GameState) => GameState,
      message?: string,
      options: { observeEngagement?: boolean } = {},
    ): Promise<boolean> => {
      if (
        userId ||
        latestIdentity.current !== "local" ||
        !readyRef.current ||
        locked.current ||
        !isCurrentReleaseState(stateRef.current)
      )
        return false;
      const actionGeneration = generation.current;
      locked.current = true;
      setBusy(true);
      try {
        const previous = stateRef.current;
        const transformed = observeProduction(
          applyCurrentReleaseAction(previous, transform),
        );
        const next = parseSave(
          options.observeEngagement === false
            ? transformed
            : syncEngagement(transformed, previous),
        );
        let committedRevision = revision.current;
        if (repository.current)
          committedRevision = await repository.current.commit(
            next,
            revision.current,
          );
        // A release reload waits on the same IndexedDB transaction. Let that
        // live loader publish the migrated state, not this retired callback.
        if (
          generation.current !== actionGeneration ||
          latestIdentity.current !== "local"
        )
          return false;
        revision.current = committedRevision;
        applyState(next);
        channel.current?.postMessage("saved");
        if (message) notify(message);
        return true;
      } catch (error) {
        if (
          generation.current !== actionGeneration ||
          latestIdentity.current !== "local"
        )
          return false;
        if (error instanceof SaveConflict && repository.current) {
          try {
            const latest = await repository.current.load();
            if (generation.current !== actionGeneration) return false;
            revision.current = latest.revision;
            applyState(latest.state);
          } catch {
            /* Keep the current view; do not overwrite the stored save. */
          }
        }
        if (generation.current !== actionGeneration) return false;
        notify(
          error instanceof GameError
            ? error.message
            : "La sauvegarde a échoué. L’action n’a pas été appliquée ; réessayez.",
          "error",
        );
        return false;
      } finally {
        if (
          generation.current === actionGeneration &&
          latestIdentity.current === "local"
        ) {
          locked.current = false;
          setBusy(false);
        }
      }
    },
    [applyState, notify, userId, CURRENT_SAVE_VERSION],
  );
  const refresh = useCallback(async () => {
    if (
      !authReady ||
      !userId ||
      locked.current ||
      latestIdentity.current !== identity
    )
      return;
    const actionGeneration = generation.current;
    locked.current = true;
    setBusy(true);
    try {
      const client = getSupabaseClient();
      if (!client)
        throw new GameError("La connexion aux comptes n’est pas configurée.");
      if (!connected.current)
        connected.current = new ConnectedRepository(
          supabaseGameTransport(client, userId),
          userId,
          window.sessionStorage,
        );
      const snapshot = await connected.current.load();
      if (
        generation.current !== actionGeneration ||
        latestIdentity.current !== identity
      )
        return;
      acceptSnapshot(snapshot);
      setLoadedIdentity(identity);
      readyRef.current = true;
      setReady(true);
    } catch (error) {
      if (
        generation.current !== actionGeneration ||
        latestIdentity.current !== identity
      )
        return;
      const message =
        error instanceof GameError
          ? error.message
          : "La partie connectée est indisponible. Actualisez pour réessayer.";
      setConnectionError(message);
      readyRef.current = false;
      setReady(false);
      notify(message, "error");
    } finally {
      if (
        generation.current === actionGeneration &&
        latestIdentity.current === identity
      ) {
        locked.current = false;
        setBusy(false);
      }
    }
  }, [authReady, userId, identity, acceptSnapshot, notify]);
  useEffect(() => {
    if (!userId || !authReady) return;
    const reload = () => {
      if (!document.hidden) void refresh();
    };
    const offline = () => {
      readyRef.current = false;
      setReady(false);
      setConnectionError(
        "Vous êtes hors ligne. Votre partie reste affichée ; reconnectez-vous pour continuer.",
      );
    };
    window.addEventListener("online", reload);
    window.addEventListener("offline", offline);
    window.addEventListener("focus", reload);
    document.addEventListener("visibilitychange", reload);
    return () => {
      window.removeEventListener("online", reload);
      window.removeEventListener("offline", offline);
      window.removeEventListener("focus", reload);
      document.removeEventListener("visibilitychange", reload);
    };
  }, [userId, authReady, refresh]);
  const act = useCallback(
    async (
      command: GameCommand,
      message?: string,
    ): Promise<CommandResponse | null> => {
      if (
        !readyRef.current ||
        locked.current ||
        latestIdentity.current !== identity ||
        !isCurrentReleaseState(stateRef.current)
      )
        return null;
      if (!userId) {
        let result: Record<string, unknown> = {};
        const saved = await localAct(
          (current) => {
            const applied = applyGameCommand(current, command, Date.now());
            result = applied.result;
            return applied.state;
          },
          message,
          { observeEngagement: false },
        );
        return saved
          ? {
              state: stateRef.current,
              revision: revision.current,
              serverTime: new Date().toISOString(),
              result,
              replayed: false,
            }
          : null;
      }
      const remote = connected.current;
      if (!remote) return null;
      const actionGeneration = generation.current;
      locked.current = true;
      setBusy(true);
      try {
        const response = await remote.execute(command, revision.current);
        if (
          generation.current !== actionGeneration ||
          latestIdentity.current !== identity
        )
          return null;
        acceptSnapshot(response);
        if (message) notify(message);
        return response;
      } catch (error) {
        if (
          generation.current !== actionGeneration ||
          latestIdentity.current !== identity
        )
          return null;
        if (error instanceof RemoteGameError && error.status === 409) {
          try {
            const snapshot = error.snapshot ?? (await remote.load());
            if (
              generation.current !== actionGeneration ||
              latestIdentity.current !== identity
            )
              return null;
            acceptSnapshot(snapshot);
          } catch {
            if (
              generation.current !== actionGeneration ||
              latestIdentity.current !== identity
            )
              return null;
            readyRef.current = false;
            setReady(false);
            setConnectionError(
              "Actualisez pour retrouver la dernière version de votre partie.",
            );
          }
        } else if (remote.hasPending()) {
          readyRef.current = false;
          setReady(false);
          setConnectionError(
            "Votre action attend sa confirmation. Actualisez pour la vérifier sans la répéter.",
          );
        }
        notify(
          error instanceof GameError
            ? error.message
            : "L’action n’a pas pu être confirmée. Actualisez votre partie.",
          "error",
        );
        return null;
      } finally {
        if (
          generation.current === actionGeneration &&
          latestIdentity.current === identity
        ) {
          locked.current = false;
          setBusy(false);
        }
      }
    },
    [identity, userId, localAct, acceptSnapshot, notify],
  );
  // Fast Refresh can retain the previous schema in React state for one render.
  // Present the migrated snapshot before any new reward UI reads its fields.
  const currentRelease = isCurrentReleaseState(state);
  let displayedState = state;
  if (!currentRelease) {
    try {
      displayedState = parseSave(state);
    } catch {
      // Keep the page renderable until the loader reports the preserved save.
      displayedState = createGame();
    }
  }
  return {
    state: loadedIdentity === identity ? displayedState : createGame(),
    ready: ready && currentRelease && authReady && loadedIdentity === identity,
    busy,
    persistent,
    notice: loadedIdentity === identity ? notice : null,
    notify,
    act,
    localAct,
    mode,
    now,
    serverTime,
    refresh,
    connectionError,
  };
}
