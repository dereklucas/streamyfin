import type { BaseItemDto } from "@jellyfin/sdk/lib/generated-client/models";
import { renderHook } from "@testing-library/react-native";
import { createStore, Provider as JotaiProvider } from "jotai";
import type React from "react";
import { toast } from "sonner-native";
import type { DownloadedItem } from "@/providers/Downloads/types";
import { userAtom } from "@/providers/JellyfinProvider";
import { useShuffleSeries } from "./useShuffleSeries";

const mockGetEpisodes = jest.fn();
jest.mock("@jellyfin/sdk/lib/utils/api", () => ({
  getShowApi: () => ({ getEpisodes: mockGetEpisodes }),
}));
jest.mock("@/providers/JellyfinProvider", () => {
  const { atom } = jest.requireActual("jotai");
  return {
    apiAtom: atom({ basePath: "http://server" }),
    userAtom: atom(null),
  };
});
let mockDownloads: DownloadedItem[] = [];
jest.mock("@/providers/DownloadProvider", () => ({
  useDownload: () => ({ getDownloadedItems: () => mockDownloads }),
}));
// Starting a queue opens the player; what matters here is the pool.
const mockStartShuffle = jest.fn((_items: BaseItemDto[], _options?: object) =>
  _items.length > 1 ? true : _items.length === 1,
);
jest.mock("@/hooks/useShuffleQueue", () => ({
  useShuffleQueue: () => ({ startShuffle: mockStartShuffle }),
}));
jest.mock("sonner-native", () => ({
  toast: Object.assign(jest.fn(), { error: jest.fn() }),
}));
jest.mock("@/utils/log", () => ({ writeErrorLog: jest.fn() }));

const SERIES: BaseItemDto = { Id: "series-1", Type: "Series", Name: "Show" };

const setup = async () => {
  const store = createStore();
  store.set(userAtom, { Id: "user" });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <JotaiProvider store={store}>{children}</JotaiProvider>
  );
  const { result } = await renderHook(() => useShuffleSeries(), { wrapper });
  return result.current;
};

const downloaded = (id: string, seriesId: string): DownloadedItem =>
  ({
    item: {
      Id: id,
      Type: "Episode",
      SeriesId: seriesId,
      ParentIndexNumber: 1,
      IndexNumber: 1,
    },
  }) as DownloadedItem;

describe("useShuffleSeries", () => {
  beforeEach(() => {
    mockGetEpisodes.mockReset();
    mockStartShuffle.mockClear();
    jest.mocked(toast).mockClear();
    jest.mocked(toast.error).mockClear();
    mockDownloads = [];
  });

  test("shuffles every episode of the series from the server", async () => {
    mockGetEpisodes.mockResolvedValue({
      data: { Items: [{ Id: "e1" }, { Id: "e2" }] },
    });
    const shuffleSeries = await setup();

    await shuffleSeries(SERIES);

    expect(mockGetEpisodes).toHaveBeenCalledWith(
      expect.objectContaining({ seriesId: "series-1", userId: "user" }),
    );
    const [pool, options] = mockStartShuffle.mock.calls[0];
    expect(pool.map((e) => e.Id)).toEqual(["e1", "e2"]);
    expect(options).toEqual({ isOffline: false });
  });

  test("shuffles the series' downloaded episodes offline, without the server", async () => {
    mockDownloads = [
      downloaded("e1", "series-1"),
      downloaded("e2", "series-1"),
      downloaded("other", "series-2"),
    ];
    const shuffleSeries = await setup();

    await shuffleSeries(SERIES, { isOffline: true });

    expect(mockGetEpisodes).not.toHaveBeenCalled();
    const [pool, options] = mockStartShuffle.mock.calls[0];
    expect(pool.map((e) => e.Id).sort()).toEqual(["e1", "e2"]);
    expect(options).toEqual({ isOffline: true });
  });

  test("says so when the series has nothing to play", async () => {
    mockGetEpisodes.mockResolvedValue({ data: { Items: [] } });
    const shuffleSeries = await setup();

    await shuffleSeries(SERIES);

    expect(toast).toHaveBeenCalledWith("item_card.no_episodes_to_shuffle");
  });

  test("reports a failed request instead of throwing", async () => {
    mockGetEpisodes.mockRejectedValue(new Error("offline"));
    const shuffleSeries = await setup();

    await expect(shuffleSeries(SERIES)).resolves.toBeUndefined();
    expect(toast.error).toHaveBeenCalledWith("common.something_went_wrong");
    expect(mockStartShuffle).not.toHaveBeenCalled();
  });
});
