import type {
  BaseItemDto,
  BaseItemKind,
} from "@jellyfin/sdk/lib/generated-client/models";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useActionSheet } from "@/hooks/useActionSheet";
import { useFavorite } from "@/hooks/useFavorite";
import { useMarkAsPlayed } from "@/hooks/useMarkAsPlayed";
import { useShuffleSeries } from "@/hooks/useShuffleSeries";
import { useDownload } from "@/providers/DownloadProvider";
import { useOfflineMode } from "@/providers/OfflineModeProvider";

// What the sheet opens for. The containers (Series, Season, BoxSet, Folder) go
// through the same played call as a single video: the server walks down from
// the id it is given and marks every child.
const ACTION_SHEET_ITEM_TYPES: ReadonlySet<BaseItemKind> = new Set([
  "Movie",
  "Episode",
  "Video",
  "Series",
  "Season",
  "BoxSet",
  "Folder",
]);

/**
 * The long-press action sheet for a media item: shuffle (a series), played
 * state, favorite, and — offline — deleting the download.
 *
 * Returns a function that presents the sheet and resolves once it closes, so a
 * caller that mounts it on demand knows when to unmount again. Unsupported item
 * types present nothing and resolve immediately.
 */
export function useItemActionSheet(item: BaseItemDto) {
  const { t } = useTranslation();
  const { showActionSheetWithOptions } = useActionSheet();
  const markAsPlayedStatus = useMarkAsPlayed([item]);
  const { isFavorite, toggleFavorite } = useFavorite(item);
  const isOffline = useOfflineMode();
  const { deleteFile } = useDownload();
  const shuffleSeries = useShuffleSeries();

  return useCallback((): Promise<void> => {
    if (!item.Type || !ACTION_SHEET_ITEM_TYPES.has(item.Type)) {
      return Promise.resolve();
    }

    // Built as a list so an action's place in the sheet is not its identity.
    const actions: { label: string; run: () => unknown }[] = [
      ...(item.Type === "Series"
        ? [
            {
              label: t("player.shuffle"),
              run: () => shuffleSeries(item, { isOffline }),
            },
          ]
        : []),
      {
        label: t("common.mark_as_played"),
        run: () => markAsPlayedStatus(true),
      },
      {
        label: t("common.mark_as_not_played"),
        run: () => markAsPlayedStatus(false),
      },
      {
        label: isFavorite
          ? t("music.track_options.remove_from_favorites")
          : t("music.track_options.add_to_favorites"),
        run: toggleFavorite,
      },
      ...(isOffline && item.Id
        ? [
            {
              label: t("home.downloads.delete_download"),
              run: () => deleteFile(item.Id!),
            },
          ]
        : []),
    ];
    const options = [
      ...actions.map((action) => action.label),
      t("common.cancel"),
    ];
    const cancelButtonIndex = options.length - 1;
    const destructiveButtonIndex =
      isOffline && item.Id ? cancelButtonIndex - 1 : undefined;

    return new Promise<void>((resolve) => {
      showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex,
          destructiveButtonIndex,
        },
        async (selectedIndex) => {
          const action =
            selectedIndex === undefined ? undefined : actions[selectedIndex];
          await action?.run();
          resolve();
        },
      );
    });
  }, [
    showActionSheetWithOptions,
    shuffleSeries,
    item,
    isFavorite,
    markAsPlayedStatus,
    toggleFavorite,
    isOffline,
    deleteFile,
    t,
  ]);
}
