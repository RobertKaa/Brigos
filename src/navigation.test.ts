import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { readAppRoute } from "./navigation";
import { AppNavigation } from "./components/AppNavigation";

describe("navigation des parcours", () => {
  it.each(["boxes", "workshop", "sandbox", "collection", "journal"] as const)(
    "garde un accès direct et un seul état actif pour %s",
    (view) => {
      const html = renderToStaticMarkup(createElement(AppNavigation, { view }));
      expect(html.match(/<a /g)).toHaveLength(5);
      expect(html.match(/aria-current="page"/g)).toHaveLength(1);
      expect(html).toContain(
        `href="#${view}" class="active" aria-current="page"`,
      );
      expect(readAppRoute(`#${view}`).view).toBe(view);
    },
  );
  it("ouvre directement la récolte ou les plans prêts, sans modifier les anciennes adresses", () => {
    expect(readAppRoute("#workshop?view=built")).toEqual({
      view: "workshop",
      workshopView: "built",
    });
    expect(readAppRoute("#workshop?view=ready")).toEqual({
      view: "workshop",
      workshopView: "plans",
      workshopFilter: "ready",
    });
    expect(readAppRoute("#workshop")).toEqual({
      view: "workshop",
      workshopView: "plans",
    });
  });
  it.each(["", "#", "#missing", "#%3Cscript%3E", "#javascript:alert(1)"])(
    "réduit une destination inconnue aux boîtes : %s",
    (hash) => {
      expect(readAppRoute(hash)).toEqual({
        view: "boxes",
        workshopView: "plans",
      });
    },
  );
  it("ignore les paramètres de parcours non autorisés et hors atelier", () => {
    expect(readAppRoute("#collection?view=built")).toEqual({
      view: "collection",
      workshopView: "plans",
    });
    expect(readAppRoute("#workshop?view=https://example.com")).toEqual({
      view: "workshop",
      workshopView: "plans",
    });
  });
});
