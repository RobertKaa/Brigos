import { BRIGO_WORDMARK_PATH, BRIGO_WORDMARK_WIDTH } from "./brandPaths";
import "./brand.css";

type LogoVariant = "full" | "wordmark" | "mark";
type LogoTone = "ink" | "light" | "mono";

/** Cut-paper facets and an inked B. No construction-toy connectors. */
function FacetMonogram({ ink, accent }: { ink: string; accent: string }) {
  return (
    <g>
      <path d="M8 14 20 2 31 13 23 21 18 16 13 21Z" fill={accent} />
      <path d="M35 6 47 9 53 20 41 17 36 22 31 13Z" fill={accent} />
      <path
        fill={ink}
        fillRule="evenodd"
        d="M10 20H39C51 20 57 27 57 36C57 42 54 46 48 48C55 50 59 55 59 62C59 72 51 78 39 78H10ZM25 31V42H37C42 42 45 40 45 36.5C45 33 42 31 37 31ZM25 53V66H38C43 66 46 64 46 59.5C46 55 43 53 38 53Z"
      />
      <path d="M8 49 41 41 44 47 10 55Z" fill={accent} />
    </g>
  );
}

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
  const accent = tone === "mono" ? ink : "var(--studio-accent, #a83827)";
  const width =
    variant === "mark"
      ? 70
      : variant === "wordmark"
        ? BRIGO_WORDMARK_WIDTH
        : 86 + BRIGO_WORDMARK_WIDTH;
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
    >
      {variant !== "wordmark" && <FacetMonogram ink={ink} accent={accent} />}
      {variant !== "mark" && (
        <g
          transform={variant === "full" ? "translate(86 2)" : "translate(0 2)"}
          fill={ink}
        >
          <path d={BRIGO_WORDMARK_PATH} />
        </g>
      )}
    </svg>
  );
}

/** The app icon uses the same monogram with a contrasting solid background. */
export function BrigoAppIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">
      <rect width="80" height="80" rx="13" fill="#252522" />
      <g transform="translate(12 5) scale(.8)">
        <FacetMonogram ink="#fff9eb" accent="#e4eb56" />
      </g>
    </svg>
  );
}
