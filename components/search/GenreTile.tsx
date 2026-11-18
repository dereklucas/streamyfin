import type { BaseItemDto } from "@jellyfin/sdk/lib/generated-client/models";
import { useQuery } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { TouchableOpacity, View } from "react-native";
import { Image } from "@/components/common/ServerImage";
import { Text } from "@/components/common/Text";
import { SEARCH_GENRE_POSTER_COUNT } from "@/constants/Search";
import { apiAtom, userAtom } from "@/providers/JellyfinProvider";
import { getGenrePosters } from "@/utils/jellyfin/genres";
import { getPrimaryImageUrl } from "@/utils/jellyfin/image/getPrimaryImageUrl";

const POSTER_ASPECT = 1.5;
/** The front poster's share of the tile's width; the others peek out behind. */
const FRONT_POSTER_SHARE = 0.46;
const GENRE_POSTERS_STALE_TIME_MS = 60 * 60 * 1000;

/** Where each poster of the stack sits, front first. */
const STACK = [
  { offset: 0, rotate: "0deg", scale: 1 },
  { offset: -0.24, rotate: "-7deg", scale: 0.88 },
  { offset: 0.24, rotate: "7deg", scale: 0.88 },
];

/**
 * A genre to browse: its name under a fanned stack of its best rated movies
 * and shows, so a genre looks like what is in it on this server.
 */
export const GenreTile: React.FC<{
  genre: BaseItemDto;
  width: number;
  onPress: (genre: BaseItemDto) => void;
}> = ({ genre, width, onPress }) => {
  const api = useAtomValue(apiAtom);
  const user = useAtomValue(userAtom);
  const { data: posters = [] } = useQuery({
    queryKey: ["search", "genre-posters", genre.Id, user?.Id],
    queryFn: ({ signal }) =>
      getGenrePosters({
        api: api!,
        userId: user?.Id,
        genreId: genre.Id!,
        limit: SEARCH_GENRE_POSTER_COUNT,
        signal,
      }),
    enabled: !!api && !!user?.Id && !!genre.Id,
    staleTime: GENRE_POSTERS_STALE_TIME_MS,
  });

  const posterWidth = width * FRONT_POSTER_SHARE;
  const posterHeight = posterWidth * POSTER_ASPECT;
  // Painted back to front, so the first poster ends up on top.
  const stack = posters
    .slice(0, STACK.length)
    .map((item, index) => ({ item, place: STACK[index] }))
    .reverse();

  return (
    <TouchableOpacity
      accessibilityRole='button'
      accessibilityLabel={genre.Name ?? ""}
      onPress={() => onPress(genre)}
      style={{ width }}
      className='rounded-xl bg-neutral-900 overflow-hidden'
    >
      <View
        style={{ height: posterHeight + 20 }}
        className='items-center justify-end'
      >
        {stack.map(({ item, place }) => {
          const uri = getPrimaryImageUrl({
            api,
            item,
            width: Math.round(posterWidth * 3),
          });
          return (
            <View
              key={item.Id}
              style={{
                position: "absolute",
                bottom: 0,
                left: (width - posterWidth) / 2 + place.offset * width,
                width: posterWidth,
                height: posterHeight,
                transform: [{ rotate: place.rotate }, { scale: place.scale }],
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
