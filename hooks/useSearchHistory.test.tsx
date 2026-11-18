import { act, renderHook } from "@testing-library/react-native";
import { createStore, Provider as JotaiProvider } from "jotai";
import type React from "react";
import { userAtom } from "@/providers/JellyfinProvider";
import { storage } from "@/utils/mmkv";
import { useSearchHistory } from "./useSearchHistory";

jest.mock("@/providers/JellyfinProvider", () => {
  const { atom } = jest.requireActual("jotai");
  return { userAtom: atom(null) };
});

const setup = async (user: { Id: string; ServerId: string } | null) => {
  const store = createStore();
  store.set(userAtom, user as never);
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <JotaiProvider store={store}>{children}</JotaiProvider>
  );
  const hook = await renderHook(() => useSearchHistory(), { wrapper });
  return { ...hook, store };
};

const USER = { Id: "user-1", ServerId: "server-1" };

describe("useSearchHistory", () => {
  beforeEach(() => storage.clearAll());

  test("remembers an item opened from a search, and the search", async () => {
    const { result } = await setup(USER);

    await act(async () => result.current.rememberOpened("m1", "heat"));

    expect(result.current.history).toEqual({
      itemIds: ["m1"],
      queries: ["heat"],
    });
  });

  test("still has it the next time the screen opens", async () => {
    const first = await setup(USER);
    await act(async () => first.result.current.rememberOpened("m1", "heat"));

    const { result } = await setup(USER);

    expect(result.current.history.itemIds).toEqual(["m1"]);
  });

  test("keeps another user's history apart", async () => {
    const first = await setup(USER);
    await act(async () => first.result.current.rememberOpened("m1", "heat"));

    const { result } = await setup({ Id: "user-2", ServerId: "server-1" });

    expect(result.current.history.itemIds).toEqual([]);
  });

  test("forgets everything when cleared", async () => {
    const { result } = await setup(USER);
    await act(async () => result.current.rememberOpened("m1", "heat"));

    await act(async () => result.current.clear());

    expect(result.current.history).toEqual({ itemIds: [], queries: [] });
    const reopened = await setup(USER);
    expect(reopened.result.current.history.queries).toEqual([]);
  });

  // The landing row and the field's list each clear only what they show.
  test("clears the items and the searches apart", async () => {
    const { result } = await setup(USER);
    await act(async () => result.current.rememberOpened("m1", "heat"));

    await act(async () => result.current.clearItems());
    expect(result.current.history).toEqual({ itemIds: [], queries: ["heat"] });

    await act(async () => result.current.clearQueries());
    expect(result.current.history).toEqual({ itemIds: [], queries: [] });
  });

  test("remembers nothing without a user", async () => {
    const { result } = await setup(null);

    await act(async () => result.current.rememberOpened("m1", "heat"));

    expect(storage.getAllKeys()).toEqual([]);
  });
});
