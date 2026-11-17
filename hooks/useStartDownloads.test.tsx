import type { BaseItemDto } from "@jellyfin/sdk/lib/generated-client/models";
import { renderHook } from "@testing-library/react-native";
import { createStore, Provider as JotaiProvider } from "jotai";
import type React from "react";
import { Alert } from "react-native";
import { userAtom } from "@/providers/JellyfinProvider";
import { useStartDownloads } from "./useStartDownloads";

const mockGetItem = jest.fn();
jest.mock("@jellyfin/sdk/lib/utils/api", () => ({
  getLibraryApi: () => ({ getItem: mockGetItem }),
}));
jest.mock("@/providers/JellyfinProvider", () => {
  const { atom } = jest.requireActual("jotai");
  return {
    apiAtom: atom({ basePath: "http://server" }),
    userAtom: atom(null),
  };
});
const mockStartBackgroundDownload = jest.fn(async () => {});
let mockDownloaded: { item: BaseItemDto }[] = [];
jest.mock("@/providers/DownloadProvider", () => ({
  useDownload: () => ({
    startBackgroundDownload: mockStartBackgroundDownload,
    downloadedItems: mockDownloaded,
  }),
}));
jest.mock("@/utils/atoms/settings", () => ({
  useSettings: () => ({ settings: {} }),
}));
// The stream URL is asked of the server.
const mockGetDownloadStreamUrl = jest.fn();
jest.mock("@/utils/jellyfin/media/getStreamUrl", () => ({
  getDownloadStreamUrl: (args: unknown) => mockGetDownloadStreamUrl(args),
}));
jest.mock("sonner-native", () => ({
  toast: Object.assign(jest.fn(), { error: jest.fn() }),
}));
jest.mock("@/utils/log", () => ({
  logAndCaptureError: jest.fn(),
  writeToLog: jest.fn(),
}));

const SOURCE = { Id: "source-1", MediaStreams: [] };
const movie = (id: string): BaseItemDto => ({
  Id: id,
  Type: "Movie",
  Name: id,
  MediaSources: [SOURCE],
  Chapters: [],
});

const setup = async () => {
  const store = createStore();
  store.set(userAtom, { Id: "user" } as never);
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <JotaiProvider store={store}>{children}</JotaiProvider>
  );
  const { result } = await renderHook(() => useStartDownloads(), { wrapper });
  return result.current;
};

describe("useStartDownloads", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDownloaded = [];
    mockGetDownloadStreamUrl.mockImplementation(
      async ({ item }: { item: BaseItemDto }) => ({
        url: `http://server/${item.Id}`,
        mediaSource: SOURCE,
      }),
    );
  });

  test("downloads each item with its default play settings", async () => {
    const start = await setup();

    await start([movie("a"), movie("b")]);

    expect(mockStartBackgroundDownload).toHaveBeenCalledTimes(2);
    expect(mockStartBackgroundDownload).toHaveBeenCalledWith(
      "http://server/a",
      expect.objectContaining({ Id: "a" }),
      SOURCE,
      expect.anything(),
      undefined,
      expect.anything(),
    );
  });

  test("uses the chosen version and tracks for a single item", async () => {
    const start = await setup();

    await start([movie("a")], {
      tracks: {
        mediaSource: SOURCE as never,
        audioIndex: 2,
        subtitleIndex: 5,
      },
    });

    expect(mockGetDownloadStreamUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        mediaSourceId: "source-1",
        audioStreamIndex: 2,
        subtitleStreamIndex: 5,
      }),
    );
  });

  test("skips what is already downloaded", async () => {
    mockDownloaded = [{ item: movie("a") }];
    const start = await setup();

    await start([movie("a"), movie("b")]);

    expect(mockStartBackgroundDownload).toHaveBeenCalledTimes(1);
    expect(mockStartBackgroundDownload).toHaveBeenCalledWith(
      "http://server/b",
      expect.anything(),
      expect.anything(),
      expect.anything(),
      undefined,
      expect.anything(),
    );
  });

  test("reports an item the server gives no download URL for, and goes on", async () => {
    mockGetDownloadStreamUrl.mockImplementation(
      async ({ item }: { item: BaseItemDto }) =>
        item.Id === "a"
          ? { url: null, mediaSource: null }
          : { url: `http://server/${item.Id}`, mediaSource: SOURCE },
    );
    const start = await setup();

    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});

    await start([movie("a"), movie("b")]);

    expect(alert).toHaveBeenCalled();
    expect(mockStartBackgroundDownload).toHaveBeenCalledTimes(1);
  });

  test("fetches the full item first when the list's copy has no chapters", async () => {
    mockGetItem.mockResolvedValue({ data: { ...movie("a"), Overview: "x" } });
    const start = await setup();

    await start([{ Id: "a", Type: "Movie" }]);

    expect(mockGetItem).toHaveBeenCalledWith({ itemId: "a", userId: "user" });
    expect(mockStartBackgroundDownload).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ Overview: "x" }),
      expect.anything(),
      expect.anything(),
      undefined,
      expect.anything(),
    );
  });
});
