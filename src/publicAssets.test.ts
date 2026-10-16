import { describe, expect, it } from "vitest";
import { publicAssetUrl } from "./publicAssets";

describe("ressources publiques sous le chemin de déploiement", () => {
  it("conserve les chemins historiques à la racine", () => {
    expect(publicAssetUrl("/constructions/totem.webp", "/")).toBe(
      "/constructions/totem.webp",
    );
  });
  it("charge les aperçus depuis le sous-dossier GitHub Pages", () => {
    expect(publicAssetUrl("/constructions/totem.webp", "/Brigos/")).toBe(
      "/Brigos/constructions/totem.webp",
    );
    expect(publicAssetUrl("constructions/totem.webp", "/Brigos")).toBe(
      "/Brigos/constructions/totem.webp",
    );
  });
});
