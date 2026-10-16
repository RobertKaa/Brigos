/** Vite rewrites static imports; public manifest URLs need the same deployment base. */
export const publicAssetUrl = (
  path: string,
  base = import.meta.env.BASE_URL,
): string =>
  `${base.endsWith("/") ? base : `${base}/`}${path.replace(/^\/+/, "")}`;
