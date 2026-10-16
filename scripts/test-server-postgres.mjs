// Optional real multi-connection lock test against a disposable Supabase/Postgres
// test database which already has the committed migration. Never a player DB.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

const databaseUrl = process.env.BRIGO_TEST_DATABASE_URL;
if (!databaseUrl || process.env.BRIGO_RUN_DATABASE_TESTS !== "1") {
  console.error(
    "Set BRIGO_TEST_DATABASE_URL and BRIGO_RUN_DATABASE_TESTS=1 for an isolated test database with psql installed.",
  );
  process.exit(1);
}
function query(sql) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "psql",
      [
        "--no-psqlrc",
        "--quiet",
        "--tuples-only",
        "--no-align",
        "--set=ON_ERROR_STOP=1",
      ],
      {
        env: { ...process.env, PGDATABASE: databaseUrl },
        shell: false,
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
    let output = "";
    child.stdout.on("data", (chunk) => {
      output += chunk;
    });
    // Database diagnostics may contain private connection data: do not emit them.
    child.stderr.on("data", () => {});
    child.on("error", () =>
      reject(new Error("psql is unavailable; install the PostgreSQL client.")),
    );
    child.on("exit", (code) =>
      code === 0
        ? resolve(output.trim())
        : reject(new Error("PostgreSQL integration query failed.")),
    );
    child.stdin.end(sql);
  });
}
const user = randomUUID();
const commandA = randomUUID();
const commandB = randomUUID();
const repeatedId = randomUUID();
const initial = JSON.stringify({
  version: 10,
  coins: 1200,
  boxes: { discovery: 3 },
  inventory: {},
});
function commit(id, revision, coins) {
  return `begin; set local role service_role;
    select public.brigo_commit_command('${user}', '${id}', '${"a".repeat(64)}', ${revision},
      '${JSON.stringify({ version: 10, coins, boxes: { discovery: 3 }, inventory: {} })}'::jsonb,
      '{"verified":true}'::jsonb, '{"type":"integration-check"}'::jsonb, '{}'::jsonb);
    select pg_sleep(0.15); commit;`;
}
function result(output) {
  return JSON.parse(
    output.split("\n").find((line) => line.trim().startsWith("{")),
  );
}
try {
  await query(`insert into auth.users(id, raw_user_meta_data) values ('${user}', '{}'::jsonb);
    set role service_role; select public.brigo_load_game('${user}', '${initial}'::jsonb);`);
  const competing = await Promise.all([
    query(commit(commandA, 0, 1100)),
    query(commit(commandB, 0, 1100)),
  ]);
  assert.deepEqual(competing.map((output) => result(output).status).sort(), [
    "committed",
    "revision_conflict",
  ]);
  const duplicate = await Promise.all([
    query(commit(repeatedId, 1, 1200)),
    query(commit(repeatedId, 1, 1200)),
  ]);
  assert.deepEqual(duplicate.map((output) => result(output).status).sort(), [
    "committed",
    "replayed",
  ]);
  const final = result(
    await query(
      `set role service_role; select public.brigo_load_game('${user}', '${initial}'::jsonb);`,
    ),
  );
  assert.equal(final.state.coins, 1200);
  assert.equal(final.revision, 2);
  console.log(
    "Brigo PostgreSQL: simultaneous spend, simultaneous retry and row locks passed.",
  );
} finally {
  await query(`delete from auth.users where id = '${user}';`);
}
