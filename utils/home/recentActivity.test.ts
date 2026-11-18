import type { BaseItemDto } from "@jellyfin/sdk/lib/generated-client/models";
import { orderByRecentActivity } from "./recentActivity";

const played = (
  Id: string,
  LastPlayedDate: string,
  extra: Partial<BaseItemDto> = {},
) => ({ Id, UserData: { LastPlayedDate }, ...extra }) as BaseItemDto;
const nextUp = (
  Id: string,
  SeriesId: string,
  DateCreated: string,
): BaseItemDto => ({
  Id,
  SeriesId,
  DateCreated,
  Type: "Episode",
});
const ids = (items: BaseItemDto[]) => items.map((item) => item.Id);

describe("orderByRecentActivity", () => {
  // Upstream #1270: a Next Up episode has never been played, so it ranked by
  // the day it was added to the library, and the merged row looked random.
  test("ranks a Next Up episode by when its show was last watched", () => {
    const resume = [
      played("movie", "2026-11-10T00:00:00Z"),
      played("ep-a", "2026-11-01T00:00:00Z"),
    ];
    const next = [
      // Added yesterday, but its show was last watched a month ago.
      nextUp("ep-old-show", "old-show", "2026-11-16T00:00:00Z"),
      nextUp("ep-hot-show", "hot-show", "2025-01-01T00:00:00Z"),
    ];
    const seriesLastPlayed = {
      "old-show": "2026-10-15T00:00:00Z",
      "hot-show": "2026-11-15T00:00:00Z",
    };

    expect(ids(orderByRecentActivity(resume, next, seriesLastPlayed))).toEqual([
      "ep-hot-show",
      "movie",
      "ep-a",
      "ep-old-show",
    ]);
  });

  test("keeps an item once, where its most recent entry puts it", () => {
    const resume = [played("ep", "2026-11-10T00:00:00Z", { SeriesId: "s" })];
    const next = [nextUp("ep", "s", "2020-01-01T00:00:00Z")];

    expect(ids(orderByRecentActivity(resume, next, {}))).toEqual(["ep"]);
  });

  // Without a date (a show the lookup did not answer for) the server's own
  // order is the best there is: such items keep it, after the dated ones.
  test("keeps the server's order for what has no date", () => {
    const next = [nextUp("first", "s1", ""), nextUp("second", "s2", "")];

    expect(ids(orderByRecentActivity([], next, {}))).toEqual([
      "first",
      "second",
    ]);
  });
});
