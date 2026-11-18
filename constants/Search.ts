import type { PersonKind } from "@jellyfin/sdk/lib/generated-client/models";

/** How many results each section of the library search shows. */
export const SEARCH_RESULT_LIMIT = 10;

/**
 * How many people a search asks for before keeping the best matches. The
 * Persons API answers in name order at best, not by relevance, so the first
 * few of a short search are rarely the ones meant. Jellyfin Web asks for as
 * many.
 */
export const SEARCH_PEOPLE_FETCH_LIMIT = 100;

/**
 * How many people a search asks for once more when its first answer came back
 * full. A full answer was cut off somewhere along the alphabet, and the best
 * match can lie past the cut: on a large library "Tom Hanks" sorts after a
 * hundred names that merely contain "tom". Ten times the first ask covers
 * that without making every search carry it.
 */
export const SEARCH_PEOPLE_WIDE_FETCH_LIMIT = 1000;

/**
 * Person types the People section leaves out, as Jellyfin Web does. A music
 * library registers every artist as a person, so without this a search for an
 * actor lists musicians too; those already have the Artists section.
 */
export const SEARCH_EXCLUDED_PERSON_TYPES: PersonKind[] = [
  "Artist",
  "AlbumArtist",
];

/**
 * How many of a studio's titles one page asks for. The TV mounts every poster
 * of its grid at once and shows more of them per screen, so it asks for more.
 */
export const STUDIO_PAGE_SIZE = 18;
export const STUDIO_TV_PAGE_SIZE = 36;

/**
 * Where the search history is kept: the items opened from a search and the
 * searches that led to them, one entry per server and user (see
 * utils/search/searchHistory.ts).
 */
export const SEARCH_HISTORY_STORAGE_KEY = "searchHistory";

/** How many items opened from a search the landing page shows again. */
export const SEARCH_RECENT_ITEMS_LIMIT = 12;

/** How many past searches the field offers while it is empty. */
export const SEARCH_RECENT_QUERIES_LIMIT = 8;

/** How many genres the landing page shows to browse. */
export const SEARCH_GENRE_LIMIT = 12;

/** How many of a genre's best rated posters its tile stacks. */
export const SEARCH_GENRE_POSTER_COUNT = 3;

/** A genre page's size, as a studio page's. */
export const GENRE_PAGE_SIZE = STUDIO_PAGE_SIZE;

/**
 * How many of each genre's best rated titles the landing page asks for, to
 * pick its tile's posters from without repeating a title on another tile.
 */
export const SEARCH_GENRE_POSTER_CANDIDATES = 15;
