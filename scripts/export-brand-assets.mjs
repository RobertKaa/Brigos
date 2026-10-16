import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

// Every exported asset comes from the same shapes as the in-app logo.
const root = fileURLToPath(new URL("../", import.meta.url));
const server = await createServer({
  root,
  server: { middlewareMode: true, hmr: false, watch: null, ws: false },
  appType: "custom",
});
try {
  const { BrigoLogo, BrigoAppIcon } = await server.ssrLoadModule(
    "/src/components/BrigoLogo.tsx",
  );
  const folder = path.join(root, "public/branding");
  await fs.mkdir(folder, { recursive: true });
  for (const [name, props] of [
    ["brigo-logo", {}],
    ["brigo-logo-light", { tone: "light" }],
    ["brigo-wordmark", { variant: "wordmark", tone: "mono" }],
    ["brigo-mark", { variant: "mark" }],
  ]) {
    const svg = renderToStaticMarkup(React.createElement(BrigoLogo, props));
    await fs.writeFile(path.join(folder, `${name}.svg`), svg);
  }
  await fs.writeFile(
    path.join(root, "public/favicon.svg"),
    renderToStaticMarkup(React.createElement(BrigoAppIcon)),
  );
  console.log(
    "Exported 4 brand assets and the matching favicon. No HTTP or WebSocket listener.",
  );
} finally {
  await server.close();
}
