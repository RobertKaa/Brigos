import { describe, expect, it } from "vitest";
import { authRedirectUrl, readAuthConfiguration } from "./client";

const anon = `header.${btoa(JSON.stringify({ role: "anon" }))}.signature`;
describe("configuration publique Auth", () => {
  it("reste désactivée si le projet manque", () => {
    expect(readAuthConfiguration({})).toBeNull();
  });
  it("accepte les clés publiables et l’ancienne clé anon", () => {
    expect(
      readAuthConfiguration({
        VITE_SUPABASE_URL: "https://project.supabase.co/",
        VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_public",
      }),
    ).toEqual({
      url: "https://project.supabase.co",
      key: "sb_publishable_public",
    });
    expect(
      readAuthConfiguration({
        VITE_SUPABASE_URL: "http://127.0.0.1:54321",
        VITE_SUPABASE_ANON_KEY: anon,
      }),
    ).not.toBeNull();
  });
  it("rejette les clés secrètes ou service_role et les URL non sécurisées", () => {
    for (const key of [
      "sb_secret_sensitive",
      `header.${btoa(JSON.stringify({ role: "service_role" }))}.signature`,
      "garbage",
    ]) {
      expect(
        readAuthConfiguration({
          VITE_SUPABASE_URL: "https://project.supabase.co",
          VITE_SUPABASE_PUBLISHABLE_KEY: key,
        }),
      ).toBeNull();
    }
    for (const url of [
      "http://public.example",
      "javascript:alert(1)",
      "https://user:password@example.test",
      "https://project.supabase.co?token=secret",
    ]) {
      expect(
        readAuthConfiguration({
          VITE_SUPABASE_URL: url,
          VITE_SUPABASE_ANON_KEY: anon,
        }),
      ).toBeNull();
    }
  });
  it("redirige vers Mon compte sans recopier un code, un jeton ou un fragment de la page", () => {
    expect(
      authRedirectUrl(
        undefined,
        "https://brigo.example/game/?code=sensitive#access_token=secret",
      ),
    ).toBe("https://brigo.example/game/#account");
    expect(
      authRedirectUrl(
        "https://brigo.example/app/?code=stale#boxes",
        "http://localhost:5173/",
      ),
    ).toBe("https://brigo.example/app/#account");
    expect(
      authRedirectUrl("javascript:alert(1)", "http://localhost:5173/"),
    ).toBe("http://localhost:5173/#account");
  });
});
