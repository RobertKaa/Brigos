export type View =
  | "boxes"
  | "collection"
  | "workshop"
  | "journal"
  | "sandbox"
  | "community"
  | "contact"
  | "faq"
  | "mentions-legales";
export type AppRoute = {
  view: View;
  workshopView: "plans" | "built";
  workshopFilter?: "ready";
  sandboxView?: "build" | "exhibit";
  sandboxProjectId?: string;
  communityTab?: "creations" | "players" | "mine";
  communityQuery?: string;
  communityPage?: number;
  communityGalleryPage?: number;
  communityPlayerId?: string;
  communityCreationId?: string;
};

/** Accept only known destinations; hash parameters never become markup or URLs. */
export function readAppRoute(hash: string): AppRoute {
  const [path, query = ""] = hash.replace(/^#/, "").split("?", 2);
  const view: View =
    path === "collection" ||
    path === "workshop" ||
    path === "journal" ||
    path === "sandbox" ||
    path === "community" ||
    path === "contact" ||
    path === "faq" ||
    path === "mentions-legales"
      ? path
      : "boxes";
  const params = new URLSearchParams(query);
  const sandboxView =
    view === "sandbox" &&
    (params.get("view") === "build" || params.get("view") === "exhibit")
      ? (params.get("view") as "build" | "exhibit")
      : undefined;
  const projectId = params.get("project");
  const publicId = (key: string) => {
    const value = params.get(key);
    return value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        value,
      )
      ? value
      : undefined;
  };
  const page = (key: string) => {
    const value = Number(params.get(key));
    return Number.isSafeInteger(value) && value >= 1 && value <= 1000
      ? value
      : 1;
  };
  return {
    view,
    workshopView:
      view === "workshop" && params.get("view") === "built" ? "built" : "plans",
    ...(view === "community"
      ? {
          communityTab:
            params.get("tab") === "players"
              ? ("players" as const)
              : params.get("tab") === "mine"
                ? ("mine" as const)
                : ("creations" as const),
          communityQuery: (params.get("q") ?? "")
            .replace(
              /[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g,
              "",
            )
            .slice(0, 40),
          communityPage: page("page"),
          communityGalleryPage: page("galleryPage"),
          communityPlayerId: publicId("player"),
          communityCreationId: publicId("creation"),
        }
      : {}),
    ...(view === "workshop" && params.get("view") === "ready"
      ? { workshopFilter: "ready" as const }
      : {}),
    ...(sandboxView
      ? {
          sandboxView,
          ...(projectId && /^[a-zA-Z0-9-]{1,80}$/.test(projectId)
            ? { sandboxProjectId: projectId }
            : {}),
        }
      : {}),
  };
}

export function isInformationView(view: View): boolean {
  return view === "mentions-legales" || view === "contact" || view === "faq";
}

/** Serialize only validated routes, including the current workshop tab/filter. */
export function appRouteHref(route: AppRoute): string {
  if (route.view === "community") {
    const params = new URLSearchParams();
    if (route.communityTab && route.communityTab !== "creations")
      params.set("tab", route.communityTab);
    if (route.communityQuery)
      params.set("q", route.communityQuery.slice(0, 40));
    if (
      route.communityPage &&
      route.communityPage > 1 &&
      route.communityPage <= 1000
    )
      params.set("page", String(route.communityPage));
    if (
      route.communityGalleryPage &&
      route.communityGalleryPage > 1 &&
      route.communityGalleryPage <= 1000
    )
      params.set("galleryPage", String(route.communityGalleryPage));
    for (const [key, value] of [
      ["player", route.communityPlayerId],
      ["creation", route.communityCreationId],
    ] as const)
      if (
        value &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          value,
        )
      )
        params.set(key, value);
    return `#community${params.size ? `?${params}` : ""}`;
  }
  if (route.view === "sandbox" && route.sandboxView) {
    const project =
      route.sandboxProjectId &&
      /^[a-zA-Z0-9-]{1,80}$/.test(route.sandboxProjectId)
        ? `&project=${route.sandboxProjectId}`
        : "";
    return `#sandbox?view=${route.sandboxView}${project}`;
  }
  if (route.view !== "workshop") return `#${route.view}`;
  if (route.workshopView === "built") return "#workshop?view=built";
  if (route.workshopFilter === "ready") return "#workshop?view=ready";
  return "#workshop";
}
