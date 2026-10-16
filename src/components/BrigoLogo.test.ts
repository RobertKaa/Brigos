import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BrigoLogo } from "./BrigoLogo";

describe("identité publique Brigo", () => {
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
