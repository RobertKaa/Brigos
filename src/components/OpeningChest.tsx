import type { CSSProperties } from "react";
import { Sparkles } from "lucide-react";
import { BOXES } from "../game/catalog";
import type { BoxId, Rarity } from "../game/catalog";
import { RARITIES } from "../game/catalog";
import { BrigoLogo } from "./BrigoLogo";
import { CardBackArt } from "./CardBackArt";

/** An illustrated paper box releases collectible cards, using lightweight CSS volumes. */
export function OpeningChest({
  kind,
  count,
  rarities,
}: {
  kind: BoxId;
  count: number;
  rarities?: Rarity[];
}) {
  const { color, palette } = BOXES[kind];
  return (
    <div
      className={`opening-theatre opening-theatre-${kind}`}
      aria-hidden="true"
      style={
        {
          "--chest-color": color,
          "--chest-shadow": palette.shadow,
          "--chest-light": palette.light,
          "--chest-trim": palette.trim,
        } as CSSProperties
      }
    >
      <div className="chest-orbit chest-orbit-one" />
      <div className="chest-orbit chest-orbit-two" />
      <div className="chest-floor-light" />
      <div className="chest-light-column" />
      <div className="chest-world">
        <div className="chest-shadow" />
        <div className="chest-cube">
          <div className="chest-face chest-face-front">
            <span className="chest-brand">
              <BrigoLogo variant="wordmark" tone="mono" />
            </span>
            <span className="chest-edition">{BOXES[kind].name}</span>
            <span className="chest-stamp">{count} BRIGOS</span>
          </div>
          <div className="chest-face chest-face-back" />
          <div className="chest-face chest-face-left" />
          <div className="chest-face chest-face-right">
            <Sparkles size={35} />
          </div>
          <div className="chest-face chest-face-bottom" />
          <div className="chest-interior" />
          <div className="chest-lid">
            <div className="chest-lid-top">
              <span className="chest-paper-band" />
              <CardBackArt />
            </div>
            <div className="chest-lid-front" />
            <div className="chest-lid-side" />
            <div className="chest-lid-left" />
            <div className="chest-lid-back" />
            <div className="chest-lid-under" />
          </div>
        </div>
      </div>
      <div className="chest-flying-cards">
        {Array.from({ length: Math.min(count, 10) }, (_, index) => (
          <i
            key={index}
            className={`rarity-${rarities?.[index] ?? RARITIES[index % RARITIES.length]}`}
            style={
              {
                "--spark-index": index,
                "--flight-count": Math.min(count, 10),
              } as CSSProperties
            }
          >
            <CardBackArt />
          </i>
        ))}
      </div>
      <div className="chest-dust">
        {Array.from({ length: 18 }, (_, index) => (
          <i key={index} style={{ "--spark-index": index } as CSSProperties} />
        ))}
      </div>
    </div>
  );
}
