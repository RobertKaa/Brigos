import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { CATALOG, RARITIES, RARITY_INFO } from "../game/catalog";
import type { Opening } from "../game/engine";
import { OpeningModal } from "./OpeningModal";

function renderOpening(
  count: number,
  options: {
    reducedMotion?: boolean;
    busy?: boolean;
    allRarities?: boolean;
  } = {},
) {
  const opening: Opening = {
    id: "saved-box",
    boxId: "discovery",
    createdAt: "2026-10-09T12:00:00.000Z",
    drops: Array.from({ length: count }, (_, index) => ({
      brigoId: (options.allRarities
        ? CATALOG.find(
            (brigo) => brigo.rarity === RARITIES[index % RARITIES.length],
          )!
        : CATALOG[index]
      ).id,
      isNew: true,
    })),
  };
  return renderToStaticMarkup(
    createElement(OpeningModal, {
      opening,
      reducedMotion: options.reducedMotion ?? true,
      busy: options.busy ?? false,
      boxes: { discovery: 2, workshop: 0, prism: 0 },
      coins: 500,
      onOpenNext: () => {},
      onClose: () => {},
      onCollection: () => {},
    }),
  );
}

describe("plateau de découvertes accessible", () => {
  it.each([5, 10])(
    "affiche %i cartes et compteurs fidèles à une ouverture sauvegardée",
    (count) => {
      const markup = renderOpening(count);
      expect(markup).not.toContain("CLUB");
      expect(
        markup.match(/aria-label="Révéler le Brigo \d+ : halo [^"]+"/g),
      ).toHaveLength(count);
      expect(markup).toContain(
        `aria-label="Les ${count} Brigos de cette boîte"`,
      );
      expect(markup).toContain(`aria-label="0 Brigos révélés sur ${count}"`);
      expect(markup).toContain("Tout révéler");
      expect(markup).toContain("Une à une");
      expect(markup).not.toContain("chest-world");
    },
  );

  it("permet de passer ou révéler directement pendant l’animation 3D", () => {
    const markup = renderOpening(10, { reducedMotion: false });
    expect(markup).toContain("chest-lid");
    expect(markup).toContain("10 BRIGOS");
    expect(markup).toContain("Passer l’animation");
    expect(markup).toContain("Tout révéler");
    expect(markup).not.toContain("reveal-card is-hidden");
  });

  it("garde les noms et couleurs des pièces secrets avant le choix d’une carte", () => {
    const markup = renderOpening(10);
    expect(markup).not.toContain(CATALOG[0].name);
    expect(markup).not.toContain("opening-card-front");
    expect(markup).not.toContain("drop-label new");
  });

  it("distingue les cinq raretés sur les dos de cartes avec un halo, un symbole et un nom accessibles", () => {
    const markup = renderOpening(5, { allRarities: true });
    for (const [index, rarity] of RARITIES.entries()) {
      expect(markup).toContain(`reveal-card rarity-${rarity} is-hidden`);
      expect(markup).toContain(
        `aria-label="Révéler le Brigo ${index + 1} : halo ${RARITY_INFO[rarity].name}"`,
      );
      expect(markup).toContain(RARITY_INFO[rarity].symbol);
    }
    expect(markup.match(/opening-card-face opening-card-back/g)).toHaveLength(
      5,
    );
    expect(markup).toContain(
      'aria-label="Les cinq raretés, identifiables par leur halo, leur symbole et leur nom"',
    );
  });

  it("fait sortir des cartes illustrées de la boîte au lieu de connecteurs de jouet", () => {
    const markup = renderOpening(10, { reducedMotion: false });
    expect(markup).toContain('class="chest-flying-cards"');
    expect(markup).toContain('class="chest-paper-band"');
    expect(markup).not.toContain("chest-flying-pieces");
    expect(markup).not.toContain("<b></b>");
  });

  it("rend les cartes et commandes de révélation indisponibles pendant une écriture", () => {
    const markup = renderOpening(10, { busy: true });
    expect(markup.match(/aria-disabled="true"/g)).toHaveLength(10);
    expect(markup.match(/disabled=""/g)).toHaveLength(2);
  });
});
