import type { GameRepository, StoredGame } from "./gameService";

/** Current hosted projects inject named key dictionaries; older local stacks
 * still inject JWT keys. Prefer current keys without requiring legacy keys. */
export function readSupabaseServerKeys(
  readEnv: (name: string) => string | undefined,
): { publishableKey: string; serviceKey: string } {
  function key(mapName: string, legacyName: string): string {
    const raw = readEnv(mapName);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (
        parsed &&
        typeof parsed === "object" &&
        "default" in parsed &&
        typeof parsed.default === "string" &&
        parsed.default
      )
        return parsed.default;
      throw new Error(`Missing default server key: ${mapName}`);
    }
    const legacy = readEnv(legacyName);
    if (legacy) return legacy;
    throw new Error(`Missing server configuration: ${mapName}`);
  }
  return {
    publishableKey: key("SUPABASE_PUBLISHABLE_KEYS", "SUPABASE_ANON_KEY"),
    serviceKey: key("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY"),
  };
}

/** Service credentials remain in the Edge Function; user IDs only come from Auth. */
export function createSupabaseRepository(options: {
  url: string;
  publishableKey: string;
  serviceKey: string;
  fetch?: typeof globalThis.fetch;
}): GameRepository {
  const fetcher = options.fetch ?? globalThis.fetch;
  const url = options.url.replace(/\/$/, "");
  async function rpc(
    name: string,
    body: Record<string, unknown>,
  ): Promise<StoredGame> {
    const headers: Record<string, string> = {
      apikey: options.serviceKey,
      "Content-Type": "application/json",
    };
    // New secret keys are not JWTs. Supabase's gateway maps apikey to
    // service_role; only the legacy JWT key belongs in Authorization.
    if (!options.serviceKey.startsWith("sb_secret_"))
      headers.Authorization = `Bearer ${options.serviceKey}`;
    const response = await fetcher(`${url}/rest/v1/rpc/${name}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error("Database unavailable");
    return (await response.json()) as StoredGame;
  }
  return {
    async authenticate(accessToken) {
      const response = await fetcher(`${url}/auth/v1/user`, {
        headers: {
          apikey: options.publishableKey,
          Authorization: `Bearer ${accessToken}`,
        },
        signal: AbortSignal.timeout(10_000),
      });
      if (response.status === 401 || response.status === 403) return null;
      if (!response.ok) throw new Error("Auth unavailable");
      const user = (await response.json()) as {
        id?: unknown;
        is_anonymous?: boolean;
        email_confirmed_at?: unknown;
      };
      return typeof user.id === "string" &&
        !!user.id &&
        !user.is_anonymous &&
        typeof user.email_confirmed_at === "string" &&
        Number.isFinite(Date.parse(user.email_confirmed_at))
        ? user.id
        : null;
    },
    load(userId, initialState, receipt) {
      return rpc("brigo_load_game", {
        p_user_id: userId,
        p_initial_state: initialState,
        p_command_id: receipt?.commandId ?? null,
        p_request_hash: receipt?.requestHash ?? null,
      });
    },
    commit(input) {
      return rpc("brigo_commit_command", {
        p_user_id: input.userId,
        p_command_id: input.commandId,
        p_request_hash: input.requestHash,
        p_expected_revision: input.expectedRevision,
        p_state: input.state,
        p_result: input.result,
        p_command: input.command,
        p_delta: input.delta,
      });
    },
  };
}
