import { useAtomValue } from "jotai";
import { useCallback, useEffect, useRef, useState } from "react";
import { userAtom } from "@/providers/JellyfinProvider";
import { storage } from "@/utils/mmkv";
import {
  EMPTY_SEARCH_HISTORY,
  parseSearchHistory,
  rememberItem,
  rememberQuery,
  type SearchHistory,
  searchHistoryKey,
} from "@/utils/search/searchHistory";

const read = (key: string | null) =>
  key ? parseSearchHistory(storage.getString(key)) : EMPTY_SEARCH_HISTORY;

/**
 * The signed-in user's search history (utils/search/searchHistory.ts), kept
 * in MMKV on this device.
 */
export const useSearchHistory = () => {
  const user = useAtomValue(userAtom);
  const key = searchHistoryKey(user?.ServerId, user?.Id);
  const [history, setHistory] = useState<SearchHistory>(() => read(key));
  // Writes read the latest history, not the one of the render they came from.
  const latest = useRef(history);

  useEffect(() => {
    latest.current = read(key);
    setHistory(latest.current);
  }, [key]);

  const update = useCallback(
    (change: (history: SearchHistory) => SearchHistory) => {
      if (!key) return;
      const next = change(latest.current);
      latest.current = next;
      storage.set(key, JSON.stringify(next));
      setHistory(next);
    },
    [key],
  );

  /** An item opened from the results; the search, when there was one. */
  const rememberOpened = useCallback(
    (itemId: string, query?: string) =>
      update((h) => rememberQuery(rememberItem(h, itemId), query ?? "")),
    [update],
  );

  const clear = useCallback(() => update(() => EMPTY_SEARCH_HISTORY), [update]);
  const clearItems = useCallback(
    () => update((h) => ({ ...h, itemIds: [] })),
    [update],
  );
  const clearQueries = useCallback(
    () => update((h) => ({ ...h, queries: [] })),
    [update],
  );

  return { history, rememberOpened, clear, clearItems, clearQueries };
};
