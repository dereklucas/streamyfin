import type {
  BaseItemDto,
  BaseItemKind,
} from "@jellyfin/sdk/lib/generated-client/models";
import type { TFunction } from "i18next";
import { formatDuration } from "@/utils/time";

// What a long press offers anything for. The containers (Series, Season,
// BoxSet, Folder) go through the same played call as a single video: the
// server walks down from the id it is given and marks every child.
const ITEM_ACTION_TYPES: ReadonlySet<BaseItemKind> = new Set([
  "Movie",
  "Episode",
  "Video",
  "Series",
  "Season",
  "BoxSet",
  "Folder",
]);

// What a long press can download: one video, or every episode of a season or
// series. A collection or folder could hold anything, and is left to its page.
const DOWNLOADABLE_TYPES: ReadonlySet<BaseItemKind> = new Set([
  "Movie",
  "Episode",
  "Video",
  "Season",
  "Series",
]);

const downloadLabel = (type: BaseItemKind, t: TFunction) => {
  switch (type) {
    case "Series":
      return t("item_card.download.download_series");
    case "Season":
      return t("item_card.download.download_season");
    case "Episode":
      return t("item_card.download.download_episode");
    case "Movie":
      return t("item_card.download.download_movie");
    default:
      return t("item_card.download.download_button");
  }
};

// What a long press can play as it is: a video. A series plays its next
// episode instead, which the server picks.
const PLAYABLE_TYPES: ReadonlySet<BaseItemKind> = new Set([
  "Movie",
  "Episode",
  "Video",
]);

export type ItemActionKey =
  | "play"
  | "playFromStart"
  | "playNext"
  | "goToSeries"
  | "shuffle"
  | "played"
  | "unplayed"
  | "favorite"
  | "download"
  | "delete";

export interface ItemMenuAction {
  key: ItemActionKey;
  label: string;
  /**
   * Where the native context menu puts it: the icon row on top, the list
   * under it, or apart at the end in red.
   */
  group: "quick" | "primary" | "nav" | "destructive";
  /** The label under the icon in the quick row, where a long one wraps. */
  shortLabel?: string;
  /** SF Symbol for the native context menu. iOS 16-safe names only. */
  systemImage: string;
  destructive?: boolean;
}

/**
 * The long-press actions for a media item, in order: playing it (resuming
 * where it was left, with starting over beside that) or, for a series, its
 * next episode and a shuffle; the played state it is not in, favorite and
 * download; going to its show or season; and, once it is downloaded (or
 * offline), deleting the download. Plain data, so
 * the native context menu can describe every poster's menu without mounting
 * the hooks that run them; `useItemActions` runs one by its key.
 */
export const itemMenuActions = (
  item: BaseItemDto,
  {
    t,
    isOffline,
    isFavorite,
    isDownloaded,
    canDownload,
  }: {
    t: TFunction;
    isOffline: boolean;
    isFavorite: boolean;
    /** The item itself is downloaded. A series or season passes false. */
    isDownloaded: boolean;
    /** The server lets this user download (Policy.EnableContentDownloading). */
    canDownload: boolean;
  },
): ItemMenuAction[] => {
  if (!item.Type || !ITEM_ACTION_TYPES.has(item.Type)) return [];
  const isPlayed = Boolean(item.UserData?.Played);
  // A missing episode is a placeholder with no file behind it.
  const hasFile = Boolean(item.Id) && item.LocationType !== "Virtual";
  const offerPlay = hasFile && PLAYABLE_TYPES.has(item.Type);
  const resumeTicks = item.UserData?.PlaybackPositionTicks ?? 0;
  const isEpisode = item.Type === "Episode";
  const offerDelete = (isOffline || isDownloaded) && Boolean(item.Id);
  const offerDownload =
    !offerDelete &&
    !isOffline &&
    canDownload &&
    DOWNLOADABLE_TYPES.has(item.Type);
  return [
    ...(offerPlay
      ? resumeTicks > 0
        ? [
            {
              key: "play" as const,
              label: t("item_card.menu.resume_from", {
                time: formatDuration(resumeTicks),
              }),
              systemImage: "play.fill",
              group: "primary" as const,
            },
            {
              key: "playFromStart" as const,
              label: t("item_card.play_from_start"),
              systemImage: "arrow.counterclockwise",
              group: "primary" as const,
            },
          ]
        : [
            {
              key: "play" as const,
              label: t("common.play"),
              systemImage: "play.fill",
              group: "primary" as const,
            },
          ]
      : []),
    ...(item.Type === "Series" && !isOffline
      ? [
          {
            key: "playNext" as const,
            label: t("item_card.menu.play_next_episode"),
            systemImage: "play.fill",
            group: "primary" as const,
          },
        ]
      : []),
    ...(item.Type === "Series"
      ? [
          {
            key: "shuffle" as const,
            label: t("player.shuffle"),
            systemImage: "shuffle",
            group: "primary" as const,
          },
        ]
      : []),
    isPlayed
      ? {
          key: "unplayed",
          label: t("common.mark_as_not_played"),
          shortLabel: t("item_card.menu.mark_unwatched"),
          systemImage: "circle",
          group: "quick",
        }
      : {
          key: "played",
          label: t("common.mark_as_played"),
          shortLabel: t("item_card.menu.mark_watched"),
          systemImage: "checkmark.circle",
          group: "quick",
        },
    isFavorite
      ? {
          key: "favorite",
          label: t("music.track_options.remove_from_favorites"),
          shortLabel: t("item_card.menu.unfavorite"),
          systemImage: "heart.slash",
          group: "quick",
        }
      : {
          key: "favorite",
          label: t("music.track_options.add_to_favorites"),
          shortLabel: t("item_card.menu.favorite"),
          systemImage: "heart",
          group: "quick",
        },
    ...(offerDownload
      ? [
          {
            key: "download" as const,
            label: downloadLabel(item.Type, t),
            shortLabel: t("item_card.menu.download"),
            systemImage: "arrow.down.circle",
            group: "quick" as const,
          },
        ]
      : []),
    ...((isEpisode || item.Type === "Season") && item.SeriesId
      ? [
          {
            key: "goToSeries" as const,
            label: t("item_card.menu.go_to_show"),
            systemImage: "tv",
            group: "nav" as const,
          },
        ]
      : []),
    ...(offerDelete
      ? [
          {
            key: "delete" as const,
            label: t("home.downloads.delete_download"),
            systemImage: "trash",
            destructive: true,
            group: "destructive" as const,
          },
        ]
      : []),
  ];
};
