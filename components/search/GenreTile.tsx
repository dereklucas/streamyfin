import type { BaseItemDto } from "@jellyfin/sdk/lib/generated-client/models";
import { useAtomValue } from "jotai";
import { TouchableOpacity, View } from "react-native";
import { Image } from "@/components/common/ServerImage";
import { Text } from "@/components/common/Text";
import { SEARCH_GENRE_POSTER_COUNT } from "@/constants/Search";
import { apiAtom } from "@/providers/JellyfinProvider";
import { getPrimaryImageUrl } from "@/utils/jellyfin/image/getPrimaryImageUrl";

const POSTER_ASPECT = 1.5;
/** A card's share of the tile's width; the ones behind it slide out right. */
const CARD_SHARE = 0.5;
const TILE_PADDING = 12;
/** How much darker each card behind the front one is. */
const BACK_CARD_SHADE = 0.28;
const PLACEHOLDER_COLOR = "#262626";

/**
 * A genre to browse: its name under a stack of its best rated movies and
 * shows, upright like playing cards slid out of a deck, the best in front.
 * The landing page picks the posters, so no title repeats across tiles.
 *
 * Without a genre it is its own placeholder, and without posters its cards
 * are: the same boxes, so nothing moves when they arrive.
 */
export const GenreTile: React.FC<{
  genre?: BaseItemDto;
  /** Undefined while they load. */
  posters?: BaseItemDto[];
  width: number;
  onPress?: (genre: BaseItemDto) => void;
}> = ({ genre, posters, width, onPress }) => {
  const api = useAtomValue(apiAtom);
  const cards: (BaseItemDto | null)[] =
    posters ?? Array.from({ length: SEARCH_GENRE_POSTER_COUNT }, () => null);

  const cardWidth = width * CARD_SHARE;
  const cardHeight = cardWidth * POSTER_ASPECT;
  const room = width - TILE_PADDING * 2 - cardWidth;
  const step = cards.length > 1 ? room / (cards.length - 1) : 0;

  return (
    <TouchableOpacity
      testID={genre ? undefined : "genre-tile-placeholder"}
      disabled={!genre}
      accessibilityRole='button'
      accessibilityLabel={genre?.Name ?? ""}
      onPress={() => genre && onPress?.(genre)}
      style={{ width }}
      className='rounded-xl bg-neutral-900 overflow-hidden'
    >
      <View style={{ height: cardHeight + TILE_PADDING }}>
        {/* Painted back to front, so the best poster ends up on top. */}
        {cards
          .map((item, index) => ({ item, index }))
          .reverse()
          .map(({ item, index }) => {
            const uri = item
              ? getPrimaryImageUrl({
                  api,
                  item,
                  width: Math.round(cardWidth * 3),
                })
              : null;
            return (
              <View
                key={item?.Id ?? index}
                style={{
                  position: "absolute",
                  top: TILE_PADDING,
                  left: TILE_PADDING + index * step,
                  width: cardWidth,
                  height: cardHeight,
                  borderRadius: 6,
                  overflow: "hidden",
                  backgroundColor: PLACEHOLDER_COLOR,
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
      {genre ? (
        <Text numberOfLines={1} className='font-bold text-base px-3 py-2'>
          {genre.Name}
        </Text>
      ) : (
        // The name's own line, its text hidden behind a bar: the same height.
        <View className='px-3 py-2 items-start'>
          <Text
            numberOfLines={1}
            className='font-bold text-base rounded'
            style={{
              color: PLACEHOLDER_COLOR,
              backgroundColor: PLACEHOLDER_COLOR,
            }}
          >
            Genre name
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};
