import { useState } from "react";
import { createRoot } from "react-dom/client";
import { OpeningModal } from "../src/components/OpeningModal";
import {
  BOXES,
  BOX_IDS,
  BOX_DROP_COUNT,
  BY_RARITY,
  RARITIES,
} from "../src/game/catalog";
import type { BoxId, Rarity } from "../src/game/catalog";
import type { Opening } from "../src/game/engine";
import { applyTheme } from "../src/theme";
import "@fontsource-variable/dm-sans";
import "@fontsource-variable/outfit";
import "../src/styles.css";
import "../src/accessibility.css";
import "../src/studio-theme.css";

// This standalone entry point imports the real view, never the application,
// game hooks, storage modules or loot engine. Every value below is fictional.
const query = new URLSearchParams(window.location.search);
applyTheme(query.get("theme") === "dark" ? "dark" : "light");
const requestedBox = query.get("box");
const initialBox: BoxId =
  BOX_IDS.find((id) => id === requestedBox) ?? "discovery";
const initialCount = query.get("count") === "5" ? 5 : BOX_DROP_COUNT;
const initialReducedMotion = query.get("motion") === "reduced";
const initialCoins = 2_400;
const initialBoxes: Record<BoxId, number> = {
  discovery: 3,
  workshop: 2,
  prism: 1,
};

function fixture(boxId: BoxId, count: number, sequence: number): Opening {
  const tiers: readonly Rarity[] =
    count === 5
      ? RARITIES
      : [
          "common",
          "common",
          "uncommon",
          "common",
          "rare",
          "uncommon",
          "epic",
          "rare",
          "common",
          "legendary",
        ];
  return {
    id: `visual-preview-${sequence}-${boxId}-${count}`,
    boxId,
    createdAt: "2026-10-09T10:00:00.000Z",
    drops: Array.from({ length: count }, (_, index) => {
      const tier = tiers[index];
      const pool = BY_RARITY[tier];
      const brigo =
        pool[(index * 13 + BOX_IDS.indexOf(boxId) * 7) % pool.length];
      return {
        brigoId: brigo.id,
        isNew: index % 3 === 0 || tier === "legendary",
      };
    }),
  };
}

