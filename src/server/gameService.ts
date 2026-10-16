import {
  applyGameCommand,
  CommandValidationError,
  parseGameCommand,
} from "../game/commands";
import type { CommandResponse, GameCommand, Snapshot } from "../game/commands";
import { createGame, GameError } from "../game/engine";
import type { GameState } from "../game/engine";
import { CURRENT_SAVE_VERSION } from "../game/releaseVersion";
import { parseSaveResult } from "../game/save";

export interface ReceiptKey {
  commandId: string;
  requestHash: string;
}
export interface StoredGame extends Snapshot {
  status:
    | "loaded"
    | "committed"
    | "replayed"
    | "revision_conflict"
    | "command_id_reused"
    | "rate_limited";
  result?: Record<string, unknown>;
}
export interface GameRepository {
  authenticate(accessToken: string): Promise<string | null>;
  load(
    userId: string,
    initialState: GameState,
    receipt?: ReceiptKey,
  ): Promise<StoredGame>;
  commit(input: {
    userId: string;
    commandId: string;
    requestHash: string;
    expectedRevision: number;
    state: GameState;
    result: Record<string, unknown>;
    command: GameCommand | { type: "server-migration"; fromVersion: number };
    delta: Record<string, unknown>;
  }): Promise<StoredGame>;
}

const MAX_BODY_BYTES = 16_384;
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}
const snapshot = (value: Snapshot): Snapshot => ({
  state: value.state,
  revision: value.revision,
  serverTime: value.serverTime,
});

