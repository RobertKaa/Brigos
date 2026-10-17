import { build } from "esbuild";
import { mkdir } from "node:fs/promises";

await mkdir(new URL("../supabase/functions/game/generated/", import.meta.url), {
  recursive: true,
});
await build({
  stdin: {
    contents:
      'export { createGameHandler } from "./src/server/gameService.ts"; export { createSupabaseRepository, readSupabaseServerKeys } from "./src/server/supabaseRepository.ts";',
    resolveDir: process.cwd(),
    sourcefile: "server-entry.ts",
    loader: "ts",
  },
  outfile: "supabase/functions/game/generated/server.js",
  bundle: true,
  platform: "neutral",
  format: "esm",
  target: "es2022",
  sourcemap: false,
  minify: true,
});
console.log("Brigos : moteur serveur préparé pour Supabase Edge Functions.");
