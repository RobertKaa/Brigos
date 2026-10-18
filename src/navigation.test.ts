import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { appRouteHref, isInformationView, readAppRoute } from "./navigation";
import { AppNavigation } from "./components/AppNavigation";

describe("navigation des galeries communautaires", () => {
  const id = "10000000-0000-4000-8000-000000000001";
  it.each([
    "#community",
    "#community?tab=players&q=Trebor&page=2",
    `#community?tab=players&q=Trebor&page=2&galleryPage=2&player=${id}&creation=${id}`,
    "#community?tab=mine",
  ])("conserve les retours et filtres : %s", (hash) => {
    expect(appRouteHref(readAppRoute(hash))).toBe(hash);
  });
  it("ignore les identifiants, pages et destinations non autorisés", () => {
    expect(
      appRouteHref(
        readAppRoute(
          "#community?tab=script&page=-1&galleryPage=1001&player=%3Cscript%3E&creation=javascript:alert(1)",
        ),
      ),
    ).toBe("#community");
    expect(readAppRoute("#community?q=%E2%80%AEabc").communityQuery).toBe(
      "abc",
    );
    expect(
      readAppRoute("#community?q=" + "a".repeat(100)).communityQuery,
    ).toHaveLength(40);
    expect(readAppRoute(`#sandbox?player=${id}`)).not.toHaveProperty(
      "communityPlayerId",
    );
  });
});

describe("navigation des parcours", () => {
  it.each([
    "#sandbox?view=build",
    "#sandbox?view=build&project=project-1",
    "#sandbox?view=exhibit&project=project-2",
  ])("conserve la vue Libre et son projet : %s", (hash) => {
    expect(appRouteHref(readAppRoute(hash))).toBe(hash);
  });
  it("ignore les projets et vues Libre non autorisés", () => {
    expect(
      appRouteHref(readAppRoute("#sandbox?view=build&project=%3Cscript%3E")),
    ).toBe("#sandbox?view=build");
    expect(
      appRouteHref(readAppRoute("#sandbox?view=https://example.com")),
    ).toBe("#sandbox");
    expect(
      readAppRoute("#boxes?view=build&project=project-1"),
    ).not.toHaveProperty("sandboxView");
  });
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
  it.each(["mentions-legales", "contact", "faq"] as const)(
    "ouvre la page %s sans ajouter de destination principale",
    (view) => {
      const route = readAppRoute(`#${view}?view=built`);
      expect(route).toEqual({ view, workshopView: "plans" });
      expect(isInformationView(route.view)).toBe(true);
      const html = renderToStaticMarkup(createElement(AppNavigation, route));
      expect(html.match(/<a /g)).toHaveLength(5);
      expect(html).not.toContain('aria-current="page"');
      expect(appRouteHref(route)).toBe(`#${view}`);
    },
  );
  it.each([
    "#boxes",
    "#workshop",
    "#workshop?view=built",
    "#workshop?view=ready",
    "#collection",
    "#journal",
    "#sandbox",
  ])("conserve une destination de retour autorisée : %s", (hash) => {
    expect(appRouteHref(readAppRoute(hash))).toBe(hash);
    expect(isInformationView(readAppRoute(hash).view)).toBe(false);
  });
});
