import {
  BUILT_MONOGRAM_COLOR,
  BUILT_MONOGRAM_MONO,
  BUILT_MONOGRAM_RATIO,
} from "./builtMonogram";
import { BRIGO_SUFFIX_PATH, BRIGO_SUFFIX_WIDTH } from "./brandPaths";
import "./brand.css";

type LogoVariant = "full" | "wordmark" | "mark";
type LogoTone = "ink" | "light" | "mono";

// A slightly taller initial, while preserving the existing wordmark footprint.
const INITIAL_HEIGHT = 66;
const INITIAL_WIDTH =
  Math.round(INITIAL_HEIGHT * BUILT_MONOGRAM_RATIO * 100) / 100;
const SUFFIX_X = INITIAL_WIDTH + 5;

/** Decorative SVG: the parent link or surrounding content provides the name. */
export function BrigoLogo({
  variant = "full",
  tone = "ink",
  className = "",
  position,
}: {
  variant?: LogoVariant;
  tone?: LogoTone;
  className?: string;
  position?: { x: number; y: number; width: number; height: number };
}) {
  const ink =
    tone === "light"
      ? "#fff9eb"
      : tone === "mono"
        ? "#242320"
        : "var(--ink, #242320)";
  const source = tone === "mono" ? BUILT_MONOGRAM_MONO : BUILT_MONOGRAM_COLOR;
  const width =
    variant === "mark"
      ? 70
      : Math.round((SUFFIX_X + BRIGO_SUFFIX_WIDTH) * 100) / 100;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${width} 82`}
      width={width}
      height="82"
      className={`brigo-logo brigo-logo-${variant} ${className}`.trim()}
      {...position}
      aria-hidden="true"
      focusable="false"
      data-brand-mark="built-brigos"
    >
      <image
        href={source}
        x={variant === "mark" ? (70 - 78 * BUILT_MONOGRAM_RATIO) / 2 : 0}
        y={variant === "mark" ? 2 : 0}
        width={variant === "mark" ? 78 * BUILT_MONOGRAM_RATIO : INITIAL_WIDTH}
        height={variant === "mark" ? 78 : INITIAL_HEIGHT}
      />
      {variant !== "mark" && (
        <g transform={`translate(${SUFFIX_X} 2)`} fill={ink}>
          <path d={BRIGO_SUFFIX_PATH} />
        </g>
      )}
    </svg>
  );
}

/** The app icon uses the same built B on a contrasting solid background. */
export function BrigoAppIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">
      <rect width="80" height="80" rx="13" fill="#252522" />
      <image
        href={BUILT_MONOGRAM_COLOR}
        x={(80 - 68 * BUILT_MONOGRAM_RATIO) / 2}
        y="6"
        width={68 * BUILT_MONOGRAM_RATIO}
        height="68"
      />
    </svg>
  );
}
