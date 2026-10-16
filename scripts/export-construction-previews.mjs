import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

// Raster exports are generated once, never on the player's main thread. Sharp
// is optional developer tooling; set BRIGO_SHARP_PATH to an installed module.
const require = createRequire(import.meta.url);
const sharp = require(process.env.BRIGO_SHARP_PATH || "sharp");
const root = fileURLToPath(new URL("../", import.meta.url));
const server = await createServer({
  root,
  server: { middlewareMode: true, hmr: false, watch: null, ws: false },
  appType: "custom",
});
try {
  const { RECIPES } = await server.ssrLoadModule("/src/game/catalog.ts");
  const {
    prepareConstructionScene,
    serializeConstructionFrame,
    constructionPreviewFingerprint,
  } = await server.ssrLoadModule("/src/components/BrigoScene.tsx");
  const out = path.join(root, "public/constructions");
  await fs.mkdir(out, { recursive: true });
  let previous = {};
  try {
    previous = JSON.parse(
      await fs.readFile(
        path.join(root, "src/components/construction-previews.json"),
        "utf8",
      ),
    );
  } catch {
    // A first export or an incomplete local manifest regenerates every image.
  }
  const manifest = {};
  let bytes = 0;
  let reused = 0;
  for (const recipe of RECIPES) {
    const fingerprint = constructionPreviewFingerprint(recipe.id);
    // Small models remain crisp at card/detail sizes while leaving room for a
    // growing library within the shared image budget. Large models keep 1024px.
    const edge = recipe.placements.length <= 50 ? 896 : 1024;
    const cached = previous[recipe.id];
    if (
      cached?.fingerprint === fingerprint &&
      /^\/constructions\/[a-z0-9-]+-[a-f0-9]{10}\.webp$/.test(cached.src)
    ) {
      try {
        const buffer = await fs.readFile(
          path.join(out, path.basename(cached.src)),
        );
        const metadata = await sharp(buffer).metadata();
        if (
          metadata.format === "webp" &&
          metadata.hasAlpha &&
          Math.max(metadata.width, metadata.height) === edge
        ) {
          manifest[recipe.id] = cached;
          bytes += buffer.length;
          reused++;
          continue;
        }
      } catch {
        // Missing or unreadable generated files are rebuilt from the plan.
      }
    }
    const scene = prepareConstructionScene({ recipeId: recipe.id });
    if (!scene) continue;
    const scale = edge / Math.max(scene.framing.width, scene.framing.height);
    const svg = serializeConstructionFrame(scene).replace(
      "<svg ",
      `<svg width="${Math.round(scene.framing.width * scale)}" height="${Math.round(scene.framing.height * scale)}" `,
    );
    const image = await sharp(Buffer.from(svg), { density: 72 })
      .resize({ width: edge, height: edge, fit: "inside" })
      .webp({ quality: 88, alphaQuality: 100, effort: 6 })
      .toBuffer();
    const digest = createHash("sha256")
      .update(image)
      .digest("hex")
      .slice(0, 10);
    const filename = `${recipe.id}-${digest}.webp`;
    await fs.writeFile(path.join(out, filename), image);
    bytes += image.length;
    manifest[recipe.id] = {
      src: `/constructions/${filename}`,
      fingerprint,
      framing: scene.framing,
      center: scene.center,
      sceneSize: scene.sceneSize,
      placements: scene.layers.length,
    };
  }
  await fs.writeFile(
    path.join(root, "src/components/construction-previews.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  const currentFiles = new Set(
    Object.values(manifest).map((entry) => path.basename(entry.src)),
  );
  for (const filename of await fs.readdir(out)) {
    // This folder contains generated assets. Remove only obsolete exports with
    // our content-hash naming scheme, never other files or subdirectories.
    if (
      /^[a-z0-9-]+-[a-f0-9]{10}\.webp$/.test(filename) &&
      !currentFiles.has(filename)
    )
      await fs.unlink(path.join(out, filename));
  }
  console.log(
    `Exported ${Object.keys(manifest).length} transparent WebP previews up to 1024px (${(bytes / 1024 / 1024).toFixed(2)} MiB, ${reused} unchanged assets reused). No HTTP/WebSocket listener or player-save access.`,
  );
} finally {
  await server.close();
}
