/** Original manga print emblem: cut facets, broken frames and local ink hatching. */
export function CardBackArt({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 126"
      className={`card-back-art ${className}`.trim()}
      fill="none"
      data-art-style="manga-ink"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="m60 4 48 28v36m0 13v11l-48 30-48-30V51m0-13v-6l48-28"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="m60 16 37 22v48l-37 23-37-23V38Z"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        d="m24 75 30 18v13L24 88Zm43-54 28 16v14L67 34Z"
        fill="currentColor"
        opacity=".22"
      />
      <path d="m32 45 28-17 28 17-28 17Z" fill="currentColor" />
      <path d="m32 56 23 14v26L32 82Z" fill="currentColor" />
      <path d="m65 70 23-14v26L65 96Z" fill="currentColor" />
      <path d="m47 45 13-8 13 8-13 8Z" fill="var(--card-back-ink, #262527)" />
      <path
        d="m39 74 9 5m-9 1 9 5m-9 1 9 5m23-13 10-6m-10 12 10-6m-10 12 10-6"
        stroke="var(--card-back-ink, #262527)"
        strokeWidth="1.4"
      />
      <path
        d="M5 50 1 48m118 30-5-3M16 18l9 8m70 75 10 9M15 109l9-9m72-75 9-9M37 10l-8 5m62 96-8 5"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="square"
      />
    </svg>
  );
}
