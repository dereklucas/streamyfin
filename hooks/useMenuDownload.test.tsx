import type { BaseItemDto } from "@jellyfin/sdk/lib/generated-client/models";
import { renderHook } from "@testing-library/react-native";
import { createStore, Provider as JotaiProvider } from "jotai";
import type React from "react";
import { userAtom } from "@/providers/JellyfinProvider";
import { useMenuDownload } from "./useMenuDownload";

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
const mockStartDownloads = jest.fn(async (_items: BaseItemDto[]) => {});
jest.mock("@/hooks/useStartDownloads", () => ({
  useStartDownloads: () => mockStartDownloads,
}));
jest.mock("sonner-native", () => ({
  toast: Object.assign(jest.fn(), { error: jest.fn() }),
}));
jest.mock("@/utils/log", () => ({ writeErrorLog: jest.fn() }));

const setup = async () => {
  const store = createStore();
  store.set(userAtom, { Id: "user" } as never);
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <JotaiProvider store={store}>{children}</JotaiProvider>
  );
  const { result } = await renderHook(() => useMenuDownload(), { wrapper });
  return result.current;
};

describe("useMenuDownload", () => {
  beforeEach(() => jest.clearAllMocks());

  test("downloads a movie or episode as it is", async () => {
    const download = await setup();
    const movie: BaseItemDto = { Id: "m", Type: "Movie" };

    await download(movie);

    expect(mockGetEpisodes).not.toHaveBeenCalled();
    expect(mockStartDownloads).toHaveBeenCalledWith([movie]);
  });

  test("downloads every episode a series has a file for", async () => {
    mockGetEpisodes.mockResolvedValue({
      data: {
        Items: [
          { Id: "e1" },
          { Id: "missing", LocationType: "Virtual" },
          { Id: "e2" },
        ],
      },
    });
    const download = await setup();

    await download({ Id: "series-1", Type: "Series" });

    expect(mockGetEpisodes).toHaveBeenCalledWith(
      expect.objectContaining({ seriesId: "series-1", userId: "user" }),
    );
    expect(mockStartDownloads.mock.calls[0][0].map((e) => e.Id)).toEqual([
      "e1",
      "e2",
    ]);
  });

  test("downloads a season's episodes, asked for by series and season", async () => {
    mockGetEpisodes.mockResolvedValue({ data: { Items: [{ Id: "e1" }] } });
    const download = await setup();

    await download({ Id: "season-2", Type: "Season", SeriesId: "series-1" });

    expect(mockGetEpisodes).toHaveBeenCalledWith(
      expect.objectContaining({ seriesId: "series-1", seasonId: "season-2" }),
    );
  });

  test("reports a failure instead of throwing", async () => {
    mockGetEpisodes.mockRejectedValue(new Error("offline"));
    const download = await setup();

    await expect(
      download({ Id: "series-1", Type: "Series" }),
    ).resolves.toBeUndefined();
    expect(mockStartDownloads).not.toHaveBeenCalled();
  });
});
