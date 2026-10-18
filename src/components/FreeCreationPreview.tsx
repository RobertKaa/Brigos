import { memo, useMemo, useState } from "react";
import type { SandboxProject } from "../game/sandbox";
import type { Rotation } from "../game/geometry";
import { sandboxGeometryFingerprint } from "../game/freeGallery";
import { CONSTRUCTION_RENDERER_VERSION } from "./BrigoScene";
import { prepareSandboxDrawing } from "./sandboxDrawing";
import { createConstructionCache } from "./constructionCache";

const previews = createConstructionCache<string>(20, 16_000_000);
const xml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

/** Serialize internal mesh geometry only. Player text never enters the image. */
export function freeCreationPreview(
  project: SandboxProject,
  rotation: Rotation,
): string | null {
  if (!project.placements.length) return null;
  const key = `${CONSTRUCTION_RENDERER_VERSION}:${sandboxGeometryFingerprint(project)}:${rotation}`;
  const cached = previews.get(key);
  if (cached) return cached;
  const layers = prepareSandboxDrawing(project.placements, rotation);
  if (!layers.length) return null;
  const left =
    Math.min(...layers.map((layer) => layer.projectedBounds.minX)) - 20;
  const top =
    Math.min(...layers.map((layer) => layer.projectedBounds.minY)) - 20;
  const width =
    Math.max(...layers.map((layer) => layer.projectedBounds.maxX)) - left + 20;
  const height =
    Math.max(...layers.map((layer) => layer.projectedBounds.maxY)) - top + 20;
  const symbols = new Map<string, string>();
  let definitions = "",
    instances = "";
  for (const layer of layers) {
    let symbol = symbols.get(layer.key);
    if (!symbol) {
      symbol = `b${symbols.size}`;
      symbols.set(layer.key, symbol);
      definitions += `<g id="${symbol}">`;
      for (const primitive of layer.mesh.primitives) {
        definitions += `<path d="${xml(primitive.d)}" fill="${xml(primitive.fill)}"${primitive.stroke ? ` stroke="${xml(primitive.stroke)}"` : ""}${primitive.opacity !== undefined ? ` opacity="${primitive.opacity}"` : ""}/>`;
        if (primitive.hatching)
          definitions += `<path d="${xml(primitive.hatching)}" fill="none" stroke="#252127" opacity=".43" stroke-width=".7"/>`;
        if (primitive.brush)
          definitions += `<path d="${xml(primitive.brush)}" fill="#252127" opacity=".85"/>`;
        if (primitive.highlight)
          definitions += `<path d="${xml(primitive.highlight)}" fill="none" stroke="#fff5d9" opacity=".82" stroke-width=".9"/>`;
      }
      definitions += "</g>";
    }
    instances += `<use href="#${symbol}" transform="translate(${layer.offset.x} ${layer.offset.y})"/>`;
  }
  const source = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${left} ${top} ${width} ${height}"><g stroke-width="1.1" stroke-linejoin="round" stroke-linecap="round"><defs>${definitions}</defs>${instances}</g></svg>`;
  const uri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`;
  return previews.set(key, uri, uri.length * 2);
}
export const FreeCreationPreview = memo(function FreeCreationPreview({
  project,
  rotation = 0,
  backgroundId = "paper",
}: {
  project: SandboxProject;
  rotation?: Rotation;
  backgroundId?: "paper" | "ink";
}) {
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const uri = useMemo(() => {
    try {
      return freeCreationPreview(project, rotation);
    } catch {
      return null;
    }
  }, [project, rotation]);
  return (
    <div className={`free-art free-art-${backgroundId}`}>
      {uri && failedUri !== uri ? (
        <img
          src={uri}
          loading="lazy"
          decoding="async"
          alt={`${project.placements.length} Brigo${project.placements.length === 1 ? " assemblé" : "s assemblés"}, angle ${rotation} degrés`}
          onError={() => setFailedUri(uri)}
        />
      ) : (
        <span>
          {project.placements.length
            ? "Aperçu indisponible"
            : "Une page blanche"}
        </span>
      )}
    </div>
  );
});
