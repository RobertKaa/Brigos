// Generated engine is bundled from the SAME typed commands as the local game.
// Run npm run server:bundle before `supabase functions serve/deploy game`.
// @ts-ignore generated file intentionally ignored by Git
import {
  createGameHandler,
  createSupabaseRepository,
  readSupabaseServerKeys,
} from "./generated/server.js";

const required = (name: string): string => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing server configuration: ${name}`);
  return value;
};
const repository = createSupabaseRepository({
  url: required("SUPABASE_URL"),
  ...readSupabaseServerKeys((name: string) => Deno.env.get(name)),
});
const handler = createGameHandler({
  repository,
  allowedOrigins: required("BRIGO_ALLOWED_ORIGINS")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
  logError: (code: string) => console.error(code),
});
Deno.serve(handler);
