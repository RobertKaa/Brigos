import { Coins } from "lucide-react";
import type { Recipe } from "../game/catalog";
import {
  productionPerCycle,
  PRODUCTION_RESERVE_MS,
  recipeProductionIntervalMs,
  recipeProductionPerDay,
} from "../game/production";
import "./production-yield.css";

export function ProductionYield({
  recipe,
  copies = 1,
}: {
  recipe: Recipe;
  copies?: number;
}) {
  const amount = productionPerCycle(recipe) * copies;
  const daily = recipeProductionPerDay(recipe) * copies;
  const hours = recipeProductionIntervalMs(recipe) / 3_600_000;
  const reserveHours = PRODUCTION_RESERVE_MS / 3_600_000;
  return (
    <span
      className="production-yield"
      title={`Monnaie produite par les exemplaires exposés. Première récolte après ${hours} h, puis un lot à chaque cycle. Réserve de ${reserveHours} h.`}
    >
      <span className="production-yield-main">
        <Coins size={14} aria-hidden="true" /> +{amount.toLocaleString("fr-FR")}{" "}
        pièce{amount > 1 ? "s" : ""} / {hours} h
      </span>
      <span className="production-yield-daily">
        Soit {daily.toLocaleString("fr-FR")} pièces / jour
        {copies > 1 && ` · ${copies.toLocaleString("fr-FR")} exemplaires`}
      </span>
    </span>
  );
}
