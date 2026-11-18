import type { BaseItemDto } from "@jellyfin/sdk/lib/generated-client/models";
import { buildCardPreview } from "./cardPreview";

const MINUTE = 600_000_000;

describe("buildCardPreview", () => {
  // A good poster carries the title: the movie preview is the poster, with
  // what is left when it is partly watched.
  test("a movie is its poster, with the time left", () => {
    const movie: BaseItemDto = {
      Type: "Movie",
      Name: "1917",
      RunTimeTicks: 119 * MINUTE,
      UserData: {
        PlaybackPositionTicks: 72 * MINUTE,
      } as BaseItemDto["UserData"],
    };

    expect(buildCardPreview(movie)).toEqual({
      kind: "poster",
      minutesLeft: 47,
    });
  });

  test("an episode says which show, where, and what it is about", () => {
    const episode: BaseItemDto = {
      Type: "Episode",
      Name: "My Best Friend's Birthday",
      SeriesName: "Scrubs",
      ParentIndexNumber: 2,
      IndexNumber: 5,
      RunTimeTicks: 22 * MINUTE,
      PremiereDate: "2002-10-24T00:00:00.0000000Z",
      Overview: "J.D. forgets Turk's birthday.",
      UserData: { Played: true } as BaseItemDto["UserData"],
    };

    expect(buildCardPreview(episode)).toEqual({
      kind: "episode",
      heading: "Scrubs",
      episodeNumber: "S2 E5",
      title: "My Best Friend's Birthday",
      watched: true,
      runtimeMinutes: 22,
      premiereDate: "2002-10-24T00:00:00.0000000Z",
      overview: "J.D. forgets Turk's birthday.",
    });
  });

  test("an episode partly watched gives the time left instead", () => {
    const preview = buildCardPreview({
      Type: "Episode",
      Name: "Pilot",
      RunTimeTicks: 30 * MINUTE,
      UserData: {
        PlaybackPositionTicks: 7 * MINUTE,
      } as BaseItemDto["UserData"],
    });

    expect(preview).toMatchObject({ minutesLeft: 23, watched: false });
  });

  test("a show or a season counts what is left to watch", () => {
    expect(
      buildCardPreview({
        Type: "Series",
        Name: "Scrubs",
        ProductionYear: 2001,
        UserData: { UnplayedItemCount: 12 } as BaseItemDto["UserData"],
      }),
    ).toEqual({ kind: "series", title: "Scrubs", year: 2001, unwatched: 12 });
    expect(
      buildCardPreview({
        Type: "Season",
        Name: "Season 2",
        SeriesName: "Scrubs",
        UserData: {
          UnplayedItemCount: 0,
          Played: true,
        } as BaseItemDto["UserData"],
      }),
    ).toEqual({
      kind: "series",
      heading: "Scrubs",
      title: "Season 2",
      unwatched: 0,
    });
  });

  test("anything else keeps the card's own lines", () => {
    expect(
      buildCardPreview({ Type: "MusicAlbum", Name: "Kid A" }),
    ).toBeUndefined();
  });
});
