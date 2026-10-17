import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BrigoLogo } from "./BrigoLogo";
import { BRIGO_WORDMARK_PATH, BRIGO_WORDMARK_WIDTH } from "./brandPaths";

describe("identité publique Brigos", () => {
  it("réserve la largeur du s final dans toutes les déclinaisons du mot-symbole", () => {
    // The original five-letter outline ended at x=186.21. The final s uses the
    // same font and baseline, so it must extend the viewport rather than clip.
    expect(BRIGO_WORDMARK_PATH).toContain("M204.63 59.4Q201.08 59.4");
    expect(BRIGO_WORDMARK_WIDTH).toBeGreaterThan(186.21);
    for (const [variant, offset] of [
      ["full", 86],
      ["wordmark", 0],
    ] as const) {
      const markup = renderToStaticMarkup(
        createElement(BrigoLogo, { variant }),
      );
      expect(markup).toContain(
        `viewBox="0 0 ${offset + BRIGO_WORDMARK_WIDTH} 82"`,
      );
      expect(markup).toContain(`d="${BRIGO_WORDMARK_PATH}"`);
    }
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
