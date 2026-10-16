import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RECIPES } from "../game/catalog";
import {
  productionPerCycle,
  recipeProductionIntervalMs,
  recipeProductionPerDay,
} from "../game/production";
import { ProductionYield } from "./ProductionYield";

describe("rendement visible d’un plan", () => {
  it.each([1, 2, 4, 8])(
    "affiche la récolte de chaque cycle de %i h avant l’équivalent quotidien",
    (hours) => {
      const recipe = RECIPES.find(
        (item) => recipeProductionIntervalMs(item) === hours * 3_600_000,
      )!;
      const amount = productionPerCycle(recipe);
      const daily = recipeProductionPerDay(recipe);
      const html = renderToStaticMarkup(
        createElement(ProductionYield, { recipe }),
      );
      const cycleText = `+${amount} pièce${amount > 1 ? "s" : ""} / ${hours} h`;
      const dailyText = `Soit ${daily} pièces / jour`;

      expect(html).toContain(cycleText);
      expect(html).toContain(dailyText);
      expect(html.indexOf(cycleText)).toBeLessThan(html.indexOf(dailyText));
      expect(html).toContain(`Première récolte après ${hours} h`);
      expect(html).toContain("Réserve de 72 h.");
      expect(html).not.toContain("24 h, réserve");
    },
  );

  it("multiplie le lot et le total journalier par le nombre d’exemplaires sans rallonger leur cycle", () => {
    const recipe = RECIPES[0];
    const amount = productionPerCycle(recipe) * 3;
    const daily = recipeProductionPerDay(recipe) * 3;
    const hours = recipeProductionIntervalMs(recipe) / 3_600_000;
    const html = renderToStaticMarkup(
      createElement(ProductionYield, { recipe, copies: 3 }),
    );

    expect(html).toContain(`+${amount} pièces / ${hours} h`);
    expect(html).toContain(`Soit ${daily} pièces / jour · 3 exemplaires`);
    expect(html).toContain(`Première récolte après ${hours} h`);
  });
});
