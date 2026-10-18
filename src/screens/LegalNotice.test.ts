import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LegalNotice } from "./LegalNotice";

describe("mentions légales", () => {
  it("signale les informations manquantes sans inventer de coordonnées", () => {
    const html = renderToStaticMarkup(
      createElement(LegalNotice, { publisher: null }),
    );
    expect(html).toContain("Version de travail");
    expect(html).toContain("avant publication");
    expect(html).not.toContain("mailto:");
    expect(html).toContain('href="#boxes"');
    expect(html).toContain("Cloudflare, Inc.");
    expect(html).toContain("GitHub Pages");
    expect(html).not.toContain("Brigos Club");
  });

  it("affiche les coordonnées confirmées sous forme de texte et un contact utilisable", () => {
    const html = renderToStaticMarkup(
      createElement(LegalNotice, {
        returnHref: "#workshop?view=built",
        publisher: {
          name: "Éditeur <exemple>",
          status: "Entreprise individuelle",
          address: "Adresse de test",
          phone: "Téléphone de test",
          publicationDirector: "Responsable de test",
          registration: "Immatriculation de test",
        },
      }),
    );
    expect(html).not.toContain("Version de travail");
    expect(html).toContain("Éditeur &lt;exemple&gt;");
    expect(html).toContain('href="#contact"');
    expect(html).toContain('href="#workshop?view=built"');
    expect(html).toContain("Immatriculation de test");
  });
  it("publie uniquement le pseudo fourni et dirige vers le formulaire", () => {
    const html = renderToStaticMarkup(createElement(LegalNotice));
    expect(html).toContain("TreborKaa");
    expect(html).toContain('href="#contact"');
    expect(html).not.toContain("mailto:");
    expect(html).not.toContain("gmail.com");
    expect(html).not.toContain("Version de travail");
  });
});
