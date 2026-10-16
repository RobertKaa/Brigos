import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createGame } from "../game/engine";

const USER = "10000000-0000-4000-8000-000000000001";
const OTHER = "20000000-0000-4000-8000-000000000002";
const HASH = "a".repeat(64);
let database: PGlite;
async function asRole<T>(
  role: "authenticated" | "anon" | "service_role",
  action: () => Promise<T>,
): Promise<T> {
  await database.exec(`set role ${role}`);
  try {
    return await action();
  } finally {
    await database.exec("reset role");
  }
}
async function load(user = USER, coins = 1200) {
  return (
    await database.query<{
      response: {
        state: { coins: number };
        revision: number;
        status: string;
        result: Record<string, unknown>;
      };
    }>("select public.brigo_load_game($1, $2::jsonb) as response", [
      user,
      JSON.stringify({ ...createGame(), coins }),
    ])
  ).rows[0].response;
}
async function commit(
  id: string,
  revision: number,
  coins: number,
  hash = HASH,
) {
  return (
    await database.query<{
      response: {
        status: string;
        revision: number;
        state: { coins: number };
        result: Record<string, unknown>;
      };
    }>(
      "select public.brigo_commit_command($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, $8::jsonb) as response",
      [
        USER,
        id,
        hash,
        revision,
        JSON.stringify({ ...createGame(), coins }),
        '{"receipt":"original"}',
        '{"type":"claim-visit"}',
        JSON.stringify({ coins: 75 }),
      ],
    )
  ).rows[0].response;
}
beforeAll(async () => {
  database = new PGlite();
  await database.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    create schema auth;
    create table auth.users(id uuid primary key, raw_user_meta_data jsonb not null default '{}'::jsonb);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated, service_role;
    grant usage on schema public to anon, authenticated, service_role;
  `);
  const migration = await readFile(
    new URL(
      "../../supabase/migrations/202610160001_brigo_accounts.sql",
      import.meta.url,
    ),
    "utf8",
  );
  await database.exec(migration);
  await database.query(
    "insert into auth.users(id, raw_user_meta_data) values ($1, $2::jsonb), ($3, '{}'::jsonb)",
    [USER, JSON.stringify({ display_name: "  Brigo\n" }), OTHER],
  );
}, 60_000);
afterAll(async () => {
  await database?.close();
});

describe("real PostgreSQL migration and transactional security (PGlite)", () => {
  it("initializes exactly once and gives each account a separate game", async () => {
    await asRole("service_role", async () => {
      expect((await load()).state.coins).toBe(1200);
      expect((await load(USER, 999999)).state.coins).toBe(1200);
      expect((await load(OTHER, 800)).state.coins).toBe(800);
      const initial = await database.query<{
        coins_before: number;
        coins_after: number;
      }>(
        "select * from public.brigo_economic_ledger where user_id=$1 and revision=0",
        [USER],
      );
      expect(initial.rows).toHaveLength(1);
      expect(Number(initial.rows[0].coins_before)).toBe(0);
      expect(Number(initial.rows[0].coins_after)).toBe(1200);
    });
  });
  it("enforces owner-only reads and denies every economic table write", async () => {
    await database.query(
      "select set_config('request.jwt.claim.sub', $1, false)",
      [USER],
    );
    await asRole("authenticated", async () => {
      const games = await database.query<{ user_id: string }>(
        "select user_id from public.brigo_games",
      );
      expect(games.rows.map((row) => row.user_id)).toEqual([USER]);
      const profiles = await database.query<{ display_name: string }>(
        "select display_name from public.brigo_profiles",
      );
      expect(profiles.rows).toEqual([{ display_name: "Brigo" }]);
      await expect(
        database.query("update public.brigo_games set revision = revision + 1"),
      ).rejects.toThrow(/permission denied/i);
      await expect(
        database.query(
          "insert into public.brigo_games(user_id, state) values ($1, '{}'::jsonb)",
          [OTHER],
        ),
      ).rejects.toThrow(/permission denied/i);
      await expect(
        database.query("delete from public.brigo_command_receipts"),
      ).rejects.toThrow(/permission denied/i);
      await expect(
        database.query(
          "update public.brigo_economic_ledger set coins_after = 999999",
        ),
      ).rejects.toThrow(/permission denied/i);
      await expect(
        database.query("select * from public.brigo_request_windows"),
      ).rejects.toThrow(/permission denied/i);
    });
    await asRole("anon", async () => {
      await expect(
        database.query("select * from public.brigo_games"),
      ).rejects.toThrow(/permission denied/i);
    });
  });
  it("never exposes privileged RPCs to authenticated or anonymous clients", async () => {
    for (const role of ["anon", "authenticated"] as const) {
      await asRole(role, async () => {
        await expect(load()).rejects.toThrow(/permission denied/i);
        await expect(commit(crypto.randomUUID(), 0, 1275)).rejects.toThrow(
          /permission denied/i,
        );
      });
    }
  });
  it("atomically commits a single receipt and ledger row; retries cannot change the result", async () => {
    await asRole("service_role", async () => {
      const id = crypto.randomUUID();
      expect((await commit(id, 0, 1275)).status).toBe("committed");
      const replayed = await commit(id, 0, 999999);
      expect(replayed.status).toBe("replayed");
      expect(replayed.state.coins).toBe(1275);
      expect(replayed.result).toEqual({ receipt: "original" });
      expect((await commit(id, 1, 999999, "b".repeat(64))).status).toBe(
        "command_id_reused",
      );
      const receipts = await database.query(
        "select * from public.brigo_command_receipts where user_id=$1 and committed_revision>0",
        [USER],
      );
      const ledger = await database.query<{
        coins_before: number;
        coins_after: number;
      }>(
        "select * from public.brigo_economic_ledger where user_id=$1 and revision>0",
        [USER],
      );
      expect(receipts.rows).toHaveLength(1);
      expect(ledger.rows).toHaveLength(1);
      expect(Number(ledger.rows[0].coins_before)).toBe(1200);
      expect(Number(ledger.rows[0].coins_after)).toBe(1275);
    });
  });
  it("rejects a stale competing revision and replays with the current state", async () => {
    await asRole("service_role", async () => {
      const id = crypto.randomUUID();
      expect((await commit(id, 1, 1300)).status).toBe("committed");
      expect((await commit(crypto.randomUUID(), 1, 9000)).status).toBe(
        "revision_conflict",
      );
      expect((await commit(id, 1, 9000)).state.coins).toBe(1300);
      expect((await load()).revision).toBe(2);
    });
  });
  it("rolls state and receipts back if ledger insertion fails", async () => {
    await asRole("service_role", async () => {
      const before = await load();
      const id = crypto.randomUUID();
      await expect(
        database.query(
          "select public.brigo_commit_command($1, $2, $3, $4, $5::jsonb, '{}'::jsonb, '{\"type\":\"claim-visit\"}'::jsonb, '{}'::jsonb)",
          [
            USER,
            id,
            HASH,
            before.revision,
            JSON.stringify({ version: 10, coins: null }),
          ],
        ),
      ).rejects.toThrow(/null value/i);
      expect((await load()).revision).toBe(before.revision);
      const receipt = await database.query(
        "select * from public.brigo_command_receipts where command_id=$1",
        [id],
      );
      expect(receipt.rows).toHaveLength(0);
    });
  });
  it("rolls the journal and receipt back if the final state exceeds its storage bound", async () => {
    await asRole("service_role", async () => {
      const before = await load();
      const id = crypto.randomUUID();
      await expect(
        database.query(
          "select public.brigo_commit_command($1, $2, $3, $4, $5::jsonb, '{}'::jsonb, '{\"type\":\"claim-visit\"}'::jsonb, '{}'::jsonb)",
          [
            USER,
            id,
            HASH,
            before.revision,
            JSON.stringify({ ...createGame(), padding: "x".repeat(3_000_000) }),
          ],
        ),
      ).rejects.toThrow(/check constraint/i);
      const after = await load();
      expect(after.revision).toBe(before.revision);
      expect(after.state.coins).toBe(before.state.coins);
      for (const table of ["brigo_command_receipts", "brigo_economic_ledger"]) {
        const rows = await database.query(
          `select * from public.${table} where command_id=$1`,
          [id],
        );
        expect(rows.rows).toHaveLength(0);
      }
    });
  });
  it("isolates receipt and journal reads from the other player", async () => {
    await database.query(
      "select set_config('request.jwt.claim.sub', $1, false)",
      [OTHER],
    );
    await asRole("authenticated", async () => {
      expect(
        (
          await database.query(
            "select * from public.brigo_command_receipts where committed_revision>0",
          )
        ).rows,
      ).toHaveLength(0);
      expect(
        (
          await database.query(
            "select * from public.brigo_economic_ledger where revision>0",
          )
        ).rows,
      ).toHaveLength(0);
    });
  });
  it("limits request bursts per account in the database", async () => {
    await asRole("service_role", async () => {
      await database.query(
        "update public.brigo_request_windows set requests=120,window_start=date_trunc('minute', clock_timestamp()) where user_id=$1",
        [OTHER],
      );
      expect((await load(OTHER)).status).toBe("rate_limited");
      expect((await load(USER)).status).toBe("loaded");
    });
  });
});
