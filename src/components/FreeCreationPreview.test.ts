import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  FreeCreationPreview,
  freeCreationPreview,
} from "./FreeCreationPreview";
import type { SandboxProject } from "../game/sandbox";

const project: SandboxProject = {
  id: "preview",
  name: '<script>alert("x")</script>',
  createdAt: "2026-10-18T12:00:00Z",
  updatedAt: "2026-10-18T12:00:00Z",
  placements: Array.from({ length: 500 }, (_, index) => ({
    id: `p-${index}`,
    brigoId: "plate-6x6:blue",
    x: (index % 4) * 6,
    y: (Math.floor(index / 4) % 4) * 6,
    z: Math.floor(index / 16),
    rotation: 0,
  })),
};
describe("aperçus légers des créations libres", () => {
  it("affiche 500 Brigos avec une seule image sans charger la scène 3D ni injecter le nom dans le SVG", () => {
    const uri = freeCreationPreview(project, 0)!;
    const svg = decodeURIComponent(uri.split(",")[1]);
    expect(svg).not.toContain(project.name);
    expect(svg).not.toContain("<script");
    expect(svg.match(/<use /g)).toHaveLength(500);
    const markup = renderToStaticMarkup(
      createElement(FreeCreationPreview, { project }),
    );
    expect(markup.match(/<img /g)).toHaveLength(1);
    expect(markup).not.toContain("<svg");
    expect(markup).not.toContain("<canvas");
  });
  it("conserve l’aperçu au renommage et le renouvelle quand l’angle ou une pièce change", () => {
    const original = freeCreationPreview(project, 0);
    expect(freeCreationPreview({ ...project, name: "Autre nom" }, 0)).toBe(
      original,
    );
    expect(freeCreationPreview(project, 90)).not.toBe(original);
    expect(
      freeCreationPreview(
        { ...project, placements: project.placements.slice(0, -1) },
        0,
      ),
    ).not.toBe(original);
    expect(freeCreationPreview({ ...project, placements: [] }, 0)).toBeNull();
  });
});
