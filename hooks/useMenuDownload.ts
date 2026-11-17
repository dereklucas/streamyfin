import type { BaseItemDto } from "@jellyfin/sdk/lib/generated-client/models";
import { getShowApi } from "@jellyfin/sdk/lib/utils/api";
import { useAtomValue } from "jotai";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner-native";
import { useStartDownloads } from "@/hooks/useStartDownloads";
import { apiAtom, userAtom } from "@/providers/JellyfinProvider";
import { writeErrorLog } from "@/utils/log";
import { playableQueueItems } from "@/utils/playableQueueItems";

/**
 * The long-press menu's Download: a video as it is, or every episode of a
 * season or series that has a file, each with its default play settings.
 * The download provider announces each start itself.
 */
export const useMenuDownload = () => {
  const api = useAtomValue(apiAtom);
  const user = useAtomValue(userAtom);
  const { t } = useTranslation();
  const startDownloads = useStartDownloads();

  return useCallback(
    async (item: BaseItemDto): Promise<void> => {
      try {
        if (item.Type !== "Series" && item.Type !== "Season") {
          await startDownloads([item]);
          return;
        }
        if (!api || !user?.Id || !item.Id) return;
        const seriesId = item.Type === "Series" ? item.Id : item.SeriesId;
        if (!seriesId) return;
        const response = await getShowApi(api).getEpisodes({
          seriesId,
          seasonId: item.Type === "Season" ? item.Id : undefined,
          userId: user.Id,
          enableUserData: true,
          fields: ["MediaSources", "MediaStreams", "Overview", "Chapters"],
        });
        // A missing episode is a placeholder with no file to download.
        await startDownloads(playableQueueItems(response.data.Items ?? []));
      } catch (error) {
        writeErrorLog("Menu download failed to start", error);
        toast.error(t("home.downloads.toasts.failed_to_start_download"));
      }
    },
    [api, user?.Id, startDownloads, t],
  );
};
