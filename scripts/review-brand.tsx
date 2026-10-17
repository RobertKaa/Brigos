/** A local logo sheet. No Auth client, repository, or browser storage. */
import { createRoot } from "react-dom/client";
import { BrigoAppIcon, BrigoLogo } from "../src/components/BrigoLogo";
import { publicAssetUrl } from "../src/publicAssets";
import "@fontsource-variable/dm-sans";
import "@fontsource-variable/outfit";
import "../src/styles.css";
import "../src/accessibility.css";
import "../src/studio-theme.css";

if (!import.meta.env.DEV) throw new Error("Revue réservée au développement.");

createRoot(document.getElementById("root")!).render(
  <main style={{ padding: 24, maxWidth: 1080, margin: "auto" }}>
    <h1>Le B construit en Brigos</h1>
    <p style={{ marginBlock: 16 }}>
      Pièces du catalogue, rendu manga partagé et images préparées. Aucune
      lecture ni écriture de sauvegarde.
    </p>
    <div className="brand-proof-grid">
      <section style={{ background: "#f7f1e5", color: "#242320" }}>
        <h2>Construction en couleur</h2>
        <BrigoLogo variant="mark" className="brand-proof-large" />
        <BrigoLogo tone="mono" className="brand-proof-word" />
      </section>
      <section style={{ background: "#191c22", color: "#fff9eb" }}>
        <h2>Sur fond sombre</h2>
        <BrigoLogo variant="mark" className="brand-proof-large" />
        <BrigoLogo tone="light" className="brand-proof-word" />
      </section>
      <section>
        <h2>Petites tailles réelles</h2>
        <div className="brand-proof-sizes">
          {[16, 24, 32, 40, 64].map((size) => (
            <div key={size}>
              <div style={{ width: size, height: size }}>
                <BrigoAppIcon />
              </div>
              <small>{size} px</small>
            </div>
          ))}
        </div>
        <BrigoLogo className="brand-proof-word" />
      </section>
      <section>
        <h2>Fichiers SVG autonomes</h2>
        <img
          src={publicAssetUrl("branding/brigo-logo.svg")}
          alt="Logo complet exporté"
          width="180"
          height="66"
        />
        <img
          src={publicAssetUrl("branding/brigo-wordmark.svg")}
          alt="Logo monochrome exporté"
          width="150"
          height="56"
        />
        <img
          src={publicAssetUrl("favicon.svg?v=3")}
          alt="Icône exportée"
          width="32"
          height="32"
        />
      </section>
    </div>
    <style>{`
      .brand-proof-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px;margin-block:24px}
      .brand-proof-grid section{padding:24px;border:1px solid #8b887f;border-radius:8px;min-width:0}
      .brand-proof-grid h2{font-size:18px;margin-bottom:20px}
      .brand-proof-large{width:126px;height:148px;margin:0 auto 24px}
      .brand-proof-word{width:150px;height:56px;margin:16px auto}
      .brand-proof-sizes{display:flex;gap:18px;align-items:flex-end;flex-wrap:wrap}
      .brand-proof-sizes svg{display:block;width:100%;height:100%}
      .brand-proof-grid img{display:block;max-width:100%;object-fit:contain;margin-block:16px}
      @media(max-width:600px){.brand-proof-grid{grid-template-columns:minmax(0,1fr)}.brand-proof-grid section{padding:18px}}
    `}</style>
  </main>,
);
