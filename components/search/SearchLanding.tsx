import type { BaseItemDto } from "@jellyfin/sdk/lib/generated-client/models";
import { getLibraryApi } from "@jellyfin/sdk/lib/utils/api";
import { useQuery } from "@tanstack/react-query";
import { useSegments } from "expo-router";
import { useAtomValue } from "jotai";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CardRow } from "@/components/cards/CardRow";
import { SectionHeader } from "@/components/common/SectionHeader";
import {
  SEARCH_GENRE_LIMIT,
  SEARCH_GENRE_POSTER_CANDIDATES,
  SEARCH_GENRE_POSTER_COUNT,
} from "@/constants/Search";
import useRouter from "@/hooks/useAppRouter";
import { apiAtom, userAtom } from "@/providers/JellyfinProvider";
import { getItemNavigation } from "@/utils/itemNavigation";
import { getGenrePosters, getTopGenres } from "@/utils/jellyfin/genres";
import { pickGenrePosters } from "@/utils/search/genrePosters";
import { GenreTile } from "./GenreTile";

const GENRES_STALE_TIME_MS = 60 * 60 * 1000;
const SIDE_PADDING = 16;
const TILE_GAP = 12;

/** Two tiles a row on a phone, more as the window widens (iPad). */
const genreColumns = (width: number) =>
  width >= 1100 ? 5 : width >= 800 ? 4 : width >= 560 ? 3 : 2;

/**
 * What the search page shows before anything is typed: the items opened from
 * earlier searches, to get back to, and the server's genres, to browse.
 */
export const SearchLanding: React.FC<{
  recentItemIds: string[];
  onClearRecent: () => void;
  onOpenItem: (item: BaseItemDto) => void;
}> = ({ recentItemIds, onClearRecent, onOpenItem }) => {
  const { t } = useTranslation();
  const api = useAtomValue(apiAtom);
  const user = useAtomValue(userAtom);
  const router = useRouter();
  const segments = useSegments();
  const from = (segments as string[])[2] || "(search)";
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const enabled = !!api && !!user?.Id;

  // Asked again each time, so they show as they are now (played state), and
  // one deleted since is left out.
  const { data: recentItems = [] } = useQuery({
    queryKey: ["search", "recent-items", user?.Id, recentItemIds.join(",")],
    queryFn: async ({ signal }) => {
      const response = await getLibraryApi(api!).getItems(
        {
          userId: user?.Id,
          ids: recentItemIds,
          fields: ["PrimaryImageAspectRatio"],
          enableTotalRecordCount: false,
        },
        { signal },
      );
      return response.data.Items ?? [];
    },
    enabled: enabled && recentItemIds.length > 0,
    placeholderData: (previous) => previous,
  });
  const orderedRecent = useMemo(() => {
    const byId = new Map(recentItems.map((item) => [item.Id, item]));
    return recentItemIds
      .map((id) => byId.get(id))
      .filter((item): item is BaseItemDto => !!item);
  }, [recentItems, recentItemIds]);

  const { data: genres = [] } = useQuery({
    queryKey: ["search", "genres", user?.Id],
    queryFn: ({ signal }) =>
      getTopGenres({
        api: api!,
        userId: user?.Id,
        limit: SEARCH_GENRE_LIMIT,
        signal,
      }),
    enabled,
    staleTime: GENRES_STALE_TIME_MS,
  });

  // Asked for all tiles at once: which posters a tile gets depends on what
  // the others show (utils/search/genrePosters.ts).
  const genreIds = genres.map((genre) => genre.Id!).filter(Boolean);
  const { data: genrePosters } = useQuery({
    queryKey: ["search", "genre-posters", user?.Id, genreIds.join(",")],
    queryFn: async ({ signal }) => {
      const candidates = await Promise.all(
        genreIds.map(async (genreId) => ({
          genreId,
          // A genre whose posters fail to load shows a bare tile, not none.
          items: await getGenrePosters({
            api: api!,
            userId: user?.Id,
            genreId,
            limit: SEARCH_GENRE_POSTER_CANDIDATES,
            signal,
          }).catch(() => []),
        })),
      );
      return pickGenrePosters(candidates, SEARCH_GENRE_POSTER_COUNT);
    },
    enabled: enabled && genreIds.length > 0,
    staleTime: GENRES_STALE_TIME_MS,
  });

  const openGenre = useCallback(
    (genre: BaseItemDto) =>
      router.push(
        getItemNavigation({ ...genre, Type: "Genre" }, from) as never,
      ),
    [from, router],
  );

  const columns = genreColumns(windowWidth);
  const gridWidth = windowWidth - insets.left - insets.right - SIDE_PADDING * 2;
  const tileWidth = Math.floor(
    (gridWidth - TILE_GAP * (columns - 1)) / columns,
  );

  return (
    <View className='mt-2'>
      {recentItemIds.length > 0 && (
        <CardRow
          enableActionSheet
          title={t("search.recently_searched")}
          seeAllLabel={t("search.clear")}
          onPressSeeAll={onClearRecent}
          items={orderedRecent}
          kind='portrait'
          useEpisodePoster
          onPressItem={onOpenItem}
          hideIfEmpty
          className='mb-4'
        />
      )}
      {genres.length > 0 && (
        <View>
          <SectionHeader title={t("search.browse_genres")} />
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: TILE_GAP,
              paddingHorizontal: SIDE_PADDING,
            }}
          >
            {genres.map((genre) => (
              <GenreTile
                key={genre.Id}
                genre={genre}
                posters={genrePosters?.get(genre.Id!) ?? []}
                width={tileWidth}
                onPress={openGenre}
              />
            ))}
          </View>
        </View>
      )}
    </View>
  );
};
