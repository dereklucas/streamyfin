import type {
  BaseItemDto,
  BaseItemKind,
} from "@jellyfin/sdk/lib/generated-client/models";
import { renderHook } from "@testing-library/react-native";
import { showActionSheetWithOptions } from "@/test-utils/actionSheet";
import { useItemActionSheet, useItemActions } from "./useItemActionSheet";

type SheetCallback = (selectedIndex?: number) => void | Promise<void>;

const mockShowActionSheet = jest.mocked(
  showActionSheetWithOptions as jest.Mock<
    void,
    [{ options: string[] }, SheetCallback]
  >,
);
const mockMarkAsPlayed = jest.fn(async (_played: boolean) => {});

jest.mock("@/hooks/useMarkAsPlayed", () => ({
  useMarkAsPlayed: () => mockMarkAsPlayed,
}));
jest.mock("@/hooks/useFavorite", () => ({
  useFavorite: () => ({ isFavorite: false, toggleFavorite: () => {} }),
}));
const mockDeleteFile = jest.fn();
const mockDeleteItems = jest.fn(async (_ids: string[]) => {});
const episodeOf = (id: string, seriesId: string, season: number) => ({
  item: {
    Id: id,
    Type: "Episode",
    SeriesId: seriesId,
    ParentIndexNumber: season,
  },
});
const mockDownloads = [
  episodeOf("s1e1", "series-1", 1),
  episodeOf("s1e2", "series-1", 1),
  episodeOf("s2e1", "series-1", 2),
  episodeOf("other", "series-2", 1),
];
jest.mock("@/providers/DownloadProvider", () => ({
  useDownload: () => ({
    deleteFile: (id: string) => mockDeleteFile(id),
    deleteItems: (ids: string[]) => mockDeleteItems(ids),
    downloadedItems: [],
    getDownloadedItems: () => mockDownloads,
  }),
}));
jest.mock("@/providers/JellyfinProvider", () => {
  const { atom } = jest.requireActual("jotai");
  return { apiAtom: atom(null), userAtom: atom(null) };
});
// Starting a download is useStartDownloads' and the provider's.
jest.mock("@/hooks/useMenuDownload", () => ({
  useMenuDownload: () => async () => {},
}));
const mockShuffleSeries = jest.fn(
  async (_item: BaseItemDto, _options?: { isOffline?: boolean }) => {},
);
jest.mock("@/hooks/useShuffleSeries", () => ({
  useShuffleSeries: () => mockShuffleSeries,
}));
jest.mock(
  "@/providers/OfflineModeProvider",
  () => jest.requireActual("@/test-utils/stubModules").onlineModule,
);

// Hands the "sheet closed" promise back inside an object: returned bare,
// awaiting the render would also wait for a sheet nobody has answered yet.
const mockPlayItem = jest.fn(async () => {});
jest.mock("@/hooks/usePlayItem", () => ({ usePlayItem: () => mockPlayItem }));
jest.mock("@/hooks/usePlayNextEpisode", () => ({
  usePlayNextEpisode: () => async () => {},
}));
// One router object, as the real hook returns, or the handlers' deps change.
const mockPush = jest.fn();
jest.mock("@/hooks/useAppRouter", () => {
  const router = { push: (...args: unknown[]) => mockPush(...args) };
  return { __esModule: true, default: () => router };
});
jest.mock("expo-router", () => ({
  useSegments: () => ["(auth)", "(tabs)", "(home)"],
}));

/** Presents the sheet for `item` and chooses the option labelled `label`. */
const choose = async (item: BaseItemDto, label: string) => {
  const { result } = await renderHook(() => useItemActionSheet(item));
  const closed = result.current();
  const [{ options }, onSelect] = mockShowActionSheet.mock.calls.at(-1)!;
  await onSelect(options.indexOf(label));
  await closed;
};

const present = async (type: BaseItemKind | undefined) => {
  const item: BaseItemDto = { Id: "item-1", Type: type };
  const { result } = await renderHook(() => useItemActionSheet(item));
  return { closed: result.current() };
};

