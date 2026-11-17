import type {
  BaseItemDto,
  BaseItemKind,
} from "@jellyfin/sdk/lib/generated-client/models";
import type { TFunction } from "i18next";
import { itemMenuActions } from "./itemActions";

const t = ((key: string) => key) as TFunction;

const item = (Type: BaseItemKind | undefined): BaseItemDto => ({
  Id: "item-1",
  Type,
});

const base = {
  t,
  isOffline: false,
  isFavorite: false,
  isDownloaded: false,
  canDownload: true,
};

describe("itemMenuActions", () => {
  test("offers play, played, favorite and download for an unplayed movie", () => {
    expect(itemMenuActions(item("Movie"), base).map((a) => a.key)).toEqual([
      "play",
      "played",
      "favorite",
      "download",
    ]);
  });

  test("offers unplayed instead of played once the item is played", () => {
    const played: BaseItemDto = {
      ...item("Movie"),
      UserData: { Played: true } as BaseItemDto["UserData"],
    };

    const keys = itemMenuActions(played, base).map((a) => a.key);

    expect(keys).toContain("unplayed");
    expect(keys).not.toContain("played");
  });

  test("offers Shuffle for a series", () => {
    expect(
      itemMenuActions(item("Series"), base).find((a) => a.key === "shuffle"),
    ).toMatchObject({
      key: "shuffle",
      label: "player.shuffle",
    });
  });

  test("names the favorite action after the current state", () => {
    const find = (isFavorite: boolean) =>
      itemMenuActions(item("Movie"), { ...base, isFavorite }).find(
        (a) => a.key === "favorite",
      );

    expect(find(false)).toMatchObject({
      label: "music.track_options.add_to_favorites",
      systemImage: "heart",
    });
    expect(find(true)).toMatchObject({
      label: "music.track_options.remove_from_favorites",
      systemImage: "heart.slash",
    });
  });

  test("offers deleting the download, last and destructive, once downloaded", () => {
    const actions = itemMenuActions(item("Episode"), {
      ...base,
      isDownloaded: true,
    });

    expect(actions.map((a) => a.key)).not.toContain("download");
    expect(actions.at(-1)).toMatchObject({ key: "delete", destructive: true });
  });

  test("offers deleting the download offline", () => {
    const actions = itemMenuActions(item("Episode"), {
      ...base,
      isOffline: true,
      isDownloaded: true,
    });

    expect(actions.at(-1)).toMatchObject({ key: "delete", destructive: true });
  });

  test("offers downloading a whole series or season", () => {
    for (const type of ["Series", "Season"] as const) {
      expect(itemMenuActions(item(type), base).map((a) => a.key)).toContain(
        "download",
      );
    }
  });

  test("offers no download offline, or to a user the server does not let download", () => {
    expect(
      itemMenuActions(item("Movie"), { ...base, isOffline: true }).map(
        (a) => a.key,
      ),
    ).not.toContain("download");
    expect(
      itemMenuActions(item("Movie"), { ...base, canDownload: false }).map(
        (a) => a.key,
      ),
    ).not.toContain("download");
  });

  test("offers no download for a collection or folder", () => {
    for (const type of ["BoxSet", "Folder"] as const) {
      expect(itemMenuActions(item(type), base).map((a) => a.key)).not.toContain(
        "download",
      );
    }
  });

  test("gives every action an SF Symbol", () => {
    for (const isDownloaded of [false, true]) {
      for (const action of itemMenuActions(item("Series"), {
        ...base,
        isDownloaded,
      })) {
        expect(action.systemImage).toBeTruthy();
      }
    }
  });

  test.each<BaseItemKind | undefined>([
    "Person",
    "CollectionFolder",
    "Playlist",
    undefined,
  ])("offers nothing for a %s", (type) => {
    expect(itemMenuActions(item(type), base)).toEqual([]);
  });
});

describe("itemMenuActions groups", () => {
  const groups = (it: BaseItemDto, extra = {}) =>
    Object.fromEntries(
      itemMenuActions(it, { ...base, ...extra }).map((a) => [a.key, a.group]),
    );

  test("puts played state, favorite and download in the quick row", () => {
    expect(groups(item("Movie"))).toEqual({
      play: "primary",
      played: "quick",
      favorite: "quick",
      download: "quick",
    });
  });

  test("keeps Shuffle in the list and deleting the download apart, last", () => {
    expect(groups(item("Series"), { isDownloaded: true })).toMatchObject({
      shuffle: "primary",
      delete: "destructive",
    });
  });

  test("gives quick-row actions a short label", () => {
    for (const action of itemMenuActions(item("Movie"), base)) {
      if (action.group === "quick") expect(action.shortLabel).toBeTruthy();
    }
    const favorite = itemMenuActions(item("Movie"), {
      ...base,
      isFavorite: true,
    }).find((a) => a.key === "favorite");
    expect(favorite?.shortLabel).toBe("item_card.menu.unfavorite");
  });
});

describe("itemMenuActions playback and navigation", () => {
  const keys = (it: BaseItemDto, extra = {}) =>
    itemMenuActions(it, { ...base, ...extra }).map((a) => a.key);
  const resumable = (Type: BaseItemKind): BaseItemDto => ({
    ...item(Type),
    UserData: {
      PlaybackPositionTicks: 25_300_000_000,
    } as BaseItemDto["UserData"],
  });
  const episode: BaseItemDto = {
    ...item("Episode"),
    SeriesId: "series-1",
    SeasonId: "season-2",
    ParentIndexNumber: 2,
  };

  test("offers Resume and Play from start for a movie with a resume point", () => {
    const actions = itemMenuActions(resumable("Movie"), base);

    expect(actions[0]).toMatchObject({
      key: "play",
      label: "item_card.menu.resume_from",
      systemImage: "play.fill",
    });
    expect(actions[1]).toMatchObject({
      key: "playFromStart",
      label: "item_card.play_from_start",
    });
  });

  test("offers only Play when there is nothing to resume", () => {
    const actions = itemMenuActions(item("Movie"), base);

    expect(actions[0]).toMatchObject({ key: "play", label: "common.play" });
    expect(actions.map((a) => a.key)).not.toContain("playFromStart");
  });

  test("offers no Play for an episode the library has no file for", () => {
    expect(keys({ ...episode, LocationType: "Virtual" })).not.toContain("play");
  });

  test("offers going to the show and the season from an episode", () => {
    const actions = itemMenuActions(episode, base);

    expect(actions.map((a) => a.key)).toEqual([
      "play",
      "played",
      "favorite",
      "download",
      "goToSeries",
      "goToSeason",
    ]);
    expect(
      actions.filter((a) => a.key.startsWith("goTo")).map((a) => a.group),
    ).toEqual(["nav", "nav"]);
  });

  test("offers going to the show from a season", () => {
    expect(keys({ ...item("Season"), SeriesId: "series-1" })).toContain(
      "goToSeries",
    );
  });

  test("offers Play next episode and Shuffle for a series, online", () => {
    const actions = keys(item("Series"));

    expect(actions.slice(0, 2)).toEqual(["playNext", "shuffle"]);
    expect(actions).not.toContain("play");
    // The next episode is the server's to say.
    expect(keys(item("Series"), { isOffline: true })).not.toContain("playNext");
  });
});
