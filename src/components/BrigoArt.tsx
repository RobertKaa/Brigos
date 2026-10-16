import { BOXES, BOX_DROP_COUNT } from "../game/catalog";
import type { BoxId } from "../game/catalog";
import { BrigoLogo } from "./BrigoLogo";
export { BrigoArt, ConstructionArt, brigoGeometry } from "./BrigoScene";

export function BoxArt({
  kind = "discovery",
  className = "",
}: {
  kind?: BoxId;
  className?: string;
}) {
  const { color, palette } = BOXES[kind];
  const edition = { discovery: "01", workshop: "02", prism: "03" }[kind];
  return (
    <svg
      viewBox="0 0 400 330"
      className={`box-art ${className}`}
      aria-hidden="true"
      data-art-style="manga-ink"
      focusable="false"
    >
      <path
        d="m48 276 134-40 177 32-141 48-40-8-16 5Z"
        fill="var(--scene-ink, #465568)"
        opacity=".23"
      />
      <g
        stroke="#293146"
        strokeWidth="3.2"
        strokeLinejoin="bevel"
        strokeLinecap="square"
      >
        <path
          d="m62 112 166-51 29 2 84 61-10 19-164 53-94-65Z"
          fill={palette.light}
        />
        <path d="m73 131 94 65v103l-12 3-82-62-11-128Z" fill={palette.shadow} />
        <path d="m167 196 164-53 10-19v117l-10 16-164 45Z" fill={color} />
        <path d="m63 112 104 76 174-64m-174 64v113" fill="none" />
        <path
          d="m63 112 9 127 13 9-5-115 82 60 5 108v-113Z"
          fill="#293146"
          stroke="none"
        />
        <path
          d="m168 278 161-48 12-19v30l-10 16-164 45Z"
          fill="#293146"
          stroke="none"
        />
        <path d="m95 102 100 77 25-8-100-76Z" fill={palette.trim} />
        <path d="m195 179 25-8v43l-25 8Z" fill={palette.trim} />
        <path d="m95 136 22 16 1 116-22-17Z" fill={palette.trim} />
        <path d="m282 148 21-7v124l-21 6Z" fill={palette.trim} />
        <path d="m161 113 35-11 27 17-36 12Z" fill={color} />
        <path d="m177 116 14-4 10 7-14 4Z" fill="#293146" strokeWidth="1.2" />
        <path
          d="m246 91 32 22 36-10m-30 13 9-3m-5 8 10-3"
          fill="none"
          strokeWidth="1.5"
        />
        <path
          d="m81 169 7 5m-7 4 8 6m-7 4 8 6m-8 4 9 7m-9 3 9 7m-8 3 8 6m40 20 17 13m-17-5 17 13m-17-5 17 13m55-5 36-11m-29 17 29-9m-22 15 22-7m54-88 14-5m-14 12 14-5m-14 12 14-5"
          fill="none"
          opacity=".75"
          strokeWidth="1.3"
        />
        <path
          d="m79 120 83 61m11 18 102-33m-100 44v73"
          fill="none"
          stroke="#fff5d9"
          strokeWidth="2.6"
          opacity=".9"
        />
      </g>
      <g transform="matrix(1,-.30,0,1,185,218)">
        <path
          d="M0 6 6 0H83l7 7v47l-6 6H6l-6-6Z"
          fill="#fff9e9"
          stroke="#293146"
          strokeWidth="2.4"
        />
        <BrigoLogo
          variant="wordmark"
          tone="mono"
          position={{ x: 10, y: 7, width: 70, height: 28 }}
        />
        <path d="M11 39h68" stroke="#293146" strokeWidth="1" />
        <text
          x="45"
          y="51"
          textAnchor="middle"
          fontFamily="Arial, sans-serif"
          fontWeight="800"
          letterSpacing="1.4"
          fontSize="7"
          fill="#293146"
        >
          {BOX_DROP_COUNT} CARTES
        </text>
      </g>
      <g transform="matrix(1,.69,0,1,128,174)" fill="#fff2d2">
        <text
          x="0"
          y="22"
          fontFamily="Arial, sans-serif"
          fontWeight="900"
          fontSize="23"
        >
          {edition}
        </text>
        <path
          d="M0 29h23m-23 5h23m-23 5h17"
          fill="none"
          stroke="#fff2d2"
          strokeWidth="1.5"
        />
      </g>
      <g
        fill="none"
        stroke="var(--ink, #293146)"
        strokeWidth="2.6"
        strokeLinecap="square"
      >
        <path d="m54 65 9 18m-23-1 13 7m-21 8 19 2m286-43-8 16m22-7-12 10m10 15 15-1M51 267l-13 10m17-2-7 13" />
        <path
          d="m310 54 5 10 10 5-10 5-5 10-5-10-10-5 10-5Z"
          fill={palette.light}
        />
      </g>
    </svg>
  );
}
