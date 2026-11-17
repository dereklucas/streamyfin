import type { BaseItemDto } from "@jellyfin/sdk/lib/generated-client/models";
import { renderHook } from "@testing-library/react-native";
import { createStore, Provider as JotaiProvider } from "jotai";
import type React from "react";
import { userAtom } from "@/providers/JellyfinProvider";
import { usePlayItem } from "./usePlayItem";

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
jest.mock("@/utils/atoms/settings", () => ({
  useSettings: () => ({ settings: {} }),
}));
// Opening the player is the boundary; what matters is what it is asked for.
const mockPlayMedia = jest.fn(async () => {});
jest.mock("@/hooks/usePlayMedia", () => ({
  usePlayMedia: () => mockPlayMedia,
}));

const SOURCE = { Id: "source-1", MediaStreams: [] };
const RESUME_TICKS = 25_300_000_000;
const full = (extra: Partial<BaseItemDto> = {}): BaseItemDto => ({
  Id: "m1",
  Type: "Movie",
  MediaSources: [SOURCE],
  UserData: { PlaybackPositionTicks: RESUME_TICKS } as BaseItemDto["UserData"],
  ...extra,
});

const setup = async () => {
  const store = createStore();
  store.set(userAtom, { Id: "user" } as never);
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <JotaiProvider store={store}>{children}</JotaiProvider>
  );
  const { result } = await renderHook(() => usePlayItem(), { wrapper });
  return result.current;
};

describe("usePlayItem", () => {
  beforeEach(() => jest.clearAllMocks());

  test("resumes where the item was left", async () => {
    const play = await setup();

    await play(full());

    expect(mockPlayMedia).toHaveBeenCalledWith(
      expect.objectContaining({
        itemId: "m1",
        mediaSourceId: "source-1",
        playbackPositionTicks: RESUME_TICKS,
        offline: false,
      }),
      expect.objectContaining({ item: expect.objectContaining({ Id: "m1" }) }),
    );
  });

  test("starts over when asked to", async () => {
    const play = await setup();

    await play(full(), { fromStart: true });

    expect(mockPlayMedia).toHaveBeenCalledWith(
      expect.objectContaining({ playbackPositionTicks: 0 }),
      expect.anything(),
    );
  });

  // A row's copy of an item often has no media sources: without them the
  // default audio and subtitle choices cannot be made.
  test("fetches the full item when the row's copy has no media sources", async () => {
    mockGetItem.mockResolvedValue({ data: full() });
    const play = await setup();

    await play({ Id: "m1", Type: "Movie" });

    expect(mockGetItem).toHaveBeenCalledWith({ itemId: "m1", userId: "user" });
    expect(mockPlayMedia).toHaveBeenCalledWith(
      expect.objectContaining({ mediaSourceId: "source-1" }),
      expect.anything(),
    );
  });

  test("plays a downloaded item offline as it is", async () => {
    const play = await setup();

    await play({ Id: "m1", Type: "Movie" }, { isOffline: true });

    expect(mockGetItem).not.toHaveBeenCalled();
    expect(mockPlayMedia).toHaveBeenCalledWith(
      expect.objectContaining({ itemId: "m1", offline: true }),
      expect.anything(),
    );
  });
});
