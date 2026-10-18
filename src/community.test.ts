import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createCommunityApi,
  parseCommunityPage,
  parseOwnCommunity,
  parsePublicCreation,
  parsePublicProfile,
} from "./community";
import { getSupabaseClient } from "./auth/client";
vi.mock("./auth/client", () => ({
  getSupabaseClient: vi.fn(),
  readAuthConfiguration: () => ({
    url: "https://test.supabase.co",
    key: "sb_publishable_test",
  }),
}));
const id = "10000000-0000-4000-8000-000000000001";
const profile = {
  id,
  pseudo: "Jardinier",
  bio: "<script>safe text</script>",
  avatar: "mint",
  publishedCount: 1,
  featuredCreationId: null,
};
const creation = {
  id,
  title: "Jardin",
  description: "Ligne 1\nLigne 2",
  rotation: 90,
  backgroundId: "paper",
  publishedAt: "2026-10-18T12:00:00Z",
  placements: [{ brigoId: "brick-1x1:coral", x: 1, y: 1, z: 0, rotation: 0 }],
  author: profile,
};
afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});
describe("community allowlisted browser projection", () => {
  it("discards unknown/private fields and gives placements synthetic IDs", () => {
    expect(
      parsePublicProfile({ ...profile, userId: "secret", email: "private" }),
    ).toEqual(profile);
    const parsed = parsePublicCreation({
      ...creation,
      inventory: { private: 1 },
      projectId: "secret",
    });
    expect(parsed).not.toHaveProperty("inventory");
    expect(parsed).not.toHaveProperty("projectId");
    expect(parsed.placements[0].id).toBe("public-0");
    expect(parsed.description).toContain("\n");
  });
  it("rejects unknown geometry, excessive data, unsafe text and malformed profile responses", () => {
    for (const placements of [
      [{ ...creation.placements[0], brigoId: "<svg>" }],
      Array(501).fill(creation.placements[0]),
      [{ ...creation.placements[0], x: Infinity }],
      [],
    ])
      expect(() => parsePublicCreation({ ...creation, placements })).toThrow();
    expect(() =>
      parsePublicProfile({ ...profile, pseudo: "invisible\u202e" }),
    ).toThrow();
    expect(() =>
      parsePublicProfile({ ...profile, avatar: "https://tracker.test/a.svg" }),
    ).toThrow();
    expect(() =>
      parseCommunityPage({ items: Array(7).fill(creation), hasMore: true }),
    ).toThrow();
    expect(() =>
      parseOwnCommunity({
        profile: { ...profile, visible: "yes", moderated: false },
        creations: [],
      }),
    ).toThrow();
  });
  it("never requests community data without the captured account session", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    vi.mocked(getSupabaseClient).mockReturnValue({
      auth: {
        getSession: async () => ({
          data: {
            session: { user: { id: "other" }, access_token: "wrong-account" },
          },
        }),
      },
    } as never);
    await expect(createCommunityApi(null).request("players")).rejects.toThrow(
      "Connectez-vous",
    );
    await expect(
      createCommunityApi(id).request("publish", { projectId: "mine" }),
    ).rejects.toThrow("Connectez-vous");
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("captures the token and disables response caching; never displays database errors", async () => {
    vi.mocked(getSupabaseClient).mockReturnValue({
      auth: {
        getSession: async () => ({
          data: {
            session: { user: { id }, access_token: "captured-account-token" },
          },
        }),
      },
    } as never);
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ items: [], hasMore: false, profile: null }),
        ),
      );
    vi.stubGlobal("fetch", fetcher);
    await createCommunityApi(id).request("players", { q: "jardin", page: 2 });
    expect(fetcher).toHaveBeenCalledWith(
      "https://test.supabase.co/rest/v1/rpc/brigo_community",
      expect.objectContaining({
        cache: "no-store",
        headers: expect.objectContaining({
          Authorization: "Bearer captured-account-token",
        }),
        body: JSON.stringify({
          p_action: "players",
          p_input: { q: "jardin", page: 2 },
        }),
      }),
    );
    fetcher.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "NOT_FOUND", sql: "secret" })),
    );
    await expect(
      createCommunityApi(id).request("creation", { id }),
    ).rejects.toThrow("n’est plus disponible");
    fetcher.mockResolvedValueOnce(
      new Response(JSON.stringify({ code: "42P01", message: "secret sql" }), {
        status: 500,
      }),
    );
    await expect(createCommunityApi(id).request("players")).rejects.toThrow(
      "momentanément indisponible",
    );
    fetcher.mockResolvedValueOnce(
      new Response(JSON.stringify({ code: "PGRST202" }), { status: 404 }),
    );
    await expect(createCommunityApi(id).request("players")).rejects.toThrow(
      "pas encore activées",
    );
  });
});
