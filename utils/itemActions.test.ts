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
  test("offers played, favorite and download for an unplayed movie", () => {
    expect(itemMenuActions(item("Movie"), base).map((a) => a.key)).toEqual([
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

  test("puts Shuffle first for a series", () => {
    expect(itemMenuActions(item("Series"), base)[0]).toMatchObject({
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
