/** Local art review: catalogue components only, no game save or repository. */
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { Moon, Sun } from "lucide-react";
import { BrigoLogo } from "../src/components/BrigoLogo";
import { BrigoCard } from "../src/components/BrigoCard";
import { BrigoArt, ConstructionArt } from "../src/components/BrigoArt";
import { BRIGO_BY_ID, MODELS, RECIPES } from "../src/game/catalog";
import { applyTheme } from "../src/theme";
import type { Theme } from "../src/theme";
import "@fontsource-variable/dm-sans";
import "@fontsource-variable/outfit";
import "../src/styles.css";
import "../src/accessibility.css";
import "../src/studio-theme.css";

if (!import.meta.env.DEV) throw new Error("Étude réservée au développement.");
const initialTheme: Theme =
  new URLSearchParams(location.search).get("theme") === "dark"
    ? "dark"
    : "light";
applyTheme(initialTheme);
const ids = [
  "brick-2x2:coral",
  "brick-2x4:blue",
  "round-2x2:green",
  "arch-1x4:mint",
  "special-cross:violet",
  "special-wheel:charcoal",
  "plate-4x4:ivory",
  "special-door:orange",
];

function MangaReview() {
  const [theme, setTheme] = useState(initialTheme);
  const [inspected, setInspected] = useState("special-door");
  const [assembly, setAssembly] = useState("house");
  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="header-inner">
          <a
            href="#pieces"
            className="brand"
            aria-label="Brigos, étude du dessin"
          >
            <BrigoLogo />
          </a>
          <span
            className="eyebrow"
            style={{ marginLeft: "auto", fontSize: 11 }}
          >
            ÉTUDE D’ENCRAGE · AUCUNE SAUVEGARDE
          </span>
          <button
            type="button"
            className="icon-button"
            aria-label={
              theme === "dark" ? "Activer le mode jour" : "Activer le mode nuit"
            }
            onClick={() => {
              const next = theme === "dark" ? "light" : "dark";
              setTheme(next);
              applyTheme(next);
            }}
          >
            {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </header>
      <main className="main-content manga-review" id="pieces">
        <div className="page-intro">
          <div>
            <span className="eyebrow">
              <i />
              LES FACETTES BRIGOS
            </span>
            <h1>De la couleur. Du caractère.</h1>
            <p>Volumes chanfreinés, fermoirs losange et traits à l’encre.</p>
          </div>
        </div>
        <div className="manga-pieces">
          {ids.map((id) => {
            const brigo = BRIGO_BY_ID.get(id);
            if (!brigo) throw new Error(`Pièce de revue inconnue : ${id}`);
            return (
              <BrigoCard
                key={id}
                brigo={brigo}
                count={3}
                discovered
                onClick={() => {}}
              />
            );
          })}
        </div>
        <section
          id="manga-inspector"
          className="manga-inspector"
          aria-labelledby="manga-inspector-title"
        >
          <div>
            <h2 id="manga-inspector-title">Une pièce, quatre angles.</h2>
            <label>
              Pièce à inspecter
              <select
                value={inspected}
                onChange={(event) => setInspected(event.target.value)}
              >
                {MODELS.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="manga-inspector-views">
            {([0, 90, 180, 270] as const).map((rotation) => (
              <article key={rotation}>
                <BrigoArt
                  brigo={BRIGO_BY_ID.get(`${inspected}:orange`)!}
                  rotation={rotation}
                  title={`${BRIGO_BY_ID.get(`${inspected}:orange`)!.model.name}, vue ${rotation} degrés`}
                />
                <strong>{rotation}°</strong>
              </article>
            ))}
          </div>
        </section>
        <section
          id="assembly-inspector"
          className="manga-inspector assembly-inspector"
          aria-labelledby="assembly-inspector-title"
        >
          <div>
            <h2 id="assembly-inspector-title">
              Les raccords, sous quatre angles.
            </h2>
            <label>
              Construction à inspecter
              <select
                value={assembly}
                onChange={(event) => setAssembly(event.target.value)}
              >
                {RECIPES.map((recipe) => (
                  <option key={recipe.id} value={recipe.id}>
                    {recipe.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="manga-inspector-views">
            {([0, 90, 180, 270] as const).map((rotation) => (
              <article key={rotation}>
                <ConstructionArt
                  recipeId={assembly}
                  rotation={rotation}
                  quality="preview"
                />
                <strong>{rotation}°</strong>
              </article>
            ))}
          </div>
        </section>
        <style>{`.assembly-inspector .manga-inspector-views{grid-template-columns:repeat(2,minmax(0,1fr))}.assembly-inspector .construction-art{width:100%;height:340px;display:block;margin-bottom:12px}.assembly-inspector select{max-width:100%}@media(max-width:650px){.assembly-inspector .manga-inspector-views{grid-template-columns:minmax(0,1fr)}.assembly-inspector .construction-art{height:280px}}`}</style>
        <style>{`.manga-inspector{margin-top:36px;scroll-margin-top:110px}.manga-inspector>div:first-child{display:flex;gap:24px;align-items:center;justify-content:space-between;margin-bottom:20px}.manga-inspector label{display:grid;gap:5px;min-width:220px}.manga-inspector-views{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px}.manga-inspector-views article{padding:16px;background:var(--studio-surface);border:1px solid var(--line);text-align:center}.manga-inspector-views .brigo-art{display:block;width:100%;height:250px;margin-bottom:12px}@media(max-width:650px){.manga-inspector>div:first-child{display:grid}.manga-inspector-views{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.manga-inspector-views article{padding:8px}.manga-inspector-views .brigo-art{height:180px}}`}</style>
        <section className="manga-constructions">
          <h2>Les mêmes traits, à toutes les échelles.</h2>
          <div>
            {["house", "harbour-lighthouse", "high-citadel"].map((id) => (
              <article key={id}>
                <ConstructionArt recipeId={id} quality="preview" />
                <h3>{RECIPES.find((recipe) => recipe.id === id)?.name}</h3>
              </article>
            ))}
          </div>
        </section>
      </main>
      <style>{`.manga-review{padding-top:24px}.manga-review .page-intro{margin-bottom:20px}.manga-review h1{font-size:32px}.manga-pieces{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px}.manga-pieces .brigo-card-image{height:176px}.manga-constructions{margin-top:40px}.manga-constructions>div{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;margin-top:16px}.manga-constructions article{border:1px solid var(--line);background:var(--studio-surface);padding:16px}.manga-constructions .construction-art{height:230px;width:100%}.manga-constructions h3{font-size:18px}@media(max-width:650px){.manga-pieces{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.manga-pieces .brigo-card-image{height:150px}.manga-review h1{font-size:27px}.manga-constructions>div{grid-template-columns:minmax(0,1fr)}.header-inner>.eyebrow{display:none}}`}</style>
    </div>
  );
}
const root = createRoot(document.getElementById("root")!);
root.render(<MangaReview />);
if (import.meta.hot) import.meta.hot.dispose(() => root.unmount());
