import {
  SEARCH_HISTORY_STORAGE_KEY,
  SEARCH_RECENT_ITEMS_LIMIT,
  SEARCH_RECENT_QUERIES_LIMIT,
} from "@/constants/Search";

/**
 * What the search remembers, on this device only: the items opened from its
 * results, most recent first, and the searches that led to them. Ids rather
 * than items, so the landing page asks the server for them again and shows
 * them as they are now, played state included, and drops a deleted one.
 */
export type SearchHistory = { itemIds: string[]; queries: string[] };

export const EMPTY_SEARCH_HISTORY: SearchHistory = { itemIds: [], queries: [] };

/** Each user on each server has a history of their own. */
export const searchHistoryKey = (
  serverId: string | null | undefined,
  userId: string | null | undefined,
): string | null =>
  userId ? `${SEARCH_HISTORY_STORAGE_KEY}.${serverId ?? ""}.${userId}` : null;

export const rememberItem = (
  history: SearchHistory,
  itemId: string,
): SearchHistory => ({
  ...history,
  itemIds: [itemId, ...history.itemIds.filter((id) => id !== itemId)].slice(
    0,
    SEARCH_RECENT_ITEMS_LIMIT,
  ),
});

/** Saved as typed, trimmed; the same search in another case replaces it. */
export const rememberQuery = (
  history: SearchHistory,
  query: string,
): SearchHistory => {
  const trimmed = query.trim();
  if (!trimmed) return history;
  const same = trimmed.toLocaleLowerCase();
  return {
    ...history,
    queries: [
      trimmed,
      ...history.queries.filter((q) => q.toLocaleLowerCase() !== same),
    ].slice(0, SEARCH_RECENT_QUERIES_LIMIT),
  };
};

const strings = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string")
    : [];

export const parseSearchHistory = (
  raw: string | null | undefined,
): SearchHistory => {
  if (!raw) return EMPTY_SEARCH_HISTORY;
  try {
    const parsed = JSON.parse(raw) as Partial<
      Record<keyof SearchHistory, unknown>
    >;
    return {
      itemIds: strings(parsed?.itemIds),
      queries: strings(parsed?.queries),
    };
  } catch {
    return EMPTY_SEARCH_HISTORY;
  }
};
