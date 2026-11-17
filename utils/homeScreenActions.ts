import type { BaseItemDto } from "@jellyfin/sdk/lib/generated-client/models";
import type { Action } from "expo-quick-actions";
import type { TFunction } from "i18next";

const TICKS_PER_MINUTE = 600_000_000;

/** How many quick actions iOS shows from the Home Screen icon. */
export const HOME_SCREEN_MAX_ACTIONS = 4;

const RESUME_PREFIX = "resume:";
const LIBRARY_PREFIX = "library:";

/** How many in-progress items to offer: the latest is the one to go back to. */
const MAX_RESUMES = 1;

// The libraries most people have, offered ahead of the rest.
const FIRST_LIBRARY_TYPES = ["tvshows", "movies"];

const LIBRARY_ICONS: Record<string, string> = {
  tvshows: "symbol:tv",
  movies: "symbol:film",
  music: "symbol:music.note",
  homevideos: "symbol:video",
  photos: "symbol:photo",
  livetv: "symbol:dot.radiowaves.left.and.right",
  boxsets: "symbol:square.stack",
  playlists: "symbol:music.note.list",
};

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
 * The quick actions on the app's Home Screen icon, at most four: resuming the
 * latest in-progress item, the user's libraries in whatever room is left (TV
 * and movie libraries first, then the server's order), Search, and Downloads
 * while anything is downloaded. Pure, so it is the spec's;
 * HomeScreenQuickActions sets and handles them.
 */
export const buildHomeScreenActions = (
  {
    resumeItems,
    libraries,
    hasDownloads,
  }: {
    resumeItems: BaseItemDto[];
    /** The libraries the Libraries tab shows, in the server's order. */
    libraries: BaseItemDto[];
    hasDownloads: boolean;
  },
  t: TFunction,
): Action[] => {
  const resumes: Action[] = resumeItems
    .filter((item) => item.Id)
    .slice(0, MAX_RESUMES)
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
  const pages: Action[] = PAGES.filter(
    (page) => page.id !== "downloads" || hasDownloads,
  ).map((page) => ({
    id: page.id,
    title: t(page.titleKey),
    icon: page.icon,
  }));

  // A stable sort: the first types move ahead, everything keeps its order.
  const rank = (library: BaseItemDto) => {
    const index = FIRST_LIBRARY_TYPES.indexOf(library.CollectionType ?? "");
    return index === -1 ? FIRST_LIBRARY_TYPES.length : index;
  };
  const room = HOME_SCREEN_MAX_ACTIONS - resumes.length - pages.length;
  const libraryActions: Action[] = libraries
    .filter((library) => library.Id)
    .map((library, index) => ({ library, index }))
    .sort((a, b) => rank(a.library) - rank(b.library) || a.index - b.index)
    .slice(0, Math.max(0, room))
    .map(({ library }) => ({
      id: `${LIBRARY_PREFIX}${library.Id}`,
      title: library.Name ?? "",
      icon: LIBRARY_ICONS[library.CollectionType ?? ""] ?? "symbol:folder",
    }));

  return [...resumes, ...libraryActions, ...pages];
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
  if (action.id.startsWith(LIBRARY_PREFIX)) {
    const libraryId = action.id.slice(LIBRARY_PREFIX.length);
    return libraryId
      ? { kind: "navigate", href: `/(auth)/(tabs)/(libraries)/${libraryId}` }
      : null;
  }
  const page = PAGES.find((p) => p.id === action.id);
  return page ? { kind: "navigate", href: page.href } : null;
};