/** Stable key order makes network retries independent of JSON property ordering. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}
async function sha256(value: unknown): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonicalJson(value)),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
function differences(
  before: Record<string, number>,
  after: Record<string, number>,
): Record<string, number> {
  return Object.fromEntries(
    [...new Set([...Object.keys(before), ...Object.keys(after)])]
      .map((key) => [key, (after[key] ?? 0) - (before[key] ?? 0)] as const)
      .filter(([, change]) => change !== 0),
  );
}
export function economicDelta(
  before: GameState,
  after: GameState,
): Record<string, unknown> {
  return {
    coins: after.coins - before.coins,
    boxes: differences(before.boxes, after.boxes),
    inventory: differences(before.inventory, after.inventory),
    constructionsAdded: after.constructions
      .filter((item) => !before.constructions.some((old) => old.id === item.id))
      .map((item) => item.id),
    constructionsRemoved: before.constructions
      .filter(
        (item) => !after.constructions.some((next) => next.id === item.id),
      )
      .map((item) => item.id),
  };
}
async function requestJson(request: Request): Promise<Record<string, unknown>> {
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  ) {
    throw new HttpError(415, "JSON_REQUIRED", "Envoyez une commande JSON.");
  }
  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_BODY_BYTES)
    throw new HttpError(413, "PAYLOAD_TOO_LARGE", "Commande trop volumineuse.");
  const reader = request.body?.getReader();
  if (!reader)
    throw new HttpError(400, "INVALID_REQUEST", "Commande manquante.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new HttpError(
        413,
        "PAYLOAD_TOO_LARGE",
        "Commande trop volumineuse.",
      );
    }
    chunks.push(value);
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(body));
  } catch {
    throw new HttpError(400, "INVALID_REQUEST", "Commande JSON invalide.");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    throw new HttpError(400, "INVALID_REQUEST", "Commande JSON invalide.");
  return parsed as Record<string, unknown>;
}

export function createGameHandler(options: {
  repository: GameRepository;
  allowedOrigins: string[];
  now?: () => number;
  logError?: (code: string) => void;
}): (request: Request) => Promise<Response> {
  const now = options.now ?? Date.now;
  const origins = new Set(
    options.allowedOrigins.filter(
      (origin) => origin !== "*" && origin !== "null",
    ),
  );
  const repository = options.repository;
  return async (request) => {
    const origin = request.headers.get("origin");
    const headers = new Headers({
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      Vary: "Origin",
      "X-Content-Type-Options": "nosniff",
    });
    if (origin && origins.has(origin)) {
      headers.set("Access-Control-Allow-Origin", origin);
      headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      headers.set(
        "Access-Control-Allow-Headers",
        "authorization, apikey, content-type, x-client-info",
      );
      headers.set("Access-Control-Max-Age", "600");
    }
    const json = (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), { status, headers });
    const storedResponse = (stored: StoredGame): Response | null => {
      if (stored.status === "rate_limited") {
        headers.set("Retry-After", "60");
        return json(
          {
            error: {
              code: "RATE_LIMITED",
              message: "Trop de demandes. Patientez un instant.",
            },
          },
          429,
        );
      }
      if (stored.status === "command_id_reused")
        return json(
          {
            error: {
              code: "COMMAND_ID_REUSED",
              message:
                "Cette commande a déjà été utilisée avec un autre contenu.",
            },
            snapshot: snapshot(stored),
          },
          409,
        );
      if (stored.status === "revision_conflict")
        return json(
          {
            error: {
              code: "REVISION_CONFLICT",
              message:
                "La partie a changé sur un autre appareil. Elle a été rechargée.",
            },
            snapshot: snapshot(stored),
          },
          409,
        );
      if (stored.status === "replayed")
        return json({
          ...snapshot(stored),
          result: stored.result ?? {},
          replayed: true,
        } satisfies CommandResponse);
      return null;
    };
    try {
      if (origins.size === 0)
        throw new HttpError(
          503,
          "SERVICE_UNAVAILABLE",
          "Le service de comptes n’est pas encore configuré.",
        );
      if (origin && !origins.has(origin))
        throw new HttpError(403, "ORIGIN_REJECTED", "Origine non autorisée.");
      if (request.method === "OPTIONS")
        return new Response(null, { status: 204, headers });
      if (request.method !== "GET" && request.method !== "POST") {
        headers.set("Allow", "GET, POST, OPTIONS");
        throw new HttpError(
          405,
          "METHOD_NOT_ALLOWED",
          "Méthode non autorisée.",
        );
      }
      const authorization = request.headers.get("authorization");
      const token = authorization?.match(/^Bearer ([^\s]{1,8192})$/i)?.[1];
      if (!token)
        throw new HttpError(
          401,
          "AUTH_REQUIRED",
          "Connectez-vous pour retrouver cette partie.",
        );
      const userId = await repository.authenticate(token);
      if (!userId)
        throw new HttpError(
          401,
          "AUTH_REQUIRED",
          "Votre session a expiré. Reconnectez-vous.",
        );
      const nowMs = now();
      let parsedCommand: GameCommand | undefined;
      let receipt: ReceiptKey | undefined;
      let expectedRevision = 0;
      if (request.method === "POST") {
        const body = await requestJson(request);
        if (
          Object.keys(body).some(
            (key) =>
              !["commandId", "expectedRevision", "command"].includes(key),
          ) ||
          typeof body.commandId !== "string" ||
          !UUID.test(body.commandId) ||
          !Number.isSafeInteger(body.expectedRevision) ||
          (body.expectedRevision as number) < 0
        ) {
          throw new HttpError(
            400,
            "INVALID_REQUEST",
            "Identifiant ou révision de commande invalide.",
          );
        }
        parsedCommand = parseGameCommand(body.command);
        expectedRevision = body.expectedRevision as number;
        receipt = {
          commandId: body.commandId,
          requestHash: await sha256({
            expectedRevision,
            command: parsedCommand,
          }),
        };
      }
      const initialState = parseSaveResult(createGame(), nowMs).state;
      let stored = await repository.load(userId, initialState, receipt);
      if (stored.status === "rate_limited") return storedResponse(stored)!;
      // A receipt preserves the original outcome, while every response must
      // expose the current persisted save format (including a retried command).
      const receivedStatus = stored.status;
      const receivedResult = stored.result;
      // Migration is private server work. It cannot be requested with a public command.
      for (
        let attempt = 0;
        stored.state.version !== CURRENT_SAVE_VERSION ||
        stored.state.planRevision !== 1;
        attempt++
      ) {
        if (attempt >= 3)
          throw new HttpError(
            503,
            "SERVICE_UNAVAILABLE",
            "La partie est en cours de mise à jour. Réessayez.",
          );
        const migrated = parseSaveResult(stored.state, nowMs).state;
        stored = await repository.commit({
          userId,
          commandId: crypto.randomUUID(),
          expectedRevision: stored.revision,
          requestHash: await sha256({
            migration: CURRENT_SAVE_VERSION,
            revision: stored.revision,
          }),
          state: migrated,
          result: {},
          command: {
            type: "server-migration",
            fromVersion: stored.state.version,
          },
          delta: economicDelta(stored.state, migrated),
        });
        if (
          stored.status !== "committed" &&
          stored.status !== "revision_conflict"
        )
          throw new HttpError(
            503,
            "SERVICE_UNAVAILABLE",
            "Mise à jour indisponible.",
          );
      }
      const receivedResponse = storedResponse({
        ...stored,
        status: receivedStatus,
        result: receivedResult,
      });
      if (receivedResponse) return receivedResponse;
      if (!parsedCommand || !receipt) return json(snapshot(stored));
      if (expectedRevision !== stored.revision)
        return storedResponse({ ...stored, status: "revision_conflict" })!;
      const computed = applyGameCommand(stored.state, parsedCommand, nowMs);
      const validated = parseSaveResult(computed.state, nowMs).state;
      const committed = await repository.commit({
        userId,
        ...receipt,
        expectedRevision,
        command: parsedCommand,
        state: validated,
        result: computed.result,
        delta: economicDelta(stored.state, validated),
      });
      return (
        storedResponse(committed) ??
        json({
          ...snapshot(committed),
          result: committed.result ?? {},
          replayed: false,
        } satisfies CommandResponse)
      );
    } catch (error) {
      if (error instanceof HttpError)
        return json(
          { error: { code: error.code, message: error.message } },
          error.status,
        );
      if (error instanceof CommandValidationError)
        return json(
          { error: { code: "INVALID_COMMAND", message: error.message } },
          400,
        );
      if (error instanceof GameError)
        return json(
          { error: { code: "GAME_RULE", message: error.message } },
          422,
        );
      // Neither JWTs, request bodies nor database diagnostics enter public logs/responses.
      options.logError?.("GAME_SERVICE_FAILURE");
      return json(
        {
          error: {
            code: "SERVICE_UNAVAILABLE",
            message:
              "La sauvegarde est indisponible. Réessayez dans un instant.",
          },
        },
        503,
      );
    }
  };
}
