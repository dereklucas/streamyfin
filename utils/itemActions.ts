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

export type ItemActionKey =
  | "shuffle"
  | "played"
  | "unplayed"
  | "favorite"
  | "delete";

export interface ItemMenuAction {
  key: ItemActionKey;
  label: string;
  /** SF Symbol for the native context menu. iOS 16-safe names only. */
  systemImage: string;
  destructive?: boolean;
}

/**
 * The long-press actions for a media item, in order: shuffle (a series),
 * played state, favorite and, offline, deleting the download. Plain data, so
 * the native context menu can describe every poster's menu without mounting
 * the hooks that run them; `useItemActions` runs one by its key.
 */
export const itemMenuActions = (
  item: BaseItemDto,
  {
    t,
    isOffline,
    isFavorite,
  }: { t: TFunction; isOffline: boolean; isFavorite: boolean },
): ItemMenuAction[] => {
  if (!item.Type || !ITEM_ACTION_TYPES.has(item.Type)) return [];
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
    {
      key: "played",
      label: t("common.mark_as_played"),
      systemImage: "checkmark.circle",
    },
    {
      key: "unplayed",
      label: t("common.mark_as_not_played"),
      systemImage: "circle",
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
    ...(isOffline && item.Id
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
