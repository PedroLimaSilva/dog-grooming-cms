export type AppRoute =
  | { name: "calendar" }
  | { name: "dogs"; segment: "list" | "new" | { id: number } }
  | { name: "owners"; segment: "list" | "new" | { id: number } }
  | { name: "settings" };

export type MainTab = "calendar" | "dogs" | "owners" | "settings";

export function tabFromRoute(r: AppRoute): MainTab {
  if (r.name === "settings") return "settings";
  if (r.name === "calendar") return "calendar";
  if (r.name === "dogs") return "dogs";
  return "owners";
}

export function parseHash(hash: string): AppRoute {
  const raw = hash.replace(/^#/, "").replace(/^\//, "");
  const parts = raw.split("/").filter(Boolean);

  if (parts.length === 0 || parts[0] === "calendar") {
    return { name: "calendar" };
  }

  if (parts[0] === "dogs") {
    if (parts.length === 1) return { name: "dogs", segment: "list" };
    if (parts[1] === "new") return { name: "dogs", segment: "new" };
    const id = Number(parts[1]);
    if (Number.isInteger(id) && id > 0)
      return { name: "dogs", segment: { id } };
    return { name: "dogs", segment: "list" };
  }

  if (parts[0] === "owners") {
    if (parts.length === 1) return { name: "owners", segment: "list" };
    if (parts[1] === "new") return { name: "owners", segment: "new" };
    const id = Number(parts[1]);
    if (Number.isInteger(id) && id > 0)
      return { name: "owners", segment: { id } };
    return { name: "owners", segment: "list" };
  }

  if (parts[0] === "settings") {
    return { name: "settings" };
  }

  return { name: "calendar" };
}

export function formatRoute(r: AppRoute): string {
  switch (r.name) {
    case "calendar":
      return "#/calendar";
    case "dogs":
      if (r.segment === "list") return "#/dogs";
      if (r.segment === "new") return "#/dogs/new";
      return `#/dogs/${r.segment.id}`;
    case "owners":
      if (r.segment === "list") return "#/owners";
      if (r.segment === "new") return "#/owners/new";
      return `#/owners/${r.segment.id}`;
    case "settings":
      return "#/settings";
  }
}

export function readRouteFromLocation(): AppRoute {
  if (typeof window === "undefined") return { name: "calendar" };
  return parseHash(window.location.hash || "#/calendar");
}

export function navigateTo(route: AppRoute): void {
  if (typeof window === "undefined") return;
  window.location.hash = formatRoute(route);
}
