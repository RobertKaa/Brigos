/** Development-only inspection of the real CSS animation, without game or storage. */
import { useState } from "react";
import type { CSSProperties } from "react";
import { createRoot } from "react-dom/client";
import { OpeningChest } from "../src/components/OpeningChest";
import { BOXES, BOX_IDS } from "../src/game/catalog";
import type { BoxId } from "../src/game/catalog";
import "@fontsource-variable/dm-sans";
import "@fontsource-variable/outfit";
import "../src/styles.css";
import "../src/components/opening.css";

if (!import.meta.env.DEV) throw new Error("Aperçu réservé au développement.");

function ReviewChest() {
  const [kind, setKind] = useState<BoxId>("discovery");
  const [time, setTime] = useState(800);
  const [playing, setPlaying] = useState(false);
  const [run, setRun] = useState(0);
  return (
    <main className="chest-inspection">
      <style>{`
        body { background: #f5f2e9; color: #142c3b; }
        .chest-inspection { width: min(760px, 100%); padding: 20px; margin: 0 auto; }
        .chest-inspection h1 { font-size: 24px; margin: 16px 0 8px; }
        .chest-inspection p { font-size: 14px; line-height: 1.5; margin: 8px 0 16px; }
        .inspection-controls { display: grid; grid-template-columns: 180px 1fr; gap: 8px; padding: 12px; background: white; border-radius: 14px; margin-bottom: 16px; }
        .inspection-controls label { display: grid; gap: 8px; font-size: 14px; }
        .inspection-controls select, .inspection-controls button { min-height: 44px; padding: 8px 12px; border: 1px solid #cdd2ca; border-radius: 8px; background: #fff; color: #142c3b; }
        .inspection-controls input { width: 100%; min-height: 44px; accent-color: #23695e; }
        .inspection-buttons { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: 8px; }
        .chest-inspection .opening-modal { max-width: none; overflow: hidden; }
        .chest-inspection .opening-unseal { min-height: 375px; }
        .inspection-paused .chest-world, .inspection-paused .chest-lid, .inspection-paused .chest-light-column { animation-play-state: paused; animation-delay: calc(-1 * var(--inspection-time)); }
        .inspection-paused .chest-flying-pieces > i { animation-play-state: paused; animation-delay: calc(1.48s + var(--spark-index) * 45ms - var(--inspection-time)); }
        .inspection-paused .chest-dust > i { animation-play-state: paused; animation-delay: calc(1.38s + var(--spark-index) * 20ms - var(--inspection-time)); }
        @media (max-width: 620px) { .chest-inspection { padding: 12px; } .inspection-controls { grid-template-columns: 1fr; } }
      `}</style>
      <h1>Contrôle de l’ouverture</h1>
      <p>Aperçu de développement · aucune sauvegarde, aucune boîte réelle.</p>
      <section className="inspection-controls" aria-label="Contrôles visuels">
        <label>
          Boîte{" "}
          <select
            value={kind}
            onChange={(event) => setKind(event.target.value as BoxId)}
          >
            {BOX_IDS.map((id) => (
              <option key={id} value={id}>
                {BOXES[id].name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Position de l’animation · {time} ms
          <input
            aria-label="Position de l’animation"
            type="range"
            min="0"
            max="2800"
            step="50"
            value={time}
            onChange={(event) => {
              setTime(Number(event.target.value));
              setPlaying(false);
            }}
          />
        </label>
        <div className="inspection-buttons">
          {[800, 1450, 1750, 2300].map((ms) => (
            <button
              key={ms}
              onClick={() => {
                setTime(ms);
                setPlaying(false);
              }}
            >
              {ms === 800 ? "Fermé" : ms === 2300 ? "Ouvert" : `${ms} ms`}
            </button>
          ))}
          <button
            onClick={() => {
              setRun((value) => value + 1);
              setPlaying(true);
            }}
          >
            Lire l’animation
          </button>
        </div>
      </section>
      <section
        className={`opening-modal ${playing ? "" : "inspection-paused"}`}
        style={{ "--inspection-time": `${time}ms` } as CSSProperties}
      >
        <div className="reveal-stage is-unsealing">
          <div className="opening-unseal">
            <span className="opening-stage-kicker">PLACE À LA DÉCOUVERTE</span>
            <OpeningChest key={run} kind={kind} count={10} />
            <div className="opening-unseal-caption">
              <strong>10 Brigos. De grandes idées.</strong>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<ReviewChest />);
