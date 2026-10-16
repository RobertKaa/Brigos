export type View = "boxes" | "collection" | "workshop" | "journal" | "sandbox";
export type AppRoute = {
  view: View;
  workshopView: "plans" | "built";
  workshopFilter?: "ready";
};

/** Accept only known destinations; hash parameters never become markup or URLs. */
export function readAppRoute(hash: string): AppRoute {
  const [path, query = ""] = hash.replace(/^#/, "").split("?", 2);
  const view: View =
    path === "collection" ||
    path === "workshop" ||
    path === "journal" ||
    path === "sandbox"
      ? path
      : "boxes";
  const params = new URLSearchParams(query);
  return {
    view,
    workshopView:
      view === "workshop" && params.get("view") === "built" ? "built" : "plans",
    ...(view === "workshop" && params.get("view") === "ready"
      ? { workshopFilter: "ready" as const }
      : {}),
  };
}
