import type { BaseItemDto } from "@jellyfin/sdk/lib/generated-client/models";
import { getLibraryApi } from "@jellyfin/sdk/lib/utils/api";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { useCallback, useMemo } from "react";
import { Platform } from "react-native";
import {
  GENRE_PAGE_SIZE,
  STUDIO_PAGE_SIZE,
  STUDIO_TV_PAGE_SIZE,
} from "@/constants/Search";
import { apiAtom, userAtom } from "@/providers/JellyfinProvider";
import {
  getGenreItems,
  getStudioItems,
  nextStartIndex,
} from "@/utils/jellyfin/search";

const STUDIO_STALE_TIME_MS = 60 * 1000;

/** What a poster grid page lists: a studio's titles, or a genre's. */
export type ItemGridKind = "studio" | "genre";

/**
 * A studio and the movies and series it produced, a page at a time. Shared by
 * the phone's and the TV's studio page, which only differ in how they lay the
 * posters out.
 */
export const useStudioItems = (studioId: string) =>
  useItemGrid("studio", studioId);

/** A genre and its movies and series, best rated first. */
export const useGenreItems = (genreId: string) => useItemGrid("genre", genreId);

export const useItemGrid = (kind: ItemGridKind, studioId: string) => {
  const api = useAtomValue(apiAtom);
  const user = useAtomValue(userAtom);
  const enabled = !!api && !!user?.Id && !!studioId;

  const { data: studio } = useQuery({
    // Both are asked as the user, so both are cached as theirs.
    queryKey: [kind, studioId, user?.Id],
    queryFn: async ({ signal }) => {
      if (!api) return null;
      const response = await getLibraryApi(api).getItem(
        { itemId: studioId, userId: user?.Id },
        { signal },
      );
      return response.data;
    },
    enabled,
    staleTime: STUDIO_STALE_TIME_MS,
  });

  const { data, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useInfiniteQuery({
      queryKey: [`${kind}-items`, studioId, user?.Id],
      queryFn: ({ pageParam, signal }) => {
        if (!api) return null;
        const request = {
          api,
          userId: user?.Id,
          startIndex: pageParam,
          signal,
        };
        return kind === "genre"
          ? getGenreItems({
              ...request,
              genreId: studioId,
              limit: Platform.isTV ? STUDIO_TV_PAGE_SIZE : GENRE_PAGE_SIZE,
            })
          : getStudioItems({
              ...request,
              studioId,
              limit: Platform.isTV ? STUDIO_TV_PAGE_SIZE : STUDIO_PAGE_SIZE,
            });
      },
      initialPageParam: 0,
      getNextPageParam: (_lastPage, pages) => nextStartIndex(pages),
      enabled,
    });

  const items = useMemo(
    () =>
      (data?.pages.flatMap((page) => page?.Items ?? []) ?? []) as BaseItemDto[],
    [data],
  );

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return { studio, items, isLoading, loadMore };
};
