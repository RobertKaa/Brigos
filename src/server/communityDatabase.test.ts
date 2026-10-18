import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createGame } from "../game/engine";
import { createSandboxProject, placeSandboxBrigo } from "../game/sandbox";
import { exposeSandboxProject } from "../game/freeGallery";

const USER = "10000000-0000-4000-8000-000000000001",
  OTHER = "20000000-0000-4000-8000-000000000002";
let db: PGlite;
function fixture() {
  let s = createSandboxProject(
    {
      ...createGame(),
      inventory: { "brick-1x1:coral": 1 },
      discovered: ["brick-1x1:coral"],
    },
    "Jardin",
  );
  const id = s.sandboxProjects![0].id;
  s = placeSandboxBrigo(s, id, {
    brigoId: "brick-1x1:coral",
    x: 1,
    y: 1,
    z: 0,
    rotation: 0,
  });
  return exposeSandboxProject(s, id, "Jardin", {
    description: "Mon jardin",
    rotation: 90,
    backgroundId: "paper",
  });
}
const state = fixture(),
  projectId = state.sandboxProjects![0].id;
const profileInput = {
  pseudo: "Trebor",
  bio: "Créateur de jardins",
  avatar: "mint",
  visible: true,
  featuredCreationId: null,
};
async function rpc(
  action: string,
  input: Record<string, unknown> = {},
  user = USER,
): Promise<any> {
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user]);
  await db.exec("set role authenticated");
  try {
    // Most fixtures save the latest profile. Conflict cases explicitly supply
    // the revision captured by an older window, exercising the real protocol.
    if (
      action === "save-profile" &&
      !Object.hasOwn(input, "expectedRevision")
    ) {
      const own = (
        await db.query<{ v: { profile: { revision: number } | null } }>(
          "select public.brigo_community('mine') v",
        )
      ).rows[0].v;
      input = { ...input, expectedRevision: own.profile?.revision ?? 0 };
    }
    return (
      await db.query<{ v: any }>(
        "select public.brigo_community($1,$2::jsonb) v",
        [action, JSON.stringify(input)],
      )
    ).rows[0].v;
  } finally {
    await db.exec("reset role");
  }
}
async function publish(user = USER) {
  await rpc("save-profile", profileInput, user);
  return rpc("publish", { projectId }, user);
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    create schema auth;
    create table auth.users(id uuid primary key,raw_user_meta_data jsonb not null default '{}',email_confirmed_at timestamptz,is_anonymous boolean default false);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth,public to anon,authenticated,service_role;`);
  for (const name of [
    "202610160001_brigo_accounts.sql",
    "202610180001_brigo_community.sql",
  ])
    await db.exec(
      await readFile(
        new URL(`../../supabase/migrations/${name}`, import.meta.url),
        "utf8",
      ),
    );
  await db.query(
    "insert into auth.users(id,email_confirmed_at) values($1,now()),($2,now())",
    [USER, OTHER],
  );
}, 60_000);
beforeEach(async () => {
  await db.exec(
    "truncate public.brigo_community_profiles cascade; truncate public.brigo_community_reports; truncate public.brigo_community_windows; delete from public.brigo_games;",
  );
  for (const id of [USER, OTHER])
    await db.query(
      "insert into public.brigo_games(user_id,state) values($1,$2::jsonb)",
      [id, JSON.stringify(id === USER ? state : createGame())],
    );
});
afterAll(async () => {
  await db?.close();
});
describe("community PostgreSQL privacy and publication", () => {
  it("never lets an older form restore consent withdrawn from another window", async () => {
    await rpc("save-profile", profileInput);
    const old = (await rpc("mine")).profile;
    await rpc("save-profile", {
      ...profileInput,
      visible: false,
      expectedRevision: old.revision,
    });
    expect(
      await rpc("save-profile", {
        ...profileInput,
        bio: "Modification tardive",
        expectedRevision: old.revision,
      }),
    ).toEqual({ error: "PROFILE_CONFLICT" });
    expect((await rpc("mine")).profile.visible).toBe(false);
    expect((await rpc("players", {}, OTHER)).items).toHaveLength(0);
    expect(
      await rpc("save-profile", {
        ...profileInput,
        expectedRevision: undefined,
      }),
    ).toEqual({ error: "INVALID_INPUT" });
  });
  it("keeps a moderated profile hidden after its author edits consent and text", async () => {
    const p = await publish();
    const own = await rpc("mine");
    await db.query(
      "select public.brigo_community_moderate('profile',$1,true)",
      [own.profile.id],
    );
    await rpc("save-profile", {
      ...profileInput,
      pseudo: "Autre nom",
      visible: true,
    });
    expect(await rpc("profile", { id: own.profile.id }, OTHER)).toEqual({
      error: "NOT_FOUND",
    });
    expect(await rpc("creation", { id: p.id }, OTHER)).toEqual({
      error: "NOT_FOUND",
    });
    expect(await rpc("publish", { projectId })).toEqual({
      error: "PROFILE_PRIVATE",
    });
    expect((await rpc("players", {}, OTHER)).items).toHaveLength(0);
    expect((await rpc("mine")).profile.moderated).toBe(true);
  });
  it("limits new daily reports and keeps duplicates from consuming the allowance", async () => {
    const targets: string[] = [];
    for (let i = 0; i < 6; i++) {
      const user = crypto.randomUUID();
      await db.query(
        "insert into auth.users(id,email_confirmed_at) values($1,now())",
        [user],
      );
      const row = await db.query<{ id: string }>(
        "insert into public.brigo_community_profiles(user_id,pseudo,visible) values($1,'Joueur',true) returning id",
        [user],
      );
      targets.push(row.rows[0].id);
    }
    for (let i = 0; i < 5; i++) {
      expect(
        await rpc("report", {
          kind: "profile",
          id: targets[i],
          reason: "spam",
        }),
      ).toEqual({ ok: true });
      if (i === 0)
        expect(
          await rpc("report", {
            kind: "profile",
            id: targets[i],
            reason: "spam",
          }),
        ).toEqual({ ok: true });
    }
    expect(
      await rpc("report", { kind: "profile", id: targets[5], reason: "spam" }),
    ).toEqual({ error: "RATE_LIMITED" });
    expect(
      (await db.query("select * from public.brigo_community_reports")).rows,
    ).toHaveLength(5);
  });
  it("paginates players and creations with stable ties and exposes a selected featured creation", async () => {
    for (let i = 1; i <= 13; i++) {
      const id = crypto.randomUUID();
      await db.query(
        "insert into auth.users(id,email_confirmed_at) values($1,now())",
        [id],
      );
      await db.query(
        "insert into public.brigo_community_profiles(user_id,pseudo,visible) values($1,$2,true)",
        [id, `Joueur ${String(i).padStart(2, "0")}`],
      );
    }
    const a = await rpc("players"),
      b = await rpc("players", { page: 2 });
    expect(a.items).toHaveLength(12);
    expect(a.hasMore).toBe(true);
    expect(b.items).toHaveLength(1);
    expect(b.hasMore).toBe(false);
    expect(a.items.some((p: { id: string }) => p.id === b.items[0].id)).toBe(
      false,
    );
    let projects = state;
    for (let i = 1; i <= 6; i++) {
      projects = createSandboxProject(
        { ...projects, inventory: { "brick-1x1:coral": 1 } },
        `Jardin ${i}`,
      );
      const id = projects.sandboxProjects!.at(-1)!.id;
      projects = placeSandboxBrigo(projects, id, {
        brigoId: "brick-1x1:coral",
        x: i,
        y: 1,
        z: 0,
        rotation: 0,
      });
      projects = exposeSandboxProject(projects, id, `Jardin ${i}`, {
        description: "",
        rotation: 0,
        backgroundId: "paper",
      });
    }
    await db.query(
      "update public.brigo_games set state=$2::jsonb where user_id=$1",
      [USER, JSON.stringify(projects)],
    );
    await rpc("save-profile", profileInput);
    for (const p of projects.sandboxProjects!)
      await rpc("publish", { projectId: p.id });
    const first = await rpc("creations"),
      second = await rpc("creations", { page: 2 });
    expect(first.items).toHaveLength(6);
    expect(first.hasMore).toBe(true);
    expect(second.items).toHaveLength(1);
    expect(
      first.items.some((p: { id: string }) => p.id === second.items[0].id),
    ).toBe(false);
    await rpc("save-profile", {
      ...profileInput,
      featuredCreationId: second.items[0].id,
    });
    const mine = await rpc("mine");
    expect(mine.profile.publishedCount).toBe(7);
    const profilePage = await rpc("profile", { id: mine.profile.id, page: 2 });
    expect(profilePage.profile.featuredCreationId).toBe(second.items[0].id);
    expect(profilePage.items).toHaveLength(1);
  });
  it("keeps profiles and private exhibits out of discovery until explicit consent", async () => {
    expect((await rpc("players")).items).toEqual([]);
    expect((await rpc("mine")).profile).toBeNull();
    expect(await rpc("publish", { projectId })).toEqual({
      error: "PROFILE_PRIVATE",
    });
    await rpc("save-profile", profileInput);
    const list = await rpc("players");
    expect(list.items[0].pseudo).toBe("Trebor");
    expect(JSON.stringify(list)).not.toContain(USER);
    expect((await rpc("creations")).items).toEqual([]);
  });
  it("publishes a server-selected snapshot and never changes economics or revision", async () => {
    const p = await publish();
    const c = (await rpc("creation", { id: p.id }, OTHER)).creation;
    expect(Object.keys(c).sort()).toEqual([
      "author",
      "backgroundId",
      "description",
      "id",
      "placements",
      "publishedAt",
      "rotation",
      "title",
    ]);
    expect(Object.keys(c.placements[0]).sort()).toEqual([
      "brigoId",
      "rotation",
      "x",
      "y",
      "z",
    ]);
    expect(JSON.stringify(c)).not.toContain(projectId);
    expect(JSON.stringify(c)).not.toContain(USER);
    expect(
      (
        await db.query<{ state: unknown; revision: number }>(
          "select state,revision from public.brigo_games where user_id=$1",
          [USER],
        )
      ).rows[0],
    ).toEqual({ state, revision: 0 });
    expect((await publish()).id).toBe(p.id);
    expect(
      await rpc("publish", { projectId, placements: [], coins: 99999 }),
    ).toEqual({ error: "INVALID_INPUT" });
    expect(
      await rpc("publish", { projectId: "someone-elses-project" }),
    ).toEqual({ error: "NOT_FOUND" });
  });
  it("hides all direct/profile/list reads immediately when consent is withdrawn", async () => {
    const p = await publish();
    const id = (await rpc("mine")).profile.id;
    await rpc("save-profile", { ...profileInput, visible: false });
    expect((await rpc("players", {}, OTHER)).items).toEqual([]);
    expect((await rpc("creations", {}, OTHER)).items).toEqual([]);
    expect(await rpc("profile", { id }, OTHER)).toEqual({ error: "NOT_FOUND" });
    expect(await rpc("creation", { id: p.id }, OTHER)).toEqual({
      error: "NOT_FOUND",
    });
    expect((await rpc("mine")).creations).toHaveLength(1);
  });
  it("prevents cross-account withdrawal and featured selection", async () => {
    const p = await publish();
    await rpc("unpublish", { id: p.id }, OTHER);
    expect((await rpc("creation", { id: p.id }, OTHER)).creation.id).toBe(p.id);
    expect(
      await rpc(
        "save-profile",
        { ...profileInput, featuredCreationId: p.id },
        OTHER,
      ),
    ).toEqual({ error: "NOT_FOUND" });
    await rpc("save-profile", profileInput, OTHER);
    expect(await rpc("publish", { projectId }, OTHER)).toEqual({
      error: "NOT_FOUND",
    });
    await rpc("save-profile", { ...profileInput, featuredCreationId: p.id });
    expect((await rpc("mine")).profile.featuredCreationId).toBe(p.id);
    await rpc("unpublish", { id: p.id });
    expect(await rpc("creation", { id: p.id }, OTHER)).toEqual({
      error: "NOT_FOUND",
    });
    expect((await rpc("mine")).profile.featuredCreationId).toBeNull();
  });
  it("prunes a removed exhibit in the same game transaction and rolls back together", async () => {
    const p = await publish();
    await db.exec("begin");
    await db.query(
      "update public.brigo_games set state=jsonb_set(state,'{freeGallery,exhibits}','[]') where user_id=$1",
      [USER],
    );
    expect(
      (await db.query("select * from public.brigo_community_creations")).rows,
    ).toHaveLength(0);
    await db.exec("rollback");
    expect((await rpc("creation", { id: p.id }, OTHER)).creation.id).toBe(p.id);
    await db.query(
      "update public.brigo_games set state=jsonb_set(state,'{sandboxProjects}','[]') where user_id=$1",
      [USER],
    );
    expect(await rpc("creation", { id: p.id }, OTHER)).toEqual({
      error: "NOT_FOUND",
    });
  });
  it("bounds searches/pages and treats query metacharacters literally", async () => {
    expect(
      await rpc("save-profile", { ...profileInput, bio: "invisible\u0085" }),
    ).toEqual({ error: "INVALID_INPUT" });
    await publish();
    expect((await rpc("players", { q: "tre" })).items).toHaveLength(1);
    expect((await rpc("players", { q: "%" })).items).toHaveLength(0);
    for (const input of [
      { page: 0 },
      { page: 1001 },
      { page: "1" },
      { q: "x".repeat(41) },
      { userId: OTHER },
      { page: null },
    ])
      expect(await rpc("players", input)).toEqual({ error: "INVALID_INPUT" });
    expect(await rpc("publish", { projectId: "x".repeat(2100) })).toEqual({
      error: "INVALID_INPUT",
    });
    expect(
      await rpc("save-profile", { ...profileInput, pseudo: "hidden\u202e" }),
    ).toEqual({ error: "INVALID_INPUT" });
    expect(
      await rpc("save-profile", { ...profileInput, pseudo: "🌱".repeat(21) }),
    ).toEqual({ error: "INVALID_INPUT" });
  });
  it("allows reports but denies client moderation, direct tables and private projections", async () => {
    const p = await publish();
    expect(
      await rpc(
        "report",
        { kind: "creation", id: p.id, reason: "rights" },
        OTHER,
      ),
    ).toEqual({ ok: true });
    expect(
      await rpc(
        "report",
        { kind: "creation", id: p.id, reason: "rights" },
        OTHER,
      ),
    ).toEqual({ ok: true });
    expect(
      (await db.query("select * from public.brigo_community_reports")).rows,
    ).toHaveLength(1);
    await db.exec("set role authenticated");
    try {
      for (const table of ["profiles", "creations", "reports", "windows"])
        await expect(
          db.query(`select * from public.brigo_community_${table}`),
        ).rejects.toThrow(/permission denied/i);
      await expect(
        db.query("select public.brigo_community_moderate('creation',$1,true)", [
          p.id,
        ]),
      ).rejects.toThrow(/permission denied/i);
    } finally {
      await db.exec("reset role");
    }
    await db.query(
      "select public.brigo_community_moderate('creation',$1,true)",
      [p.id],
    );
    expect(await rpc("creation", { id: p.id }, OTHER)).toEqual({
      error: "NOT_FOUND",
    });
    await rpc("unpublish", { id: p.id });
    const again = await rpc("publish", { projectId });
    expect(await rpc("creation", { id: again.id }, OTHER)).toEqual({
      error: "NOT_FOUND",
    });
    expect((await rpc("mine")).creations[0].moderated).toBe(true);
  });
  it("refuses anonymous, unconfirmed and missing sessions and rate limits in the database", async () => {
    await db.query("update auth.users set is_anonymous=true where id=$1", [
      OTHER,
    ]);
    expect(await rpc("players", {}, OTHER)).toEqual({ error: "AUTH_REQUIRED" });
    await db.query("update auth.users set is_anonymous=false where id=$1", [
      OTHER,
    ]);
    expect(await rpc("players", {}, "")).toEqual({ error: "AUTH_REQUIRED" });
    await db.query(
      "update auth.users set email_confirmed_at=null where id=$1",
      [OTHER],
    );
    expect(await rpc("players", {}, OTHER)).toEqual({ error: "AUTH_REQUIRED" });
    await db.query(
      "update auth.users set email_confirmed_at=now() where id=$1",
      [OTHER],
    );
    await rpc("players");
    await db.query(
      "update public.brigo_community_windows set requests=120 where user_id=$1",
      [USER],
    );
    expect(await rpc("players")).toEqual({ error: "RATE_LIMITED" });
    await db.exec("set role anon");
    try {
      await expect(
        db.query("select public.brigo_community('players')"),
      ).rejects.toThrow(/permission denied/i);
    } finally {
      await db.exec("reset role");
    }
  });
});
