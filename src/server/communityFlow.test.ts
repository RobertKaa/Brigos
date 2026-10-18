import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { getSupabaseClient } from "../auth/client";
import {
  createCommunityApi,
  parseCommunityPage,
  parseOwnCommunity,
  parsePublicCreation,
} from "../community";
import { createGame } from "../game/engine";
import { createSandboxProject, placeSandboxBrigo } from "../game/sandbox";
import { exposeSandboxProject } from "../game/freeGallery";
import { applyGameCommand } from "../game/commands";

vi.mock("../auth/client", () => ({
  getSupabaseClient: vi.fn(),
  readAuthConfiguration: () => ({
    url: "https://local-test.invalid",
    key: "sb_publishable_fixture",
  }),
}));
const A = "10000000-0000-4000-8000-000000000001",
  B = "20000000-0000-4000-8000-000000000002";
let db: PGlite;
let actor = A;
const tokens = new Map([
  ["fixture-token-a", A],
  ["fixture-token-b", B],
]);
const calls: { action: string; input: Record<string, unknown> }[] = [];
const now = Date.parse("2026-10-18T12:00:00Z");
let state = createSandboxProject(
  {
    ...createGame(),
    inventory: { "brick-1x1:coral": 2 },
    discovered: ["brick-1x1:coral"],
  },
  "Jardin de Trebor",
  now,
);
const projectId = state.sandboxProjects![0].id;
state = placeSandboxBrigo(
  state,
  projectId,
  { brigoId: "brick-1x1:coral", x: 1, y: 1, z: 0, rotation: 0 },
  now,
);
state = exposeSandboxProject(
  state,
  projectId,
  "Jardin de Trebor",
  {
    description: "Une création partagée volontairement.",
    backgroundId: "paper",
    rotation: 90,
  },
  now,
);

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    create schema auth;
    create table auth.users(id uuid primary key,raw_user_meta_data jsonb not null default '{}',email_confirmed_at timestamptz,is_anonymous boolean default false);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema public,auth to anon,authenticated,service_role;`);
  for (const migration of [
    "202610160001_brigo_accounts.sql",
    "202610180001_brigo_community.sql",
  ])
    await db.exec(
      await readFile(
        new URL(`../../supabase/migrations/${migration}`, import.meta.url),
        "utf8",
      ),
    );
  for (const user of [A, B]) {
    await db.query(
      "insert into auth.users(id,email_confirmed_at) values($1,now())",
      [user],
    );
    await db.query(
      "insert into public.brigo_games(user_id,state) values($1,$2::jsonb)",
      [user, JSON.stringify(user === A ? state : createGame())],
    );
  }
  // Only the Auth/network boundary is replaced. Every browser request uses the
  // production adapter, the actual RPC, both real migrations and role checks.
  // These two disposable verified identities never reach a hosted project.
  vi.mocked(getSupabaseClient).mockReturnValue({
    auth: {
      getSession: async () => ({
        data: {
          session: {
            user: { id: actor },
            access_token: actor === A ? "fixture-token-a" : "fixture-token-b",
          },
        },
      }),
    },
  } as never);
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(async (url, options) => {
      expect(String(url)).toBe(
        "https://local-test.invalid/rest/v1/rpc/brigo_community",
      );
      expect(options?.method).toBe("POST");
      expect(options?.cache).toBe("no-store");
      const token =
        new Headers(options?.headers)
          .get("Authorization")
          ?.replace(/^Bearer /, "") ?? "";
      const user = tokens.get(token);
      if (!user) return new Response("{}", { status: 401 });
      const body = JSON.parse(String(options?.body)) as {
        p_action: string;
        p_input: Record<string, unknown>;
      };
      calls.push({ action: body.p_action, input: body.p_input });
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
        user,
      ]);
      await db.exec("set role authenticated");
      try {
        const result = (
          await db.query<{ value: unknown }>(
            "select public.brigo_community($1,$2::jsonb) as value",
            [body.p_action, JSON.stringify(body.p_input)],
          )
        ).rows[0].value;
        return new Response(JSON.stringify(result), {
          headers: { "Content-Type": "application/json" },
        });
      } finally {
        await db.exec("reset role");
      }
    }),
  );
}, 60_000);
afterAll(async () => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  await db?.close();
});

it("uses the real browser transport and PostgreSQL for a two-account publish, visit, withdrawal and moderation journey", async () => {
  const a = createCommunityApi(A),
    b = createCommunityApi(B);
  const input = {
    pseudo: "TreborKaa",
    bio: "Les petits jardins de Brigos",
    avatar: "mint",
    visible: false,
    featuredCreationId: null,
    expectedRevision: 0,
  };
  let mine = parseOwnCommunity(await a.request("mine"));
  expect(mine.profile).toBeNull();
  mine = parseOwnCommunity(await a.request("save-profile", input));
  expect(mine.profile?.visible).toBe(false);
  expect(mine.profile?.revision).toBe(1);
  await expect(a.request("publish", { projectId })).rejects.toThrow(
    "Rendez votre profil visible",
  );
  mine = parseOwnCommunity(
    await a.request("save-profile", {
      ...input,
      visible: true,
      expectedRevision: mine.profile!.revision,
    }),
  );
  const published = (await a.request("publish", { projectId })) as {
    id: string;
  };
  expect(calls.find((c) => c.action === "publish")?.input).toEqual({
    projectId,
  });
  const profileId = mine.profile!.id;
  expect(profileId).not.toBe(A);
  const before = await db.query<{ state: unknown; revision: number }>(
    "select state,revision from public.brigo_games where user_id=$1",
    [A],
  );
  expect(before.rows[0]).toEqual({ state, revision: 0 });

  actor = B;
  const players = parseCommunityPage(
    await b.request("players", { q: "Trebor", page: 1 }),
    true,
  );
  expect(players.items.map((p) => p.id)).toEqual([profileId]);
  const gallery = parseCommunityPage(
    await b.request("profile", { id: profileId, page: 1 }),
  );
  expect(gallery.items.map((c) => c.id)).toEqual([published.id]);
  const detail = parsePublicCreation(
    (
      (await b.request("creation", { id: published.id })) as {
        creation: unknown;
      }
    ).creation,
  );
  expect(detail.title).toBe("Jardin de Trebor");
  expect(detail.placements).toHaveLength(1);
  expect(JSON.stringify(detail)).not.toContain(A);
  expect(JSON.stringify(detail)).not.toContain(projectId);
  await expect(a.request("unpublish", { id: published.id })).rejects.toThrow(
    "Connectez-vous",
  );
  await b.request("save-profile", {
    ...input,
    pseudo: "Autre joueur",
    visible: true,
  });
  await expect(b.request("publish", { projectId })).rejects.toThrow(
    "n’est plus disponible",
  );
  await b.request("unpublish", { id: published.id });
  expect(
    (
      (await b.request("creation", { id: published.id })) as {
        creation: { id: string };
      }
    ).creation.id,
  ).toBe(published.id);
  await b.request("report", {
    kind: "creation",
    id: published.id,
    reason: "rights",
  });
  expect(
    (await db.query("select reason from public.brigo_community_reports")).rows,
  ).toEqual([{ reason: "rights" }]);

  actor = A;
  const staleRevision = mine.profile!.revision;
  mine = parseOwnCommunity(
    await a.request("save-profile", {
      ...input,
      visible: false,
      expectedRevision: staleRevision,
    }),
  );
  await expect(
    a.request("save-profile", {
      ...input,
      visible: true,
      expectedRevision: staleRevision,
    }),
  ).rejects.toThrow("autre fenêtre");
  actor = B;
  expect(parseCommunityPage(await b.request("creations")).items).toEqual([]);
  await expect(b.request("creation", { id: published.id })).rejects.toThrow(
    "n’est plus disponible",
  );

  actor = A;
  mine = parseOwnCommunity(
    await a.request("save-profile", {
      ...input,
      visible: true,
      expectedRevision: mine.profile!.revision,
    }),
  );
  await db.query("select public.brigo_community_moderate('creation',$1,true)", [
    published.id,
  ]);
  await a.request("unpublish", { id: published.id });
  const again = (await a.request("publish", { projectId })) as { id: string };
  expect(again.id).toBe(published.id);
  actor = B;
  await expect(b.request("creation", { id: again.id })).rejects.toThrow(
    "n’est plus disponible",
  );

  const next = applyGameCommand(
    state,
    { type: "remove-exhibit", projectId },
    now + 1,
  ).state;
  await db.exec("set role service_role");
  try {
    await db.query(
      "select public.brigo_commit_command($1,$2,$3,0,$4::jsonb,'{}'::jsonb,$5::jsonb,'{}'::jsonb)",
      [
        A,
        crypto.randomUUID(),
        "a".repeat(64),
        JSON.stringify(next),
        JSON.stringify({ type: "remove-exhibit", projectId }),
      ],
    );
  } finally {
    await db.exec("reset role");
  }
  actor = A;
  expect(parseOwnCommunity(await a.request("mine")).creations).toEqual([]);
  const after = (
    await db.query<{
      state: { coins: number; inventory: unknown; sandboxProjects: unknown };
      revision: number;
    }>("select state,revision from public.brigo_games where user_id=$1", [A])
  ).rows[0];
  expect(after.revision).toBe(1);
  expect(after.state.coins).toBe(state.coins);
  expect(after.state.inventory).toEqual(state.inventory);
  expect(after.state.sandboxProjects).toEqual(state.sandboxProjects);
}, 30_000);
