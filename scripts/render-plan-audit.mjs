import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { createServer } from "vite";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const require = createRequire(import.meta.url);
// SVG export is dependency-free. Set BRIGO_SHARP_PATH to an optional installed
// sharp module to also rasterize the contact sheets for visual review.
let sharp;
try {
  sharp = require(process.env.BRIGO_SHARP_PATH || "sharp");
} catch {
  sharp = null;
}
const label = process.argv[2] || "audit";
const out = path.resolve(".artifacts", label);
await fs.mkdir(out, { recursive: true });
const server = await createServer({
  server: { middlewareMode: true, hmr: false, watch: null, ws: false },
  appType: "custom",
});
try {
  const { ConstructionArt } = await server.ssrLoadModule(
    "/src/components/BrigoScene.tsx",
  );
  const { RECIPES } = await server.ssrLoadModule("/src/game/catalog.ts");
  const requestedIds = process.argv.slice(3);
  const recipes = requestedIds.length
    ? RECIPES.filter((recipe) => requestedIds.includes(recipe.id))
    : RECIPES;
  const cellWidth = requestedIds.length ? 900 : 360;
  const cellHeight = requestedIds.length ? 780 : 315;
  const columns = requestedIds.length ? Math.min(2, recipes.length) : 3;
  const escape = (text) =>
    text.replaceAll("&", "&amp;").replaceAll("<", "&lt;");
  for (const rotation of [0, 90, 180, 270]) {
    for (let offset = 0; offset < recipes.length; offset += 12) {
      const batch = recipes.slice(offset, offset + 12);
      const cells = batch
        .map((recipe, index) => {
          const x = (index % columns) * cellWidth,
            y = Math.floor(index / columns) * cellHeight;
          const art = renderToStaticMarkup(
            React.createElement(ConstructionArt, {
              recipeId: recipe.id,
              rotation,
            }),
          ).replace(
            "<svg ",
            `<svg x="20" y="40" width="${cellWidth - 40}" height="${cellHeight - 70}" `,
          );
          return `<g transform="translate(${x},${y})"><rect x="8" y="8" width="${cellWidth - 16}" height="${cellHeight - 16}" rx="12" fill="${recipe.color}"/><text x="20" y="31" font-family="Arial" font-size="17" font-weight="bold" fill="#26364b">${escape(recipe.name)}</text>${art}<text x="20" y="${cellHeight - 18}" font-family="Arial" font-size="13" fill="#26364b">${recipe.id} · ${recipe.placements.length} Brigos · ${rotation}°</text></g>`;
        })
        .join("");
      const width = columns * cellWidth,
        height = Math.ceil(batch.length / columns) * cellHeight;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#fff"/>${cells}</svg>`;
      const basename = path.join(
        out,
        `plans-${Math.floor(offset / 12) + 1}-${rotation}`,
      );
      await fs.writeFile(`${basename}.svg`, svg);
      if (sharp) await sharp(Buffer.from(svg)).png().toFile(`${basename}.png`);
    }
  }
  console.log(
    `Rendered ${recipes.length} plans × 4 views as ${sharp ? "SVG + PNG" : "SVG"} to ${out}`,
  );
} finally {
  await server.close();
}
