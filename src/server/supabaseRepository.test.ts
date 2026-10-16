import { describe, expect, it, vi } from "vitest";
import {
  createSupabaseRepository,
  readSupabaseServerKeys,
} from "./supabaseRepository";
import { createGame } from "../game/engine";

describe("Supabase server adapter", () => {
  it("prefers current key dictionaries with compatibility for older local stacks", () => {
    const env: Record<string, string> = {
      SUPABASE_PUBLISHABLE_KEYS: '{"default":"sb_publishable_public"}',
      SUPABASE_SECRET_KEYS: '{"default":"sb_secret_private"}',
      SUPABASE_ANON_KEY: "legacy-public",
      SUPABASE_SERVICE_ROLE_KEY: "legacy-service",
    };
    expect(readSupabaseServerKeys((name) => env[name])).toEqual({
      publishableKey: "sb_publishable_public",
      serviceKey: "sb_secret_private",
    });
    delete env.SUPABASE_PUBLISHABLE_KEYS;
    delete env.SUPABASE_SECRET_KEYS;
    expect(readSupabaseServerKeys((name) => env[name])).toEqual({
      publishableKey: "legacy-public",
      serviceKey: "legacy-service",
    });
  });
  it("never sends a modern secret key as a bearer JWT", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response("{}"));
    const repository = createSupabaseRepository({
      url: "https://project.example",
      publishableKey: "sb_publishable_public",
      serviceKey: "sb_secret_private",
      fetch: fetcher,
    });
    await repository.load("user", createGame());
    expect(fetcher.mock.calls[0][1]!.headers).toEqual({
      apikey: "sb_secret_private",
      "Content-Type": "application/json",
    });
  });
  it("verifies the bearer against Auth rather than trusting decoded JWT payloads", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "verified-user",
          email_confirmed_at: "2026-10-16T10:00:00.000Z",
        }),
      ),
    );
    const repository = createSupabaseRepository({
      url: "https://project.example/",
      publishableKey: "public",
      serviceKey: "secret",
      fetch: fetcher,
    });
    expect(await repository.authenticate("user-jwt")).toBe("verified-user");
    const [url, options] = fetcher.mock.calls[0];
    expect(url).toBe("https://project.example/auth/v1/user");
    expect(options!.headers).toEqual({
      apikey: "public",
      Authorization: "Bearer user-jwt",
    });
  });
  it("rejects revoked sessions and anonymous Supabase users", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("{}", { status: 401 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "anonymous",
            is_anonymous: true,
            email_confirmed_at: "2026-10-16T10:00:00.000Z",
          }),
        ),
      );
    const repository = createSupabaseRepository({
      url: "https://project.example",
      publishableKey: "public",
      serviceKey: "secret",
      fetch: fetcher,
    });
    expect(await repository.authenticate("revoked")).toBeNull();
    expect(await repository.authenticate("anonymous")).toBeNull();
  });
  it("requires a confirmed email even if Auth signup settings are misconfigured", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ id: "unconfirmed", email_confirmed_at: null }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "unconfirmed",
            email_confirmed_at: "invalid-date",
          }),
        ),
      );
    const repository = createSupabaseRepository({
      url: "https://project.example",
      publishableKey: "public",
      serviceKey: "secret",
      fetch: fetcher,
    });
    expect(await repository.authenticate("unconfirmed")).toBeNull();
    expect(await repository.authenticate("invalid-date")).toBeNull();
  });
  it("sends privileged RPCs with server credentials and never with a user bearer", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: "loaded",
          revision: 0,
          state: createGame(),
          serverTime: "2026-10-16T10:00:00.000Z",
        }),
      ),
    );
    const repository = createSupabaseRepository({
      url: "https://project.example",
      publishableKey: "public",
      serviceKey: "private-service",
      fetch: fetcher,
    });
    await repository.load("verified-user", createGame());
    expect(fetcher.mock.calls[0][0]).toBe(
      "https://project.example/rest/v1/rpc/brigo_load_game",
    );
    expect(fetcher.mock.calls[0][1]!.headers).toEqual({
      apikey: "private-service",
      Authorization: "Bearer private-service",
      "Content-Type": "application/json",
    });
    expect(JSON.parse(fetcher.mock.calls[0][1]!.body as string).p_user_id).toBe(
      "verified-user",
    );
  });
});
