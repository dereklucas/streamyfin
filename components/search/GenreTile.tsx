import type { BaseItemDto } from "@jellyfin/sdk/lib/generated-client/models";
import { useAtomValue } from "jotai";
import { TouchableOpacity, View } from "react-native";
import { Image } from "@/components/common/ServerImage";
import { Text } from "@/components/common/Text";
import { apiAtom } from "@/providers/JellyfinProvider";
import { getPrimaryImageUrl } from "@/utils/jellyfin/image/getPrimaryImageUrl";

const POSTER_ASPECT = 1.5;
/** A card's share of the tile's width; the ones behind it slide out right. */
const CARD_SHARE = 0.5;
const TILE_PADDING = 12;
/** How much darker each card behind the front one is. */
const BACK_CARD_SHADE = 0.28;

/**
 * A genre to browse: its name under a stack of its best rated movies and
 * shows, upright like playing cards slid out of a deck, the best in front.
 * The landing page picks the posters, so no title repeats across tiles.
 */
export const GenreTile: React.FC<{
  genre: BaseItemDto;
  posters: BaseItemDto[];
  width: number;
  onPress: (genre: BaseItemDto) => void;
}> = ({ genre, posters, width, onPress }) => {
  const api = useAtomValue(apiAtom);

  const cardWidth = width * CARD_SHARE;
  const cardHeight = cardWidth * POSTER_ASPECT;
  const room = width - TILE_PADDING * 2 - cardWidth;
  const step = posters.length > 1 ? room / (posters.length - 1) : 0;

  return (
    <TouchableOpacity
      accessibilityRole='button'
      accessibilityLabel={genre.Name ?? ""}
      onPress={() => onPress(genre)}
      style={{ width }}
      className='rounded-xl bg-neutral-900 overflow-hidden'
    >
      <View style={{ height: cardHeight + TILE_PADDING }}>
        {/* Painted back to front, so the best poster ends up on top. */}
        {posters
          .map((item, index) => ({ item, index }))
          .reverse()
          .map(({ item, index }) => {
            const uri = getPrimaryImageUrl({
              api,
              item,
              width: Math.round(cardWidth * 3),
            });
            return (
              <View
                key={item.Id}
                style={{
                  position: "absolute",
                  top: TILE_PADDING,
                  left: TILE_PADDING + index * step,
                  width: cardWidth,
                  height: cardHeight,
                  borderRadius: 6,
                  overflow: "hidden",
                  backgroundColor: "#262626",
                }}
              >
                {uri ? (
                  <Image
                    source={{ uri }}
                    style={{ width: "100%", height: "100%" }}
                    contentFit='cover'
                  />
                ) : null}
                {index > 0 && (
                  <View
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: `rgba(0,0,0,${BACK_CARD_SHADE * index})`,
                    }}
                  />
                )}
              </View>
            );
          })}
      </View>
      <Text numberOfLines={1} className='font-bold text-base px-3 py-2'>
        {genre.Name}
      </Text>
    </TouchableOpacity>
  );
};
