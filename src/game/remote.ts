import type { SupabaseClient } from "@supabase/supabase-js";
import { GameError } from "./engine";
import { parseSaveResult } from "./save";
import { parseGameCommand } from "./commands";
import type {
  GameCommand,
  GameSnapshot,
  CommandRequest,
  CommandResponse,
} from "./commands";

export class RemoteGameError extends GameError {
  constructor(
    message: string,
    public readonly status = 0,
    public readonly snapshot?: GameSnapshot,
  ) {
    super(message);
  }
}

export interface GameTransport {
  read(): Promise<unknown>;
  execute(request: CommandRequest): Promise<unknown>;
}

export function parseSnapshot(value: unknown): GameSnapshot {
  if (!value || typeof value !== "object")
    throw new RemoteGameError("La réponse du serveur est illisible.");
  const data = value as Record<string, unknown>;
  const time =
    typeof data.serverTime === "string" ? Date.parse(data.serverTime) : NaN;
  if (
    !Number.isSafeInteger(data.revision) ||
    (data.revision as number) < 0 ||
    !Number.isFinite(time)
  )
    throw new RemoteGameError("La réponse du serveur est incompatible.");
  return {
    state: parseSaveResult(data.state, time).state,
    revision: data.revision as number,
    serverTime: data.serverTime as string,
  };
}

function parseResponse(value: unknown): CommandResponse {
  const snapshot = parseSnapshot(value);
  const data = value as Record<string, unknown>;
  if (
    !data.result ||
    typeof data.result !== "object" ||
    Array.isArray(data.result) ||
    typeof data.replayed !== "boolean"
  )
    throw new RemoteGameError("Le résultat de la commande est illisible.");
  return {
    ...snapshot,
    result: data.result as Record<string, unknown>,
    replayed: data.replayed,
  };
}

export function supabaseGameTransport(
  client: SupabaseClient,
  userId: string,
): GameTransport {
  const invoke = async (method: "GET" | "POST", body?: CommandRequest) => {
    const { data: sessionData, error: sessionError } =
      await client.auth.getSession();
    const session = sessionData.session;
    if (sessionError || !session || session.user.id !== userId)
      throw new RemoteGameError(
        "Votre session a changé. Reconnectez-vous pour retrouver votre partie.",
        401,
      );
    // Capture the account's token: the shared SDK may switch accounts while its
    // fetch is being prepared. Never let that switch redirect a pending spend.
    const { data, error } = await client.functions.invoke("game", {
      method,
      headers: { Authorization: `Bearer ${session.access_token}` },
      ...(body ? { body } : {}),
    });
    if (error) {
      const response =
        "context" in error && error.context instanceof Response
          ? error.context
          : null;
      if (response) {
        let snapshot: GameSnapshot | undefined;
        try {
          const payload = await response.json();
          if (payload.snapshot) snapshot = parseSnapshot(payload.snapshot);
        } catch {
          /* Never display raw service errors, tokens, or SQL diagnostics. */
        }
        const message =
          response.status === 409
            ? "Votre partie a changé sur un autre appareil. Elle a été actualisée ; réessayez."
            : response.status === 401
              ? "Votre session a expiré. Reconnectez-vous pour retrouver votre partie."
              : response.status === 429
                ? "Trop d’actions rapprochées. Patientez un instant, puis actualisez."
                : response.status >= 500
                  ? "Le serveur est momentanément indisponible. Actualisez pour vérifier votre action."
                  : "Cette action n’a pas pu être appliquée. Actualisez votre partie et réessayez.";
        throw new RemoteGameError(message, response.status, snapshot);
      }
      throw new RemoteGameError(
        "Connexion interrompue. Actualisez pour vérifier votre action ; aucun gain n’est appliqué localement.",
      );
    }
    return data;
  };
  return {
    read: () => invoke("GET"),
    execute: (request) => invoke("POST", request),
  };
}

/** One durable in-flight request per tab/account; retry preserves the original draw. */
export class ConnectedRepository {
  private pending: CommandRequest | null = null;
  private readonly key: string;
  constructor(
    private readonly transport: GameTransport,
    userId: string,
    private readonly storage: Pick<
      Storage,
      "getItem" | "setItem" | "removeItem"
    >,
  ) {
    this.key = `brigo-cloud-pending:${userId}`;
    const serialized = storage.getItem(this.key);
    if (serialized) {
      const value = JSON.parse(serialized) as CommandRequest;
      if (
        typeof value.commandId !== "string" ||
        !/^[0-9a-f-]{36}$/i.test(value.commandId) ||
        !Number.isSafeInteger(value.expectedRevision) ||
        value.expectedRevision < 0
      )
        throw new RemoteGameError(
          "La commande en attente est illisible. Conservez cet onglet et reconnectez-vous.",
        );
      this.pending = {
        commandId: value.commandId,
        expectedRevision: value.expectedRevision,
        command: parseGameCommand(value.command),
      };
    }
  }
  hasPending() {
    return this.pending !== null;
  }
  private clearPending() {
    this.storage.removeItem(this.key);
    this.pending = null;
  }
  private async sendPending(): Promise<CommandResponse> {
    const request = this.pending!;
    for (let attempt = 0; ; attempt++) {
      try {
        const result = parseResponse(await this.transport.execute(request));
        this.clearPending();
        return result;
      } catch (error) {
        const status = error instanceof RemoteGameError ? error.status : 0;
        // These responses definitively reject the command. Auth/rate/network errors
        // may follow a lost committed response, so retain the receipt key for them.
        if ([400, 409, 413, 422].includes(status)) this.clearPending();
        if (attempt === 0 && status === 0) continue;
        throw error;
      }
    }
  }
  async load(): Promise<GameSnapshot> {
    if (this.pending) {
      try {
        await this.sendPending();
      } catch (error) {
        if (!(error instanceof RemoteGameError) || error.status !== 409)
          throw error;
      }
    }
    return parseSnapshot(await this.transport.read());
  }
  async execute(
    command: GameCommand,
    expectedRevision: number,
  ): Promise<CommandResponse> {
    if (this.pending)
      throw new RemoteGameError(
        "Une action attend encore sa confirmation. Actualisez avant de continuer.",
      );
    const request: CommandRequest = {
      commandId: crypto.randomUUID(),
      expectedRevision,
      command: parseGameCommand(command),
    };
    // Fail before sending if the browser cannot retain the idempotency key.
    this.storage.setItem(this.key, JSON.stringify(request));
    this.pending = request;
    return this.sendPending();
  }
}
