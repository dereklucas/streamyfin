import type { BaseItemDto } from "@jellyfin/sdk/lib/generated-client/models";
import { getShowApi } from "@jellyfin/sdk/lib/utils/api";
import { useAtomValue } from "jotai";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner-native";
import { usePlayItem } from "@/hooks/usePlayItem";
import { apiAtom, userAtom } from "@/providers/JellyfinProvider";
import { writeErrorLog } from "@/utils/log";

/**
 * A series' long-press Play: asks the server for its next-up episode (the
 * one Next Up would show) and plays it from where it was left.
 */
export const usePlayNextEpisode = () => {
  const api = useAtomValue(apiAtom);
  const user = useAtomValue(userAtom);
  const { t } = useTranslation();
  const playItem = usePlayItem();

  return useCallback(
    async (series: BaseItemDto): Promise<void> => {
      if (!api || !user?.Id || !series.Id) return;
      try {
        const response = await getShowApi(api).getNextUp({
          seriesId: series.Id,
          userId: user.Id,
          limit: 1,
          fields: ["MediaSources", "MediaStreams"],
        });
        const next = response.data.Items?.[0];
        if (!next) {
          toast(t("item_card.menu.no_next_episode"));
          return;
        }
        await playItem(next);
      } catch (error) {
        writeErrorLog("Next episode failed to start", error);
        toast.error(t("common.something_went_wrong"));
      }
    },
    [api, user?.Id, t, playItem],
  );
};
