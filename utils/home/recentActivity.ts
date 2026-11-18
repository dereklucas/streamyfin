import type { BaseItemDto } from "@jellyfin/sdk/lib/generated-client/models";

const time = (date: string | null | undefined) => {
  const value = date ? new Date(date).getTime() : Number.NaN;
  return Number.isFinite(value) ? value : undefined;
};

/**
 * The merged Continue Watching and Next Up row, most recent activity first.
 * An item in progress counts from when it was last played. A Next Up episode
 * was never played, so it counts from when its show was last watched
 * (`seriesLastPlayed`, by series id): ranked by the day it was added to the
 * library, as before, the row looked random (upstream #1270). Items without
 * a date keep the server's order, after the dated ones; an item in both
 * lists stays once, where its most recent entry puts it.
 */
export const orderByRecentActivity = (
  resumeItems: BaseItemDto[],
  nextUpItems: BaseItemDto[],
  seriesLastPlayed: Record<string, string | null | undefined>,
): BaseItemDto[] => {
  const dated = [
    ...resumeItems.map((item) => ({
      item,
      at: time(item.UserData?.LastPlayedDate),
    })),
    ...nextUpItems.map((item) => ({
      item,
      at: time(item.SeriesId ? seriesLastPlayed[item.SeriesId] : undefined),
    })),
  ];
  // Array.prototype.sort is stable: equal and undated entries keep their order.
  const sorted = dated.sort((a, b) => {
    if (a.at === undefined) return b.at === undefined ? 0 : 1;
    if (b.at === undefined) return -1;
    return b.at - a.at;
  });
  const seen = new Set<string>();
  return sorted.flatMap(({ item }) => {
    if (!item.Id || seen.has(item.Id)) return [];
    seen.add(item.Id);
    return [item];
  });
};
