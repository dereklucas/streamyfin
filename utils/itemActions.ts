import type {
  BaseItemDto,
  BaseItemKind,
} from "@jellyfin/sdk/lib/generated-client/models";
import type { TFunction } from "i18next";

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

export type ItemActionKey =
  | "shuffle"
  | "played"
  | "unplayed"
  | "favorite"
  | "download"
  | "delete";

export interface ItemMenuAction {
  key: ItemActionKey;
  label: string;
  /** SF Symbol for the native context menu. iOS 16-safe names only. */
  systemImage: string;
  destructive?: boolean;
}

/**
 * The long-press actions for a media item, in order: shuffle (a series), the
 * played state it is not in, favorite, and downloading it or, once it is
 * downloaded (or offline), deleting the download. Plain data, so
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
  const offerDelete = (isOffline || isDownloaded) && Boolean(item.Id);
  const offerDownload =
    !offerDelete &&
    !isOffline &&
    canDownload &&
    DOWNLOADABLE_TYPES.has(item.Type);
  return [
    ...(item.Type === "Series"
      ? [
          {
            key: "shuffle" as const,
            label: t("player.shuffle"),
            systemImage: "shuffle",
          },
        ]
      : []),
    isPlayed
      ? {
          key: "unplayed",
          label: t("common.mark_as_not_played"),
          systemImage: "circle",
        }
      : {
          key: "played",
          label: t("common.mark_as_played"),
          systemImage: "checkmark.circle",
        },
    isFavorite
      ? {
          key: "favorite",
          label: t("music.track_options.remove_from_favorites"),
          systemImage: "heart.slash",
        }
      : {
          key: "favorite",
          label: t("music.track_options.add_to_favorites"),
          systemImage: "heart",
        },
    ...(offerDownload
      ? [
          {
            key: "download" as const,
            label: downloadLabel(item.Type, t),
            systemImage: "arrow.down.circle",
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
          },
        ]
      : []),
  ];
};
