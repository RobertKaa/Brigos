import { useState } from "react";
import { Coins, Recycle, ShoppingBag } from "lucide-react";
import type { Brigo, Recipe } from "../game/catalog";
import { recyclableCount, RECYCLE_VALUES } from "../game/recycling";
import { recipeOrderQuote } from "../game/market";
import type { Game } from "../screens/types";
import "./piece-economy.css";

export function RecyclePanel({ brigo, game }: { brigo: Brigo; game: Game }) {
  const [quantity, setQuantity] = useState(1);
  const max = Math.min(100_000, recyclableCount(game.state, brigo.id));
  const amount = Math.min(max, quantity);
  const value = RECYCLE_VALUES[brigo.rarity];
  if (!max) return null;
  return (
    <section
      className="piece-economy recycle-panel"
      aria-label="Recycler les doublons"
    >
      <h3>
        <Recycle size={18} />
        Une seconde vie pour vos doublons
      </h3>
      <p>
        {value} pièces par exemplaire. Un Brigo de cette référence reste dans
        votre collection ou dans une création.
      </p>
      <div className="recycle-controls">
        <label>
          Exemplaires à recycler
          <input
            type="number"
            min={1}
            max={max}
            step={1}
            value={amount}
            disabled={game.busy || !game.ready}
            onChange={(event) =>
              setQuantity(
                Math.max(
                  1,
                  Math.min(max, Math.floor(Number(event.target.value) || 1)),
                ),
              )
            }
          />
        </label>
        <button
          type="button"
          className="button button-secondary"
          disabled={game.busy || !game.ready}
          onClick={() =>
            void game.act(
              { type: "recycle", brigoId: brigo.id, quantity: amount },
              `${amount} doublon${amount > 1 ? "s" : ""} recyclé${amount > 1 ? "s" : ""} : +${amount * value} pièces.`,
            )
          }
        >
          <Recycle size={16} />
          Recycler · +{amount * value}
          <Coins size={14} />
        </button>
      </div>
      <small>
        Les pièces réservées dans vos créations sont protégées. Les doublons
        libres peuvent aussi servir à vos prochains plans.
      </small>
    </section>
  );
}

export function RecipeOrder({
  recipe,
  game,
  onNavigate,
}: {
  recipe: Recipe;
  game: Game;
  onNavigate?: () => void;
}) {
  const quote = recipeOrderQuote(game.state, recipe);
  if (!quote.count) return null;
  return (
    <section
      className="piece-economy recipe-order"
      aria-label="Commander les pièces du plan"
    >
      <h3>
        <ShoppingBag size={18} />
        Compléter ce plan
      </h3>
      <p>
        Complétez ce plan avec ses {quote.count} Brigo
        {quote.count > 1 ? "s" : ""} manquant{quote.count > 1 ? "s" : ""}. Les
        exemplaires déjà disponibles sont déduits.
      </p>
      <div className="order-price">
        <span>Coût de la commande</span>
        <strong>
          <Coins size={16} />
          {quote.cost.toLocaleString("fr-FR")} pièces
        </strong>
      </div>
      <button
        type="button"
        className="button button-secondary"
        disabled={game.busy || !game.ready || !quote.canAfford}
        onClick={() =>
          void game.act(
            { type: "order-parts", recipeId: recipe.id },
            `${quote.count} Brigos commandés pour ${quote.cost} pièces. Votre plan est prêt à assembler.`,
          )
        }
      >
        <ShoppingBag size={16} />
        {quote.canAfford
          ? "Commander les Brigos manquants"
          : "Monnaie insuffisante"}
      </button>
      {!quote.canAfford && (
        <small>
          Encore{" "}
          {Math.max(0, quote.cost - game.state.coins).toLocaleString("fr-FR")}{" "}
          pièces pour cette commande.
        </small>
      )}
      {!quote.canAfford && (
        <a
          href="#journal"
          className="text-link order-quests-link"
          onClick={onNavigate}
        >
          Gagner des pièces avec les quêtes
        </a>
      )}
    </section>
  );
}