describe("useItemActionSheet", () => {
  beforeEach(() => {
    mockShowActionSheet.mockReset();
    mockMarkAsPlayed.mockClear();
    mockShuffleSeries.mockClear();
  });

  // Jellyfin 12 (web #8063) lets a folder be marked played, the way a series
  // already could; before this only Movie, Episode and Series opened the sheet.
  test.each<BaseItemKind>([
    "Movie",
    "Episode",
    "Video",
    "Series",
    "Season",
    "BoxSet",
    "Folder",
  ])("offers marking an unplayed %s played", async (type) => {
    await present(type);

    expect(mockShowActionSheet).toHaveBeenCalledTimes(1);
    const { options } = mockShowActionSheet.mock.calls[0][0];
    expect(options).toContain("common.mark_as_played");
    // Only the state it is not in: an unplayed item cannot be marked unplayed.
    expect(options).not.toContain("common.mark_as_not_played");
  });

  test.each<BaseItemKind | undefined>([
    "Person",
    "CollectionFolder",
    "Playlist",
    undefined,
  ])("presents nothing for a %s and resolves at once", async (type) => {
    const { closed } = await present(type);

    await expect(closed).resolves.toBeUndefined();
    expect(mockShowActionSheet).not.toHaveBeenCalled();
  });

  test("marks a folder played through the shared played mutation", async () => {
    const { closed } = await present("Folder");
    await mockShowActionSheet.mock.calls[0][1](0);
    await closed;

    expect(mockMarkAsPlayed).toHaveBeenCalledWith(true);
  });

  // A season the user has watched offers Mark as unplayed in its place.
  test("marks a played season unplayed through the shared played mutation", async () => {
    const item: BaseItemDto = {
      Id: "item-1",
      Type: "Season",
      UserData: { Played: true } as BaseItemDto["UserData"],
    };
    const { result } = await renderHook(() => useItemActionSheet(item));
    const closed = result.current();
    await mockShowActionSheet.mock.calls[0][1](0);
    await closed;

    expect(mockMarkAsPlayed).toHaveBeenCalledWith(false);
  });

  test("offers the next episode, then Shuffle, first for a series", async () => {
    await present("Series");

    expect(mockShowActionSheet.mock.calls[0][0].options.slice(0, 2)).toEqual([
      "item_card.menu.play_next_episode",
      "player.shuffle",
    ]);
  });

  test("shuffles the series when Shuffle is chosen", async () => {
    await choose({ Id: "item-1", Type: "Series" }, "player.shuffle");

    expect(mockShuffleSeries).toHaveBeenCalledWith(
      expect.objectContaining({ Id: "item-1", Type: "Series" }),
      { isOffline: false },
    );
    expect(mockMarkAsPlayed).not.toHaveBeenCalled();
  });

  test("still marks a series played below Shuffle", async () => {
    await choose({ Id: "item-1", Type: "Series" }, "common.mark_as_played");

    expect(mockMarkAsPlayed).toHaveBeenCalledWith(true);
    expect(mockShuffleSeries).not.toHaveBeenCalled();
  });

  test("offers no Shuffle for a movie", async () => {
    await present("Movie");

    expect(mockShowActionSheet.mock.calls[0][0].options).not.toContain(
      "player.shuffle",
    );
  });

  test("plays a movie from where it was left", async () => {
    mockPlayItem.mockClear();
    const movie: BaseItemDto = { Id: "m1", Type: "Movie" };

    await choose(movie, "common.play");

    expect(mockPlayItem).toHaveBeenCalledWith(movie, {
      fromStart: false,
      isOffline: false,
    });
  });

  test("goes to an episode's show", async () => {
    mockPush.mockClear();
    const episode: BaseItemDto = {
      Id: "e1",
      Type: "Episode",
      SeriesId: "series-1",
      ParentIndexNumber: 2,
    };

    await choose(episode, "item_card.menu.go_to_show");

    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({ params: { id: "series-1" } }),
    );
  });

  test("goes to an episode's season on the show page", async () => {
    mockPush.mockClear();
    const episode: BaseItemDto = {
      Id: "e1",
      Type: "Episode",
      SeriesId: "series-1",
      SeasonId: "season-2",
      ParentIndexNumber: 2,
    };

    await choose(episode, "item_card.menu.go_to_season");

    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({ id: "series-1", seasonIndex: "2" }),
      }),
    );
  });

  // A downloaded series or season has no file of its own: deleting its
  // download means deleting its downloaded episodes.
  test("deletes every downloaded episode of a series", async () => {
    const series: BaseItemDto = { Id: "series-1", Type: "Series" };
    const { result } = await renderHook(() => useItemActions(series));

    await result.current.run("delete");

    expect(mockDeleteItems.mock.calls[0][0].sort()).toEqual([
      "s1e1",
      "s1e2",
      "s2e1",
    ]);
    expect(mockDeleteFile).not.toHaveBeenCalled();
  });

  test("deletes the downloaded episodes of one season", async () => {
    mockDeleteItems.mockClear();
    const season: BaseItemDto = {
      Id: "season-1",
      Type: "Season",
      SeriesId: "series-1",
      IndexNumber: 1,
    };
    const { result } = await renderHook(() => useItemActions(season));

    await result.current.run("delete");

    expect(mockDeleteItems.mock.calls[0][0].sort()).toEqual(["s1e1", "s1e2"]);
  });

  test("deletes a movie's own download", async () => {
    mockDeleteFile.mockClear();
    const { result } = await renderHook(() =>
      useItemActions({ Id: "m1", Type: "Movie" }),
    );

    await result.current.run("delete");

    expect(mockDeleteFile).toHaveBeenCalledWith("m1");
  });
});
