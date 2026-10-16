import { LockKeyhole } from "lucide-react";
import type { Brigo } from "../game/catalog";
import { RARITY_INFO } from "../game/catalog";
import { BrigoArt } from "./BrigoArt";
import "./brigo-card.css";

export function BrigoCard({
  brigo,
  count = 0,
  reserved = 0,
  discovered = false,
  onClick,
  preview = false,
}: {
  brigo: Brigo;
  count?: number;
  reserved?: number;
  discovered?: boolean;
  onClick: () => void;
  preview?: boolean;
}) {
  return (
    <button
      type="button"
      className={`brigo-card collectible-card rarity-${brigo.rarity} ${!discovered && !preview ? "undiscovered" : ""}`}
      data-art-style="manga-ink"
      onClick={onClick}
      aria-label={`${brigo.name}, ${RARITY_INFO[brigo.rarity].name}, ${count + reserved} exemplaire${count + reserved > 1 ? "s" : ""}`}
    >
      <div className="brigo-card-image">
        <span className="brigo-card-print" aria-hidden="true">
          BRIGO
        </span>
        <span className="catalog-number">
          #{String(brigo.number).padStart(3, "0")}
        </span>
        {count + reserved > 0 ? (
          <span className="quantity">×{count + reserved}</span>
        ) : (
          !preview && <LockKeyhole size={13} className="undiscovered-lock" />
        )}
        <BrigoArt brigo={brigo} />
        <span className="brigo-card-rarity-mark" aria-hidden="true">
          {RARITY_INFO[brigo.rarity].symbol}
        </span>
      </div>
      <div className="brigo-card-content">
        <span className="rarity-label">
          {RARITY_INFO[brigo.rarity].symbol} {RARITY_INFO[brigo.rarity].name}
        </span>
        <strong>{brigo.model.name}</strong>
        <span className="piece-color">
          <i style={{ background: brigo.color.hex }} />
          {brigo.color.name}
          {reserved > 0 && (
            <span className="reserved-count">
              {reserved} utilisé{reserved > 1 ? "s" : ""}
            </span>
          )}
        </span>
      </div>
    </button>
  );
}
