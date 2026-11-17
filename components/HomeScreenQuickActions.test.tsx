import type { BaseItemDto } from "@jellyfin/sdk/lib/generated-client/models";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, waitFor } from "@testing-library/react-native";
import { createStore, Provider as JotaiProvider } from "jotai";
import { userAtom } from "@/providers/JellyfinProvider";
import { HomeScreenQuickActions } from "./HomeScreenQuickActions";

const mockSetItems = jest.fn(async (..._args: unknown[]) => {});
jest.mock("expo-quick-actions", () => ({
  setItems: (...args: unknown[]) => mockSetItems(...args),
}));
let mockQuickAction: ((action: unknown) => void) | undefined;
jest.mock("expo-quick-actions/hooks", () => ({
  useQuickActionCallback: (callback: (action: unknown) => void) => {
    mockQuickAction = callback;
  },
}));
const mockGetResumeItems = jest.fn();
jest.mock("@jellyfin/sdk/lib/utils/api", () => ({
  getLibraryApi: () => ({ getResumeItems: mockGetResumeItems }),
}));
jest.mock("@/providers/JellyfinProvider", () => {
  const { atom } = jest.requireActual("jotai");
  return { apiAtom: atom({ basePath: "http://server" }), userAtom: atom(null) };
});
const mockPlayItem = jest.fn(async (_item: BaseItemDto) => {});
jest.mock("@/hooks/usePlayItem", () => ({ usePlayItem: () => mockPlayItem }));
const mockPush = jest.fn();
jest.mock("@/hooks/useAppRouter", () => {
  const router = { push: (href: string) => mockPush(href) };
  return { __esModule: true, default: () => router };
});

const RESUME: BaseItemDto = {
  Id: "m1",
  Type: "Movie",
  Name: "1917",
  RunTimeTicks: 0,
};

const setup = async (signedIn: boolean) => {
  const store = createStore();
  if (signedIn) store.set(userAtom, { Id: "user" } as never);
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  await render(
    <QueryClientProvider client={client}>
      <JotaiProvider store={store}>
        <HomeScreenQuickActions />
      </JotaiProvider>
    </QueryClientProvider>,
  );
  return store;
};

describe("HomeScreenQuickActions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetResumeItems.mockResolvedValue({ data: { Items: [RESUME] } });
  });

  test("puts what is in progress on the Home Screen icon", async () => {
    await setup(true);

    await waitFor(() =>
      expect(mockSetItems).toHaveBeenLastCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: "resume:m1", title: "1917" }),
          expect.objectContaining({ id: "search" }),
        ]),
      ),
    );
  });

  test("clears the actions while nobody is signed in", async () => {
    await setup(false);

    await waitFor(() => expect(mockSetItems).toHaveBeenCalledWith([]));
    expect(mockGetResumeItems).not.toHaveBeenCalled();
  });

  test("resumes the item a resume action names", async () => {
    await setup(true);

    await act(async () =>
      mockQuickAction?.({ id: "resume:m1", title: "1917", params: {} }),
    );

    expect(mockPlayItem).toHaveBeenCalledWith(
      expect.objectContaining({ Id: "m1" }),
    );
  });

  test("opens the page a navigation action names", async () => {
    await setup(true);

    await act(async () => mockQuickAction?.({ id: "downloads", title: "" }));

    expect(mockPush).toHaveBeenCalledWith("/downloads");
  });

  // On a cold launch the action arrives before the saved sign-in is
  // restored: it waits for it instead of being lost.
  test("runs an action that arrived before sign-in once signed in", async () => {
    const store = await setup(false);

    await act(async () =>
      mockQuickAction?.({ id: "resume:m1", title: "1917", params: {} }),
    );
    expect(mockPlayItem).not.toHaveBeenCalled();

    await act(async () => store.set(userAtom, { Id: "user" } as never));

    await waitFor(() =>
      expect(mockPlayItem).toHaveBeenCalledWith(
        expect.objectContaining({ Id: "m1" }),
      ),
    );
  });
});
