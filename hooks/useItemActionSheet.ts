import type { BaseItemDto } from "@jellyfin/sdk/lib/generated-client/models";
import { useSegments } from "expo-router";
import { useAtomValue } from "jotai";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { platformDetails } from "@/components/common/NativeContextMenu";
import { useActionSheet } from "@/hooks/useActionSheet";
import useRouter from "@/hooks/useAppRouter";
import { useFavorite } from "@/hooks/useFavorite";
import { useMarkAsPlayed } from "@/hooks/useMarkAsPlayed";
import { useMenuDownload } from "@/hooks/useMenuDownload";
import { usePlayItem } from "@/hooks/usePlayItem";
import { usePlayNextEpisode } from "@/hooks/usePlayNextEpisode";
import { useShuffleSeries } from "@/hooks/useShuffleSeries";
import { useDownload } from "@/providers/DownloadProvider";
import { userAtom } from "@/providers/JellyfinProvider";
import { useOfflineMode } from "@/providers/OfflineModeProvider";
import {
  getDownloadedEpisodesForSeason,
  getDownloadedEpisodesForSeries,
} from "@/utils/downloads/offline-series";
import { type ItemActionKey, itemMenuActions } from "@/utils/itemActions";
import { getItemNavigation } from "@/utils/itemNavigation";
import { writeInfoLog } from "@/utils/log";

/**
 * Runs the long-press actions of one item (see `itemMenuActions`), by key.
 * Shared by the action sheet and the native context menu's runner.
 */
export function useItemActions(item: BaseItemDto) {
  const markAsPlayedStatus = useMarkAsPlayed([item]);
  const { isFavorite, toggleFavorite } = useFavorite(item);
  const isOffline = useOfflineMode();
  const { deleteFile, deleteItems, downloadedItems, getDownloadedItems } =
    useDownload();
  const shuffleSeries = useShuffleSeries();
  const menuDownload = useMenuDownload();
  const playItem = usePlayItem();
  const playNextEpisode = usePlayNextEpisode();
  const router = useRouter();
  const segments = useSegments();
  // The tab the long press happened in, so the page opens in that tab's stack.
  const from = (segments as string[])[2] || "(home)";
  const user = useAtomValue(userAtom);
  const isDownloaded = Boolean(
    item.Id && downloadedItems?.some((d) => d.item.Id === item.Id),
  );
  const canDownload = Boolean(user?.Policy?.EnableContentDownloading);

  const run = useCallback(
    async (key: ItemActionKey): Promise<void> => {
      switch (key) {
        case "play":
        case "playFromStart":
          await playItem(item, {
            fromStart: key === "playFromStart",
            isOffline,
          });
          return;
        case "playNext":
          await playNextEpisode(item);
          return;
        case "goToSeries": {
          if (!item.SeriesId) return;
          // The show, at the episode's (or the season's own) season: a
          // season opens as its series page, on that season.
          const seasonIndex =
            item.Type === "Season" ? item.IndexNumber : item.ParentIndexNumber;
          router.push(
            getItemNavigation(
              seasonIndex != null
                ? {
                    Id:
                      (item.Type === "Season" ? item.Id : item.SeasonId) ??
                      undefined,
                    Type: "Season",
                    SeriesId: item.SeriesId,
                    IndexNumber: seasonIndex,
                  }
                : { Id: item.SeriesId, Type: "Series" },
              from,
            ) as never,
          );
          return;
        }
        case "shuffle":
          await shuffleSeries(item, { isOffline });
          return;
        case "played":
          await markAsPlayedStatus(true);
          return;
        case "unplayed":
          await markAsPlayedStatus(false);
          return;
        case "favorite":
          toggleFavorite();
          return;
        case "download":
          await menuDownload(item);
          return;
        case "delete": {
          if (!item.Id) return;
          // A series or season has no file of its own: its download is its
          // downloaded episodes.
          if (item.Type === "Series" || item.Type === "Season") {
            const seriesId = item.Type === "Series" ? item.Id : item.SeriesId;
            if (!seriesId) return;
            const episodes =
              item.Type === "Series"
                ? getDownloadedEpisodesForSeries(getDownloadedItems(), seriesId)
                : getDownloadedEpisodesForSeason(
                    getDownloadedItems(),
                    seriesId,
                    item.IndexNumber ?? -1,
                  );
            const ids = episodes
              .map((episode) => episode.Id)
              .filter((id): id is string => Boolean(id));
            if (ids.length > 0) await deleteItems(ids);
            return;
          }
          deleteFile(item.Id);
          return;
        }
      }
    },
    [
      item,
      isOffline,
      shuffleSeries,
      markAsPlayedStatus,
      toggleFavorite,
      menuDownload,
      deleteFile,
      deleteItems,
      getDownloadedItems,
      playItem,
      playNextEpisode,
      router,
      from,
    ],
  );

  return {
    run,
    isFavorite: Boolean(isFavorite),
    isOffline,
    isDownloaded,
    canDownload,
  };
}

/**
 * Everything a long press on one item needs: its actions as plain data for
 * the native context menu, a runner for them, and the action sheet for where
 * there is no native menu. One set of action hooks serves all three.
 */
export function useItemLongPress(item: BaseItemDto) {
  const { t } = useTranslation();
  const { showActionSheetWithOptions } = useActionSheet();
  const { run, isFavorite, isOffline, isDownloaded, canDownload } =
    useItemActions(item);

  const menuActions = useMemo(
    () =>
      itemMenuActions(item, {
        t,
        isOffline,
        isFavorite,
        isDownloaded,
        canDownload,
      }),
    [item, t, isOffline, isFavorite, isDownloaded, canDownload],
  );

  const showActionSheet = useCallback((): Promise<void> => {
    if (menuActions.length === 0) return Promise.resolve();
    writeInfoLog("Long press opened the action sheet", {
      itemType: item.Type,
      ...platformDetails(),
    });

    const options = [
      ...menuActions.map((action) => action.label),
      t("common.cancel"),
    ];
    const cancelButtonIndex = options.length - 1;
    const destructiveIndex = menuActions.findIndex(
      (action) => action.destructive,
    );

    return new Promise<void>((resolve) => {
      showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex,
          destructiveButtonIndex:
            destructiveIndex === -1 ? undefined : destructiveIndex,
        },
        async (selectedIndex) => {
          const action =
            selectedIndex === undefined
              ? undefined
              : menuActions[selectedIndex];
          if (action) await run(action.key);
          resolve();
        },
      );
    });
  }, [showActionSheetWithOptions, run, menuActions, item.Type, t]);

  return { menuActions, runAction: run, showActionSheet };
}

/**
 * The long-press action sheet for a media item: shuffle (a series), played
 * state, favorite, and — offline — deleting the download.
 *
 * Returns a function that presents the sheet and resolves once it closes, so a
 * caller that mounts it on demand knows when to unmount again. Unsupported item
 * types present nothing and resolve immediately.
 */
export function useItemActionSheet(item: BaseItemDto) {
  return useItemLongPress(item).showActionSheet;
}
