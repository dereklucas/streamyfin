import type { BaseItemDto } from "@jellyfin/sdk/lib/generated-client/models";
import { getShowApi } from "@jellyfin/sdk/lib/utils/api";
import { useAtomValue } from "jotai";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner-native";
import { useShuffleQueue } from "@/hooks/useShuffleQueue";
import { useDownload } from "@/providers/DownloadProvider";
import { apiAtom, userAtom } from "@/providers/JellyfinProvider";
import { getDownloadedEpisodesForSeries } from "@/utils/downloads/offline-series";
import { writeErrorLog } from "@/utils/log";

/**
 * Shuffle for a series known only by its item, as a long press on a poster
 * has it: fetches every episode (offline, the downloaded ones) and starts the
 * same shuffled queue as the series page's Shuffle button.
 */
export const useShuffleSeries = () => {
  const api = useAtomValue(apiAtom);
  const user = useAtomValue(userAtom);
  const { t } = useTranslation();
  const { getDownloadedItems } = useDownload();
  const { startShuffle } = useShuffleQueue();

  return useCallback(
    async (
      series: BaseItemDto,
      { isOffline = false }: { isOffline?: boolean } = {},
    ): Promise<void> => {
      if (!series.Id) return;
      try {
        let episodes: BaseItemDto[];
        if (isOffline) {
          episodes = getDownloadedEpisodesForSeries(
            getDownloadedItems(),
            series.Id,
          );
        } else {
          if (!api || !user?.Id) return;
          // The fields the series page asks for: the player picks its
          // version, audio and subtitles from them.
          const response = await getShowApi(api).getEpisodes({
            seriesId: series.Id,
            userId: user.Id,
            enableUserData: true,
            fields: ["MediaSources", "MediaStreams", "Overview", "Trickplay"],
          });
          episodes = response.data.Items ?? [];
        }
        if (!startShuffle(episodes, { isOffline })) {
          toast(t("item_card.no_episodes_to_shuffle"));
        }
      } catch (error) {
        writeErrorLog("Series shuffle failed to start", error);
        toast.error(t("common.something_went_wrong"));
      }
    },
    [api, user?.Id, getDownloadedItems, startShuffle, t],
  );
};
