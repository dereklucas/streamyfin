import type { BaseItemDto } from "@jellyfin/sdk/lib/generated-client/models";
import type { Action } from "expo-quick-actions";
import type { TFunction } from "i18next";

const TICKS_PER_MINUTE = 600_000_000;

/** How many quick actions iOS shows from the Home Screen icon. */
export const HOME_SCREEN_MAX_ACTIONS = 4;

const RESUME_PREFIX = "resume:";

// The static actions after the resumes, and where each one opens.
const PAGES = [
  {
    id: "search",
    titleKey: "tabs.search",
    icon: "symbol:magnifyingglass",
    href: "/(auth)/(tabs)/(search)",
  },
  {
    id: "downloads",
    titleKey: "home.downloads.downloads_title",
    icon: "symbol:arrow.down.circle",
    href: "/downloads",
  },
] as const;

const resumeSubtitle = (item: BaseItemDto, t: TFunction) => {
  const left = Math.max(
    0,
    Math.round(
      ((item.RunTimeTicks ?? 0) - (item.UserData?.PlaybackPositionTicks ?? 0)) /
        TICKS_PER_MINUTE,
    ),
  );
  const remaining = t("home_screen_actions.minutes_left", { count: left });
  if (item.Type !== "Episode") return remaining;
  const place = t("home_screen_actions.season_episode", {
    season: item.ParentIndexNumber ?? 0,
    episode: item.IndexNumber ?? 0,
  });
  return `${place} · ${remaining}`;
};

/**
 * The quick actions on the app's Home Screen icon: resuming what is in
 * progress (newest first, as many as fit), then Search and Downloads. Pure, so
 * it is the spec's; HomeScreenQuickActions sets and handles them.
 */
export const buildHomeScreenActions = (
  resumeItems: BaseItemDto[],
  t: TFunction,
): Action[] => {
  const resumes: Action[] = resumeItems
    .filter((item) => item.Id)
    .slice(0, HOME_SCREEN_MAX_ACTIONS - PAGES.length)
    .map((item) => ({
      id: `${RESUME_PREFIX}${item.Id}`,
      title:
        (item.Type === "Episode" ? item.SeriesName : item.Name) ??
        item.Name ??
        "",
      subtitle: resumeSubtitle(item, t),
      icon: "symbol:play.fill",
      params: { itemId: item.Id! },
    }));
  const pages: Action[] = PAGES.map((page) => ({
    id: page.id,
    title: t(page.titleKey),
    icon: page.icon,
  }));
  return [...resumes, ...pages];
};

export type HomeScreenActionTarget =
  | { kind: "resume"; itemId: string }
  | { kind: "navigate"; href: string };

/** What a chosen quick action does. Null for one this version does not set. */
export const homeScreenActionTarget = (
  action: Action,
): HomeScreenActionTarget | null => {
  if (action.id.startsWith(RESUME_PREFIX)) {
    const itemId = action.id.slice(RESUME_PREFIX.length);
    return itemId ? { kind: "resume", itemId } : null;
  }
  const page = PAGES.find((p) => p.id === action.id);
  return page ? { kind: "navigate", href: page.href } : null;
};
