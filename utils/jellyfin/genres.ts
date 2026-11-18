import type { Api } from "@jellyfin/sdk";
import type {
  BaseItemDto,
  BaseItemKind,
} from "@jellyfin/sdk/lib/generated-client/models";
import { getGenreApi, getLibraryApi } from "@jellyfin/sdk/lib/utils/api";
import sortBy from "lodash/sortBy";

/** What a genre tile and page list: video, not music genres. */
export const GENRE_ITEM_TYPES: BaseItemKind[] = ["Movie", "Series"];

const itemCount = (genre: BaseItemDto) =>
  (genre.MovieCount ?? 0) + (genre.SeriesCount ?? 0);
const hasCounts = (genre: BaseItemDto) =>
  genre.MovieCount != null || genre.SeriesCount != null;

/**
 * The genres of the user's movies and shows, the biggest first. A server that
 * leaves the counts out keeps its own order; one it counted as empty is left
 * out, as its tile would have no posters.
 */
export const getTopGenres = async ({
  api,
  userId,
  limit,
  signal,
}: {
  api: Api;
  userId?: string;
  limit: number;
  signal?: AbortSignal;
}): Promise<BaseItemDto[]> => {
  const response = await getGenreApi(api).getGenres(
    {
      userId,
      includeItemTypes: GENRE_ITEM_TYPES,
      fields: ["ItemCounts"],
      enableTotalRecordCount: false,
    },
    { signal },
  );
  const genres = (response.data.Items ?? []).filter(
    (genre) => !hasCounts(genre) || itemCount(genre) > 0,
  );
  // sortBy is stable: genres without counts keep the server's order.
  return sortBy(genres, (genre) => -itemCount(genre)).slice(0, limit);
};

/** The posters a genre's tile stacks: its best rated movies and shows. */
export const getGenrePosters = async ({
  api,
  userId,
  genreId,
  limit,
  signal,
}: {
  api: Api;
  userId?: string;
  genreId: string;
  limit: number;
  signal?: AbortSignal;
}): Promise<BaseItemDto[]> => {
  const response = await getLibraryApi(api).getItems(
    {
      userId,
      genreIds: [genreId],
      includeItemTypes: GENRE_ITEM_TYPES,
      recursive: true,
      sortBy: ["CommunityRating", "SortName"],
      sortOrder: ["Descending", "Ascending"],
      imageTypes: ["Primary"],
      enableTotalRecordCount: false,
      limit,
    },
    { signal },
  );
  return response.data.Items ?? [];
};
