import type {
  PublicSystemInfo,
  UserDto,
} from "@jellyfin/sdk/lib/generated-client/models";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { createStore, Provider as JotaiProvider } from "jotai";
import type React from "react";
import { userAtom } from "@/providers/JellyfinProvider";
import { useQuickConnectUserPicker } from "./useQuickConnectUserPicker";

// Ported from the Quick Connect sheet's spec when the picker moved to the
// pairing screen (#11).
const mockGetUsers = jest.fn<Promise<{ data: UserDto[] }>, []>();
const mockGetPublicSystemInfo = jest.fn<
  Promise<{ data: PublicSystemInfo }>,
  []
>();
jest.mock("@jellyfin/sdk/lib/utils/api", () => ({
  getSystemApi: () => ({
    getPublicSystemInfo: () => mockGetPublicSystemInfo(),
  }),
  getUserApi: () => ({ getUsers: () => mockGetUsers() }),
}));
jest.mock("@/providers/JellyfinProvider", () => {
  const { atom } = jest.requireActual("jotai");
  return {
    apiAtom: atom({ basePath: "https://media.example.com" }),
    userAtom: atom(null),
  };
});

const ADMIN: UserDto = {
  Id: "admin-1",
  Name: "alice",
  Policy: { IsAdministrator: true } as UserDto["Policy"],
};
const BOB: UserDto = { Id: "user-2", Name: "bob", Policy: {} as never };
const DAVE: UserDto = { Id: "user-4", Name: "dave", Policy: {} as never };
const CAROL: UserDto = {
  Id: "user-3",
  Name: "carol",
  Policy: { IsDisabled: true } as UserDto["Policy"],
};

const createClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { gcTime: Number.POSITIVE_INFINITY, retry: false },
    },
  });

const setup = async (signedIn: UserDto, client = createClient()) => {
  const store = createStore();
  store.set(userAtom, signedIn as never);
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>
      <JotaiProvider store={store}>{children}</JotaiProvider>
    </QueryClientProvider>
  );
  const hook = await renderHook(() => useQuickConnectUserPicker(), { wrapper });
  return { ...hook, client };
};

const labels = (picker: ReturnType<typeof useQuickConnectUserPicker>) =>
  picker.userGroups.flatMap((group) => group.options.map((o) => o.label));
const pick = async (
  picker: ReturnType<typeof useQuickConnectUserPicker>,
  name: string,
) =>
  act(async () => {
    picker.userGroups
      .flatMap((group) => group.options)
      .find((o) => o.label === name)
      ?.onPress();
  });

describe("useQuickConnectUserPicker", () => {
  beforeEach(() => {
    mockGetUsers.mockReset();
    mockGetPublicSystemInfo.mockReset();
    mockGetUsers.mockResolvedValue({ data: [ADMIN, BOB, CAROL] });
    mockGetPublicSystemInfo.mockResolvedValue({ data: { Version: "10.10.7" } });
  });

  test("starts on the administrator, and offers the enabled users", async () => {
    const { result } = await setup(ADMIN);
    await waitFor(() => expect(result.current.showUserPicker).toBe(true));

    expect(result.current.targetUser?.Id).toBe("admin-1");
    expect(labels(result.current)).toEqual(["alice", "bob"]);
  });

  test("approves for the user picked", async () => {
    const { result } = await setup(ADMIN);
    await waitFor(() => expect(result.current.showUserPicker).toBe(true));

    await pick(result.current, "bob");

    expect(result.current.targetUser?.Id).toBe("user-2");
  });

  test("goes back to the administrator when reset", async () => {
    const { result } = await setup(ADMIN);
    await waitFor(() => expect(result.current.showUserPicker).toBe(true));
    await pick(result.current, "bob");

    await act(async () => result.current.reset());

    expect(result.current.targetUser?.Id).toBe("admin-1");
  });

  // A request without a user id is approved for whoever sends it. A pick
  // that quietly fell back to the administrator would sign the other user's
  // device in as an admin.
  test("flags a picked user who has left the list, never the administrator", async () => {
    const { result, client } = await setup(ADMIN);
    await waitFor(() => expect(result.current.showUserPicker).toBe(true));
    await pick(result.current, "bob");

    mockGetUsers.mockResolvedValue({ data: [ADMIN, DAVE] });
    await act(() =>
      client.refetchQueries({ queryKey: ["jellyfin", "users", "enabled"] }),
    );

    await waitFor(() => expect(result.current.isPickUnavailable).toBe(true));
    expect(result.current.targetUser).toBeUndefined();
  });

  test("an administrator on a server older than 10.9 gets no picker", async () => {
    mockGetPublicSystemInfo.mockResolvedValue({ data: { Version: "10.8.13" } });
    const { result } = await setup(ADMIN);
    await waitFor(() => expect(mockGetPublicSystemInfo).toHaveBeenCalled());

    expect(result.current.showUserPicker).toBe(false);
    expect(mockGetUsers).not.toHaveBeenCalled();
  });

  test("a regular user gets no picker and the user list is never asked for", async () => {
    const { result } = await setup(BOB);

    expect(result.current.showUserPicker).toBe(false);
    expect(result.current.targetUser?.Id).toBe("user-2");
    expect(mockGetPublicSystemInfo).not.toHaveBeenCalled();
    expect(mockGetUsers).not.toHaveBeenCalled();
  });

  test("no picker when the administrator is the only enabled account", async () => {
    mockGetUsers.mockResolvedValue({ data: [ADMIN, CAROL] });
    const { result } = await setup(ADMIN);
    await waitFor(() => expect(mockGetUsers).toHaveBeenCalled());

    expect(result.current.showUserPicker).toBe(false);
  });

  // The server info query is shared with useMediaPreferences, which reads
  // its status: a refetch from here that fails would lock its settings.
  test("does not ask again for a server version the cache already holds", async () => {
    const client = createClient();
    client.setQueryData(["jellyfin", "serverInfo"], { Version: "10.11.2" });
    const { result } = await setup(ADMIN, client);

    await waitFor(() => expect(result.current.showUserPicker).toBe(true));
    expect(mockGetPublicSystemInfo).not.toHaveBeenCalled();
  });
});
