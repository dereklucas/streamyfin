import type { BaseItemDto } from "@jellyfin/sdk/lib/generated-client/models";
import { renderHook } from "@testing-library/react-native";
import { createStore, Provider as JotaiProvider } from "jotai";
import type React from "react";
import { toast } from "sonner-native";
import { userAtom } from "@/providers/JellyfinProvider";
import { usePlayNextEpisode } from "./usePlayNextEpisode";

const mockGetNextUp = jest.fn();
jest.mock("@jellyfin/sdk/lib/utils/api", () => ({
  getShowApi: () => ({ getNextUp: mockGetNextUp }),
}));
jest.mock("@/providers/JellyfinProvider", () => {
  const { atom } = jest.requireActual("jotai");
  return {
    apiAtom: atom({ basePath: "http://server" }),
    userAtom: atom(null),
  };
});
const mockPlayItem = jest.fn(async (_item: BaseItemDto) => {});
jest.mock("@/hooks/usePlayItem", () => ({ usePlayItem: () => mockPlayItem }));
jest.mock("sonner-native", () => ({
  toast: Object.assign(jest.fn(), { error: jest.fn() }),
}));
jest.mock("@/utils/log", () => ({ writeErrorLog: jest.fn() }));

const SERIES: BaseItemDto = { Id: "series-1", Type: "Series" };

const setup = async () => {
  const store = createStore();
  store.set(userAtom, { Id: "user" } as never);
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <JotaiProvider store={store}>{children}</JotaiProvider>
  );
  const { result } = await renderHook(() => usePlayNextEpisode(), { wrapper });
  return result.current;
};

describe("usePlayNextEpisode", () => {
  beforeEach(() => jest.clearAllMocks());

  test("plays the series' next-up episode", async () => {
    mockGetNextUp.mockResolvedValue({
      data: { Items: [{ Id: "e6", Type: "Episode" }] },
    });
    const playNext = await setup();

    await playNext(SERIES);

    expect(mockGetNextUp).toHaveBeenCalledWith(
      expect.objectContaining({ seriesId: "series-1", userId: "user" }),
    );
    expect(mockPlayItem).toHaveBeenCalledWith(
      expect.objectContaining({ Id: "e6" }),
    );
  });

  test("says so when there is no next episode", async () => {
    mockGetNextUp.mockResolvedValue({ data: { Items: [] } });
    const playNext = await setup();

    await playNext(SERIES);

    expect(mockPlayItem).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith("item_card.menu.no_next_episode");
  });

  test("reports a failed request instead of throwing", async () => {
    mockGetNextUp.mockRejectedValue(new Error("offline"));
    const playNext = await setup();

    await expect(playNext(SERIES)).resolves.toBeUndefined();
    expect(toast.error).toHaveBeenCalledWith("common.something_went_wrong");
  });
});
