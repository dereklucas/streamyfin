import type {
  BaseItemDto,
  BaseItemKind,
} from "@jellyfin/sdk/lib/generated-client/models";
import { renderHook } from "@testing-library/react-native";
import { showActionSheetWithOptions } from "@/test-utils/actionSheet";
import { useItemActionSheet } from "./useItemActionSheet";

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
jest.mock("@/providers/DownloadProvider", () => ({
  useDownload: () => ({ deleteFile: () => {} }),
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
  ])("offers the played actions for a %s", async (type) => {
    await present(type);

    expect(mockShowActionSheet).toHaveBeenCalledTimes(1);
    expect(mockShowActionSheet.mock.calls[0][0].options).toEqual(
      expect.arrayContaining([
        "common.mark_as_played",
        "common.mark_as_not_played",
      ]),
    );
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

  test("marks a season unplayed through the shared played mutation", async () => {
    const { closed } = await present("Season");
    await mockShowActionSheet.mock.calls[0][1](1);
    await closed;

    expect(mockMarkAsPlayed).toHaveBeenCalledWith(false);
  });

  test("offers Shuffle first for a series", async () => {
    await present("Series");

    expect(mockShowActionSheet.mock.calls[0][0].options[0]).toBe(
      "player.shuffle",
    );
  });

  test("shuffles the series when Shuffle is chosen", async () => {
    const { closed } = await present("Series");
    await mockShowActionSheet.mock.calls[0][1](0);
    await closed;

    expect(mockShuffleSeries).toHaveBeenCalledWith(
      expect.objectContaining({ Id: "item-1", Type: "Series" }),
      { isOffline: false },
    );
    expect(mockMarkAsPlayed).not.toHaveBeenCalled();
  });

  test("still marks a series played below Shuffle", async () => {
    const { closed } = await present("Series");
    await mockShowActionSheet.mock.calls[0][1](1);
    await closed;

    expect(mockMarkAsPlayed).toHaveBeenCalledWith(true);
    expect(mockShuffleSeries).not.toHaveBeenCalled();
  });

  test("offers no Shuffle for a movie", async () => {
    await present("Movie");

    expect(mockShowActionSheet.mock.calls[0][0].options).not.toContain(
      "player.shuffle",
    );
  });
});