function ReviewOpening() {
  const [boxId, setBoxId] = useState<BoxId>(initialBox);
  const [count, setCount] = useState(initialCount);
  const [reducedMotion, setReducedMotion] = useState(initialReducedMotion);
  const [sequence, setSequence] = useState(1);
  const [opening, setOpening] = useState<Opening | null>(() =>
    fixture(initialBox, initialCount, 1),
  );
  const [coins, setCoins] = useState(initialCoins);
  const [boxes, setBoxes] = useState(initialBoxes);
  const [notice, setNotice] = useState("");

  const showPreview = () => {
    const next = sequence + 1;
    setSequence(next);
    setOpening(fixture(boxId, count, next));
    setNotice("");
  };
  const nextPreview = (nextBox: BoxId) => {
    const next = sequence + 1;
    setSequence(next);
    setBoxId(nextBox);
    setCount(BOX_DROP_COUNT);
    setOpening(fixture(nextBox, BOX_DROP_COUNT, next));
    // Local React values only, for checking the stock/cost presentation.
    if (boxes[nextBox] > 0)
      setBoxes((previous) => ({
        ...previous,
        [nextBox]: previous[nextBox] - 1,
      }));
    else setCoins((previous) => Math.max(0, previous - BOXES[nextBox].cost));
  };

  return (
    <>
      <style>{`
        .preview-page { max-width: 760px; margin: 64px auto; padding: 24px; }
        .preview-banner { padding: 16px 20px; border: 1px solid #b8c9e0; border-radius: 14px; background: #edf3ff; color: #263b5a; }
        .preview-banner strong { display: block; font-size: 14px; letter-spacing: .04em; }
        .preview-banner p { margin-top: 6px; line-height: 1.6; font-size: 14px; }
        .preview-page h1 { margin: 28px 0 12px; font-size: clamp(28px, 6vw, 42px); }
        .preview-page > p { line-height: 1.7; margin-bottom: 22px; color: var(--muted); }
        .preview-settings { display: grid; gap: 18px; padding: 24px; border: 1px solid var(--line); border-radius: 18px; background: #fff; }
        .preview-settings label { display: grid; gap: 8px; font-size: 14px; font-weight: 650; }
        .preview-settings select { min-height: 46px; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--line); background: #fff; }
        .preview-settings .preview-motion { display: flex; align-items: center; gap: 10px; min-height: 44px; }
        .preview-motion input { width: 20px; height: 20px; }
        .preview-buttons { display: flex; gap: 12px; flex-wrap: wrap; }
        .preview-notice { margin-top: 20px; line-height: 1.6; }
        .opening-modal::before { content: "APERÇU VISUEL · aucune écriture dans votre partie"; display: block; margin-bottom: 16px; padding: 10px 14px; border-radius: 9px; background: #edf3ff; color: #263b5a; font-size: 12px; font-weight: 700; line-height: 1.5; letter-spacing: .03em; }
        @media (max-width: 480px) { .preview-page { margin: 20px auto; padding: 16px; } .preview-settings { padding: 18px; } .preview-buttons .button { width: 100%; } }
      `}</style>
      <main className="preview-page">
        <aside className="preview-banner" aria-label="Aperçu sans sauvegarde">
          <strong>APERÇU VISUEL · aucune écriture dans votre partie</strong>
          <p>
            Les cartes, pièces et réserves sont fictives. Cet aperçu n’ouvre
            aucune boîte réelle et n’accède à aucune sauvegarde.
          </p>
        </aside>
        <h1>Le studio des découvertes</h1>
        <p>
          Fermez la fenêtre pour changer de boîte, vérifier une ancienne
          ouverture de 5 cartes ou essayer le mode avec moins d’animations.
        </p>
        <section className="preview-settings" aria-label="Réglages de l’aperçu">
          <label>
            Boîte à prévisualiser
            <select
              value={boxId}
              onChange={(event) => setBoxId(event.target.value as BoxId)}
            >
              {BOX_IDS.map((id) => (
                <option key={id} value={id}>
                  {BOXES[id].name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Cartes à afficher
            <select
              value={count}
              onChange={(event) => setCount(Number(event.target.value))}
            >
              <option value={BOX_DROP_COUNT}>10 Brigos · nouvelle boîte</option>
              <option value={5}>5 Brigos · ancienne ouverture</option>
            </select>
          </label>
          <label className="preview-motion">
            <input
              type="checkbox"
              checked={reducedMotion}
              onChange={(event) => setReducedMotion(event.target.checked)}
            />
            Réduire les animations
          </label>
          <div className="preview-buttons">
            <button
              type="button"
              className="button button-primary"
              onClick={showPreview}
            >
              Revoir l’aperçu
            </button>
            <button
              type="button"
              className="button button-secondary"
              onClick={() => {
                setCoins(initialCoins);
                setBoxes(initialBoxes);
                setNotice("Les compteurs fictifs ont été réinitialisés.");
              }}
            >
              Réinitialiser les compteurs fictifs
            </button>
          </div>
        </section>
        <p className="preview-notice" role="status">
          {notice}
        </p>
      </main>
      {opening && (
        <OpeningModal
          opening={opening}
          reducedMotion={reducedMotion}
          busy={false}
          coins={coins}
          boxes={boxes}
          persistent={false}
          onOpenNext={nextPreview}
          onClose={() => setOpening(null)}
          onCollection={() => {
            setOpening(null);
            setNotice(
              "La collection n’est pas ouverte dans cet aperçu. Les cartes restent fictives.",
            );
          }}
          goal={{
            name: "Citadelle des huit tours · projet fictif",
            available: 1260,
            total: 3545,
            onView: () => {
              setOpening(null);
              setNotice(
                "Le projet est présenté à titre d’exemple. Aucun atelier réel n’a été modifié.",
              );
            },
          }}
        />
      )}
    </>
  );
}

createRoot(document.getElementById("root")!).render(<ReviewOpening />);
