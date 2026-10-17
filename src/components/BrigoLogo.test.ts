import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BrigoAppIcon, BrigoLogo } from "./BrigoLogo";
import { BRIGO_SUFFIX_PATH, BRIGO_WORDMARK_PATH } from "./brandPaths";
import { BUILT_MONOGRAM_COLOR, BUILT_MONOGRAM_MONO } from "./builtMonogram";
import drawing from "./brigo-monogram.json";
import { prepareBrigoMonogram } from "./brigoMonogram";

describe("identité publique Brigos", () => {
  it.each(["full", "wordmark", "mark"] as const)(
    "utilise le même B construit sans doublon ni centaines de nœuds : %s",
    (variant) => {
      const markup = renderToStaticMarkup(
        createElement(BrigoLogo, { variant }),
      );
      expect(markup).toContain('data-brand-mark="built-brigos"');
      expect(markup).toContain('aria-hidden="true"');
      expect(markup).toContain('focusable="false"');
      expect(markup.match(/<image\b/g)).toHaveLength(1);
      expect(markup.match(/<path\b/g) ?? []).toHaveLength(
        variant === "mark" ? 0 : 1,
      );
      expect(markup).not.toContain(`d="${BRIGO_WORDMARK_PATH}"`);
      if (variant !== "mark")
        expect(markup).toContain(`d="${BRIGO_SUFFIX_PATH}"`);
    },
  );

  it("garde le dessin préparé synchronisé avec les vraies pièces et leur rendu", () => {
    expect(drawing).toEqual(prepareBrigoMonogram());
  });

  it.each([BUILT_MONOGRAM_COLOR, BUILT_MONOGRAM_MONO])(
    "embarque une image vectorielle statique sans ressource externe",
    (source) => {
      const svg = decodeURIComponent(
        source.slice("data:image/svg+xml,".length),
      );
      expect(svg).toContain(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${drawing.viewBox}">`,
      );
      expect(svg).not.toMatch(
        /<script|<foreignObject|\b(?:href|src|onload|onclick)=/i,
      );
      expect(svg.match(/<path\b/g)).toHaveLength(
        drawing.paths.filter(
          (path) => path.role !== "hatching" && path.role !== "brush",
        ).length,
      );
    },
  );

  it("conserve le même B dans l’icône exportée du navigateur", () => {
    const markup = renderToStaticMarkup(createElement(BrigoAppIcon));
    expect(markup).toContain(BUILT_MONOGRAM_COLOR);
    expect(
      readFileSync(
        new URL("../../public/favicon.svg", import.meta.url),
        "utf8",
      ),
    ).toBe(markup);
  });

  it.each([
    ["brigo-logo", {}],
    ["brigo-logo-light", { tone: "light" }],
    ["brigo-wordmark", { variant: "wordmark", tone: "mono" }],
    ["brigo-mark", { variant: "mark" }],
  ] as const)(
    "garde l’asset %s synchronisé avec le logo de l’interface",
    (name, props) => {
      const exported = readFileSync(
        new URL(`../../public/branding/${name}.svg`, import.meta.url),
        "utf8",
      );
      expect(exported).toBe(
        renderToStaticMarkup(createElement(BrigoLogo, props)),
      );
      expect(exported).not.toContain("brigo-logo-club");
    },
  );
});
