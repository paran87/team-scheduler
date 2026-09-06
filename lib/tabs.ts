import type { TabName } from "./types";

export const TAB_STORAGE_KEY = "okb-active-tab";

export const TAB_LABELS: Record<TabName, string> = {
  dashboard: "Dashboard",
  calendar: "Calendar",
  activity: "Activities",
  reports: "Reports",
};

export function isTabName(value: string | null | undefined): value is TabName {
  return value === "dashboard" || value === "calendar" || value === "activity" || value === "reports";
}

export function parseTab(value: string | null | undefined): TabName {
  return isTabName(value) ? value : "dashboard";
}

export function homeTabHref(tab: TabName = "dashboard") {
  return tab === "dashboard" ? "/" : `/?tab=${tab}`;
}

export function labelForReturnUrl(url: URL) {
  const path = url.pathname.replace(/\/$/, "") || "/";
  if (path === "/") return TAB_LABELS[parseTab(url.searchParams.get("tab"))];
  if (path.startsWith("/backend")) return "Admin";
  if (path.startsWith("/teams")) return "Team";
  if (path.startsWith("/days")) return "Team composition";
  if (path.startsWith("/activities")) return "Activities";
  return "Back";
}

export function backLinkFromReferer(referer: string | null | undefined, requestHost?: string | null) {
  const fallback = { href: homeTabHref(), label: "← Back" };
  if (!referer) return fallback;
  try {
    const url = new URL(referer);
    if (requestHost && url.host !== requestHost && url.hostname !== requestHost) {
      return fallback;
    }
    const path = url.pathname.replace(/\/$/, "") || "/";
    if (path.startsWith("/activities")) return fallback;
    return {
      href: `${url.pathname}${url.search}${url.hash}` || homeTabHref(),
      label: `← ${labelForReturnUrl(url)}`,
    };
  } catch {
    return fallback;
  }
}
