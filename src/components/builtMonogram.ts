import drawing from "./brigo-monogram.json";

/** The prepared construction is shared as one static image per logo. */
const escapeAttribute = (value: string | number) =>
  String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[character]!,
  );

function gray(color: string) {
  if (!/^#[\da-f]{6}$/i.test(color)) return color;
  const channel = Math.round(
    parseInt(color.slice(1, 3), 16) * 0.2126 +
      parseInt(color.slice(3, 5), 16) * 0.7152 +
      parseInt(color.slice(5, 7), 16) * 0.0722,
  )
    .toString(16)
    .padStart(2, "0");
  return `#${channel.repeat(3)}`;
}

function imageSource(monochrome: boolean) {
  const paint = (color: string) => (monochrome ? gray(color) : color);
  // At 16–44 CSS px, dense brushwork obscures the two counters. Preserve every
  // piece, bevel, connector and highlight; omit only the fine ink texture.
  const paths = drawing.paths
    .filter((path) => path.role !== "hatching" && path.role !== "brush")
    .map((path) => {
      const attributes: Record<string, string | number | undefined> = {
        d: path.d,
        fill: paint(path.fill),
        stroke: path.stroke && paint(path.stroke),
        "stroke-width": path.strokeWidth,
        opacity: path.opacity,
      };
      return `<path ${Object.entries(attributes)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => `${key}="${escapeAttribute(value!)}"`)
        .join(" ")}/>`;
    })
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${escapeAttribute(drawing.viewBox)}"><g stroke-width="1.55" stroke-linejoin="round" stroke-linecap="round">${paths}</g></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export const BUILT_MONOGRAM_COLOR = imageSource(false);
export const BUILT_MONOGRAM_MONO = imageSource(true);
export const BUILT_MONOGRAM_RATIO = drawing.width / drawing.height;
