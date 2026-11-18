import type { BaseItemDto } from "@jellyfin/sdk/lib/generated-client/models";

/**
 * Which posters each genre tile stacks, out of each genre's best rated
 * titles. The best rated titles belong to several genres at once, so taken
 * per genre the tiles all showed the same few posters. Here the genres take
 * turns, each taking its best title not yet on a tile, so a title shows on
 * one tile only and every tile leads with one of its own best. A genre that
 * runs out shows fewer posters; one left with none falls back to its best,
 * repeated, as an empty tile reads as broken.
 */
export const pickGenrePosters = (
  candidates: { genreId: string; items: BaseItemDto[] }[],
  count: number,
): Map<string, BaseItemDto[]> => {
  const used = new Set<string>();
  const picked = new Map<string, BaseItemDto[]>(
    candidates.map(({ genreId }) => [genreId, []]),
  );
  const next = candidates.map(() => 0);

  for (let round = 0; round < count; round++) {
    candidates.forEach(({ genreId, items }, index) => {
      while (next[index] < items.length) {
        const item = items[next[index]++];
        if (!item.Id || used.has(item.Id)) continue;
        used.add(item.Id);
        picked.get(genreId)?.push(item);
        return;
      }
    });
  }

  for (const { genreId, items } of candidates) {
    if (picked.get(genreId)?.length === 0 && items[0]) {
      picked.set(genreId, [items[0]]);
    }
  }
  return picked;
};
