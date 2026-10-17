import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  BOXES,
  BOX_IDS,
  BOX_DROP_COUNT,
  CATALOG,
  RARITIES,
  RARITY_INFO,
} from "../game/catalog";
import { BoxArt } from "./BrigoArt";
import { BrigoCard } from "./BrigoCard";
import { CardBackArt } from "./CardBackArt";
import { OpeningChest } from "./OpeningChest";

function contrastRatio(foreground: string, background: string) {
  const luminance = (hex: string) => {
    const channels = [1, 3, 5].map((offset) => {
      const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
      return value <= 0.04045
        ? value / 12.92
        : ((value + 0.055) / 1.055) ** 2.4;
    });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  const first = luminance(foreground);
  const second = luminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

describe("cartes Brigo à l’encre", () => {
  it.each(RARITIES)(
    "nomme la rareté %s sans dépendre de sa couleur",
    (rarity) => {
      const brigo = CATALOG.find((piece) => piece.rarity === rarity)!;
      const view = renderToStaticMarkup(
        createElement(BrigoCard, {
          brigo,
          count: 2,
          reserved: 3,
          discovered: true,
          onClick: () => {},
        }),
      );
      expect(view).toContain(`rarity-${rarity}`);
      expect(view).toContain(
        `${RARITY_INFO[rarity].symbol} ${RARITY_INFO[rarity].name}`,
      );
      expect(view).toContain(
        `aria-label="${brigo.name}, ${RARITY_INFO[rarity].name}, 5 exemplaires"`,
      );
      expect(view).toContain("×5");
      expect(view).toContain("3 utilisé");
      expect(view).toContain('data-art-style="manga-ink"');
      expect(view).toContain('type="button"');
    },
  );

  it("garde une seule action clavier et transmet le clic une seule fois", () => {
    const onClick = vi.fn();
    const card = BrigoCard({ brigo: CATALOG[0], onClick, discovered: true });
    card.props.onClick();
    expect(onClick).toHaveBeenCalledTimes(1);
    const view = renderToStaticMarkup(card);
    expect(view.match(/<button\b/g)).toHaveLength(1);
    expect(view).not.toMatch(/tabindex=|<a\b|<input\b/);
  });

  it("distingue une pièce encore inconnue de l’aperçu du catalogue", () => {
    const view = renderToStaticMarkup(
      createElement(BrigoCard, {
        brigo: CATALOG[0],
        onClick: () => {},
      }),
    );
    const preview = renderToStaticMarkup(
      createElement(BrigoCard, {
        brigo: CATALOG[0],
        onClick: () => {},
        preview: true,
      }),
    );
    expect(view).toContain("undiscovered-lock");
    expect(view).toContain("rarity-common undiscovered");
    expect(preview).not.toContain("undiscovered-lock");
    expect(preview).not.toContain("rarity-common undiscovered");
  });
});

describe("illustrations imprimées originales et légères", () => {
  it.each(BOX_IDS)(
    "partage la palette de la boîte %s entre miniature et coffre animé",
    (kind) => {
      const { color, palette } = BOXES[kind];
      const illustration = renderToStaticMarkup(
        createElement(BoxArt, { kind }),
      );
      const chest = renderToStaticMarkup(
        createElement(OpeningChest, { kind, count: BOX_DROP_COUNT }),
      );

      for (const [token, value] of Object.entries({
        color,
        shadow: palette.shadow,
        light: palette.light,
        trim: palette.trim,
      })) {
        expect(illustration).toContain(`fill="${value}"`);
        expect(chest).toContain(`--chest-${token}:${value}`);
      }
      expect(chest).toContain(`${BOX_DROP_COUNT} BRIGOS`);
    },
  );

  it.each(BOX_IDS)(
    "garde les textes de la boîte %s lisibles sur leurs surfaces imprimées",
    (kind) => {
      const { color, palette } = BOXES[kind];
      expect(contrastRatio("#242320", color)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio("#fff2d2", palette.shadow)).toBeGreaterThanOrEqual(
        4.5,
      );
    },
  );

  it.each(["discovery", "workshop", "prism"] as const)(
    "garde la boîte %s vectorielle, décorative et fidèle à son contenu",
    (kind) => {
      const view = renderToStaticMarkup(createElement(BoxArt, { kind }));
      expect(view).toContain(`${BOX_DROP_COUNT} CARTES`);
      expect(view).toContain('aria-hidden="true"');
      expect(view).toContain('focusable="false"');
      expect(view).toContain('data-art-style="manga-ink"');
      expect(view).not.toMatch(/<filter\b|<pattern\b|src=|Club|CLUB/);
      expect(view.match(/<image\b/g)).toHaveLength(1);
      expect(view.match(/href="[^"]+"/g)).toEqual([
        expect.stringMatching(/^href="data:image\/svg\+xml,/),
      ]);
      // All accents and hatching share paths: no per-dot or per-line SVG trees.
      expect(view.match(/<(?:path|text|g|svg)\b/g)!.length).toBeLessThan(40);
    },
  );

  it("réutilise un dos compact sans identifiants partagés ni images externes", () => {
    const view = renderToStaticMarkup(
      createElement(CardBackArt, {
        className: "fixture-card-back",
      }),
    );
    expect(view).toContain('class="card-back-art fixture-card-back"');
    expect(view).toContain('aria-hidden="true"');
    expect(view).toContain('focusable="false"');
    expect(view).not.toMatch(/<filter\b|id=|url\(|<text\b/);
    expect(view).toContain('data-brand-mark="built-brigos"');
    expect(view.match(/<image\b/g)).toHaveLength(1);
    expect(view.match(/href="[^"]+"/g)).toEqual([
      expect.stringMatching(/^href="data:image\/svg\+xml,/),
    ]);
    expect(view.match(/<path\b/g)!.length).toBeLessThan(12);
  });
});
