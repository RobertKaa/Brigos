import { spawnSync } from "node:child_process";
import { copyFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { build, loadEnv } from "vite";

const root = fileURLToPath(new URL("../", import.meta.url));
process.env.NODE_ENV = "production";
const environment = loadEnv("production", root, "VITE_");
const url = environment.VITE_SUPABASE_URL?.trim();
const key = environment.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

// This release targets the existing Brigos project, with a public browser key.
if (url !== "https://zqhnbygwxfqjtbfeuiyg.supabase.co") {
  throw new Error("Configure the public Brigos Supabase URL before building.");
}
if (!/^sb_publishable_[A-Za-z0-9_-]{20,256}$/.test(key ?? "")) {
  throw new Error("A Supabase publishable key is required for this release.");
}

// Vite includes import.meta.env in the client. Only these public settings belong
// in this release; other VITE_* variables from the shell/files are excluded.
for (const name of Object.keys(process.env)) {
  if (name.startsWith("VITE_")) delete process.env[name];
}
Object.assign(process.env, {
  VITE_SUPABASE_URL: url,
  VITE_SUPABASE_PUBLISHABLE_KEY: key,
  VITE_AUTH_REDIRECT_URL: "https://brigoslab.com/#account",
  VITE_AUTH_GOOGLE_ENABLED: "false",
  VITE_BASE_PATH: "/",
});

process.chdir(root);
const check = spawnSync(
  process.execPath,
  [resolve(root, "node_modules/typescript/bin/tsc"), "-b"],
  { stdio: "inherit" },
);
if (check.error) throw check.error;
if (check.status !== 0) process.exit(check.status ?? 1);

await build({ mode: "production", base: "/", envDir: false });
await copyFile(resolve(root, "scripts/cloudflare-404.html"), resolve(root, "dist/404.html"));
console.log(
  "Cloudflare bundle prepared for https://brigoslab.com. No upload or deployment.",
);
