import { Ionicons } from "@expo/vector-icons";
import { useSegments } from "expo-router";
import { useAtomValue } from "jotai";
import type React from "react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { TouchableOpacity, View } from "react-native";
import { buildCardPreview } from "@/components/cards/cardPreview";
import { Image } from "@/components/common/ServerImage";
import { Text } from "@/components/common/Text";
import { TouchableItemRouter } from "@/components/common/TouchableItemRouter";
import { Colors } from "@/constants/Colors";
import useRouter from "@/hooks/useAppRouter";
import { useNextUp } from "@/hooks/useNextUp";
import { usePlayItem } from "@/hooks/usePlayItem";
import { apiAtom } from "@/providers/JellyfinProvider";
import { getItemNavigation } from "@/utils/itemNavigation";
import { getWideImageUrl } from "@/utils/jellyfin/image/getWideImageUrl";

const THUMB_WIDTH = 160;
const THUMB_HEIGHT = THUMB_WIDTH * (9 / 16);

/**
 * The show page's next episode, ready to play: where it is, how much is
 * left, and Resume (or Play) with the default audio and subtitles, so the
 * episode page is only needed for its versions, audio and subtitle choice
 * (Details). Nothing when nothing is next.
 */
export const UpNextCard: React.FC<{
  seriesId: string;
  /** Told once it is known whether there is anything next. */
  onSettled?: () => void;
}> = ({ seriesId, onSettled }) => {
  const { t } = useTranslation();
  const api = useAtomValue(apiAtom);
  const router = useRouter();
  const segments = useSegments();
  const from = (segments as string[])[2] || "(home)";
  const play = usePlayItem();
  const { data: items, isLoading } = useNextUp(seriesId);
  useEffect(() => {
    if (!isLoading) onSettled?.();
  }, [isLoading, onSettled]);
  const episode = items?.[0];
  if (!episode) return null;

  const preview = buildCardPreview(episode);
  const details = preview?.kind === "episode" ? preview : undefined;
  const started = details?.minutesLeft !== undefined;
  const imageUrl = getWideImageUrl({
    api,
    item: episode,
    useEpisodePoster: true,
    fillHeight: Math.round(THUMB_HEIGHT * 3),
    fillWidth: Math.round(THUMB_WIDTH * 3),
  });
  const playLabel = started ? t("item_card.resume_playback") : t("common.play");

  return (
    <View className='mx-4 mb-4 p-3 rounded-xl bg-neutral-900 flex flex-row'>
      <TouchableItemRouter item={episode}>
        <View
          style={{ width: THUMB_WIDTH, height: THUMB_HEIGHT }}
          className='rounded-lg overflow-hidden bg-neutral-800'
        >
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={{ width: "100%", height: "100%" }}
              contentFit='cover'
            />
          ) : null}
        </View>
      </TouchableItemRouter>
      <View className='flex-1 ml-3 justify-between'>
        <View>
          <Text className='text-xs font-semibold text-neutral-400 uppercase'>
            {t("item_card.next_up")}
          </Text>
          <Text numberOfLines={2} className='font-bold mt-0.5'>
            {[details?.episodeNumber, episode.Name].filter(Boolean).join(" · ")}
          </Text>
          {started && (
            <Text className='text-xs text-neutral-400 mt-0.5'>
              {t("item_card.preview.minutes_left", {
                count: details?.minutesLeft,
              })}
            </Text>
          )}
        </View>
        <View className='flex flex-row items-center mt-2'>
          <TouchableOpacity
            accessibilityRole='button'
            accessibilityLabel={playLabel}
            onPress={() => void play(episode)}
            className='flex flex-row items-center px-3 py-1.5 rounded-full'
            style={{ backgroundColor: Colors.primary }}
          >
            <Ionicons name='play' size={14} color='white' />
            <Text className='ml-1 font-semibold text-sm'>{playLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole='button'
            accessibilityLabel={t("item_card.more_details")}
            onPress={() =>
              router.push(getItemNavigation(episode, from) as never)
            }
            className='ml-3 py-1.5'
          >
            <Text className='text-sm text-neutral-300'>
              {t("item_card.more_details")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};
