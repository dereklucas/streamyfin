import type { BaseItemDto } from "@jellyfin/sdk/lib/generated-client/models";
import { getLibraryApi } from "@jellyfin/sdk/lib/utils/api";
import { useAtomValue } from "jotai";
import { useCallback } from "react";
import { usePlayMedia } from "@/hooks/usePlayMedia";
import { apiAtom, userAtom } from "@/providers/JellyfinProvider";
import { useSettings } from "@/utils/atoms/settings";
import { toBitrateRequest } from "@/utils/bitrate";
import { getDefaultPlaySettings } from "@/utils/jellyfin/getDefaultPlaySettings";

interface PlayItemOptions {
  /** Start at 0 instead of where the item was left. */
  fromStart?: boolean;
  isOffline?: boolean;
}

/**
 * Plays an item known only from a list, as a long press has it: with the
 * default version, tracks and quality the item page's Play button would
 * start with, from where it was left unless told to start over.
 */
export const usePlayItem = () => {
  const api = useAtomValue(apiAtom);
  const user = useAtomValue(userAtom);
  const { settings } = useSettings();
  const playMedia = usePlayMedia();

  return useCallback(
    async (
      item: BaseItemDto,
      { fromStart = false, isOffline = false }: PlayItemOptions = {},
    ) => {
      if (!item.Id) return;
      // A row's copy often lacks media sources, and with them the streams the
      // default audio and subtitle choices are made from. A download is whole.
      let target = item;
      if (!isOffline && !item.MediaSources && api && user?.Id) {
        try {
          const response = await getLibraryApi(api).getItem({
            itemId: item.Id,
            userId: user.Id,
          });
          if (response.data) target = response.data;
        } catch {
          // The server picks the defaults itself then.
        }
      }

      const { mediaSource, audioIndex, subtitleIndex, bitrate } =
        getDefaultPlaySettings(target, settings);

      await playMedia(
        {
          itemId: item.Id,
          audioIndex,
          subtitleIndex,
          mediaSourceId: mediaSource?.Id ?? undefined,
          bitrateValue: toBitrateRequest(bitrate),
          offline: isOffline,
          playbackPositionTicks: fromStart
            ? 0
            : (target.UserData?.PlaybackPositionTicks ?? 0),
        },
        { item: target },
      );
    },
    [api, user?.Id, settings, playMedia],
  );
};
