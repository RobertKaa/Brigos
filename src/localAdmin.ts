/** Development tools never apply to a connected account or a published build. */
export function isLocalAdminEnabled({
  development,
  hostname,
  mode,
}: {
  development: boolean;
  hostname: string;
  mode?: "local" | "connected";
}): boolean {
  return (
    development &&
    mode === "local" &&
    (hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "[::1]")
  );
}
