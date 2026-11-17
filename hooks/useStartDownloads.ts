import type {
  BaseItemDto,
  MediaSourceInfo,
} from "@jellyfin/sdk/lib/generated-client/models";
import { getLibraryApi } from "@jellyfin/sdk/lib/utils/api";
import { useAtomValue } from "jotai";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Alert } from "react-native";
import { toast } from "sonner-native";
import type { Bitrate } from "@/components/BitrateSelector";
import { useDownload } from "@/providers/DownloadProvider";
import { apiAtom, userAtom } from "@/providers/JellyfinProvider";
import { useSettings } from "@/utils/atoms/settings";
import { toDownloadBitrate } from "@/utils/bitrate";
import { getDefaultPlaySettings } from "@/utils/jellyfin/getDefaultPlaySettings";
import { getDownloadStreamUrl } from "@/utils/jellyfin/media/getStreamUrl";
import { logAndCaptureError } from "@/utils/log";

/** A version and tracks picked for one item, as the download sheet offers. */
export interface DownloadTracks {
  mediaSource?: MediaSourceInfo;
  audioIndex?: number;
  subtitleIndex?: number;
}

interface StartOptions {
  /** The quality to download at. Default: the play setting's, Auto as Max. */
  bitrate?: Bitrate;
  /**
   * The version and tracks to download. Only one item can have them; with
   * none, each item gets its own default play settings.
   */
  tracks?: DownloadTracks;
}

/**
 * Starts downloading items in the background, skipping what is already
 * downloaded. The download sheet passes what was picked in it; the long-press
 * menu passes nothing, and each item is downloaded the way it would play.
 */
export const useStartDownloads = () => {
  const api = useAtomValue(apiAtom);
  const user = useAtomValue(userAtom);
  const { settings } = useSettings();
  const { t } = useTranslation();
  const { startBackgroundDownload, downloadedItems } = useDownload();

  return useCallback(
    async (items: BaseItemDto[], options: StartOptions = {}) => {
      if (!api || !user?.Id || items.some((item) => !item.Id)) {
        throw new Error("useStartDownloads: no api, user or item id");
      }
      const toDownload = items.filter(
        (item) => !downloadedItems?.some((d) => d.item.Id === item.Id),
      );

      const details = await Promise.all(
        toDownload.map(async (item) => {
          // Ensure the snapshot we store offline carries the Chapters array.
          // Page-level fetches sometimes use a fields filter that omits it;
          // the offline player would then render no chapter ticks / list.
          let itemForDownload = item;
          if (!itemForDownload.Chapters && itemForDownload.Id) {
            try {
              const enriched = await getLibraryApi(api).getItem({
                itemId: itemForDownload.Id,
                userId: user.Id!,
              });
              if (enriched.data) itemForDownload = enriched.data;
            } catch (e) {
              console.warn(
                "[useStartDownloads] failed to refresh item for Chapters, falling back to original",
                e,
              );
            }
          }

          const defaults = getDefaultPlaySettings(itemForDownload, settings);
          const tracks = options.tracks ?? {
            mediaSource: defaults.mediaSource ?? undefined,
            audioIndex: defaults.audioIndex,
            subtitleIndex: defaults.subtitleIndex,
          };
          const bitrate =
            options.bitrate ?? toDownloadBitrate(defaults.bitrate);

          // Awaited with Promise.all over a season: a throw would abort the batch.
          const stream = await getDownloadStreamUrl({
            api,
            item: itemForDownload,
            userId: user.Id!,
            mediaSourceId: tracks.mediaSource?.Id ?? undefined,
            audioStreamIndex: tracks.audioIndex ?? -1,
            subtitleStreamIndex: tracks.subtitleIndex ?? -1,
            maxStreamingBitrate: bitrate.value,
            audioMode: settings?.audioTranscodeMode,
          }).catch((error) => {
            logAndCaptureError("Getting download stream URL failed", error, {
              itemType: itemForDownload.Type,
            });
            return null;
          });

          return {
            url: stream?.url,
            item: itemForDownload,
            mediaSource: stream?.mediaSource,
            tracks,
            bitrate,
          };
        }),
      );

      for (const { url, item, mediaSource, tracks, bitrate } of details) {
        if (!url) {
          Alert.alert(
            t("home.downloads.something_went_wrong"),
            t("home.downloads.could_not_get_stream_url_from_jellyfin"),
          );
          continue;
        }
        if (!mediaSource) {
          toast.error(
            t("home.downloads.toasts.could_not_get_download_url_for_item", {
              itemName: item.Name,
            }),
          );
          continue;
        }
        await startBackgroundDownload(
          url,
          item,
          mediaSource,
          bitrate,
          tracks.audioIndex,
          tracks.subtitleIndex,
        );
      }
    },
    [api, user?.Id, settings, t, startBackgroundDownload, downloadedItems],
  );
};
