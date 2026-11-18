import type { BaseItemDto } from "@jellyfin/sdk/lib/generated-client/models";

const TICKS_PER_MINUTE = 600_000_000;

/**
 * What a poster's context menu preview shows, by what the item is. Only what
 * the row's item already carries: the preview is mounted for every poster
 * (the menu has no "opened" callback), so it may not ask for anything.
 */
export type CardPreview =
  /** A movie: the poster carries the title. */
  | { kind: "poster"; minutesLeft?: number }
  /** An episode alone doesn't say which show, or where in it. */
  | {
      kind: "episode";
      heading?: string;
      episodeNumber?: string;
      title: string;
      watched: boolean;
      minutesLeft?: number;
      runtimeMinutes?: number;
      premiereDate?: string;
      overview?: string;
    }
  /** A show or a season: how much is left to watch. */
  | {
      kind: "series";
      heading?: string;
      title: string;
      year?: number;
      unwatched: number;
    };

const minutes = (ticks: number) => Math.round(ticks / TICKS_PER_MINUTE);

/** Minutes left of an item started and not finished. */
const minutesLeft = (item: BaseItemDto) => {
  const position = item.UserData?.PlaybackPositionTicks ?? 0;
  const runtime = item.RunTimeTicks ?? 0;
  return position > 0 && runtime > position
    ? minutes(runtime - position)
    : undefined;
};

const orUndefined = <T>(value: T | null | undefined) => value ?? undefined;

export const buildCardPreview = (
  item: BaseItemDto,
): CardPreview | undefined => {
  switch (item.Type) {
    case "Movie":
      return { kind: "poster", minutesLeft: minutesLeft(item) };
    case "Episode": {
      const left = minutesLeft(item);
      return {
        kind: "episode",
        heading: orUndefined(item.SeriesName),
        episodeNumber:
          item.ParentIndexNumber != null && item.IndexNumber != null
            ? `S${item.ParentIndexNumber} E${item.IndexNumber}`
            : undefined,
        title: item.Name ?? "",
        watched: item.UserData?.Played === true,
        minutesLeft: left,
        // The time left says enough on its own.
        runtimeMinutes:
          left === undefined && item.RunTimeTicks
            ? minutes(item.RunTimeTicks)
            : undefined,
        premiereDate: orUndefined(item.PremiereDate),
        overview: orUndefined(item.Overview),
      };
    }
    case "Series":
    case "Season":
      return {
        kind: "series",
        heading:
          item.Type === "Season" ? orUndefined(item.SeriesName) : undefined,
        title: item.Name ?? "",
        year:
          item.Type === "Series" ? orUndefined(item.ProductionYear) : undefined,
        unwatched: item.UserData?.UnplayedItemCount ?? 0,
      };
    default:
      return undefined;
  }
};
