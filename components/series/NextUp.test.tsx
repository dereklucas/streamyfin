import { render, screen } from "@testing-library/react-native";
import { createStore, Provider as JotaiProvider } from "jotai";
import { apiAtom, userAtom } from "@/providers/JellyfinProvider";
import { makeApi } from "@/test-utils/jellyfinApi";
import { QueryWrapper } from "@/test-utils/queryWrapper";
import { NextUp } from "./NextUp";

jest.mock("@/providers/JellyfinProvider", () => {
  const { atom } = jest.requireActual("jotai");
  return { apiAtom: atom(null), userAtom: atom(null) };
});
// The row is not under test: its title, and whether it is drawn at all.
jest.mock("@/components/cards/CardRow", () => ({
  CardRow: ({
    title,
    items,
    loading,
    hideIfEmpty,
  }: {
    title: string;
    items: unknown[];
    loading: boolean;
    hideIfEmpty?: boolean;
  }) => {
    const { Text } = jest.requireActual("react-native");
    if (hideIfEmpty && items.length === 0 && !loading) return null;
    return <Text>{title}</Text>;
  },
}));

const setup = async (response: unknown) => {
  const store = createStore();
  const api = makeApi();
  api.mock.onGet(/\/Shows\/NextUp/).reply(() => response as never);
  store.set(apiAtom, api as never);
  store.set(userAtom, { Id: "user-1" } as never);
  await render(
    <QueryWrapper>
      <JotaiProvider store={store}>
        <NextUp seriesId='series-1' />
      </JotaiProvider>
    </QueryWrapper>,
  );
};

describe("NextUp", () => {
  // A finished show, or one never started, showed "No items to display".
  test("leaves the section out when nothing is next", async () => {
    await setup([200, { Items: [] }]);

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.queryByText("item_card.next_up")).toBeNull();
  });

  test("shows the section when an episode is next", async () => {
    await setup([200, { Items: [{ Id: "e1", Type: "Episode" }] }]);

    expect(await screen.findByText("item_card.next_up")).toBeTruthy();
  });

  // Holding its place while it loads keeps the page from jumping when it
  // turns out there is an episode.
  test("holds its place while it loads", async () => {
    await setup(new Promise(() => {}));

    expect(screen.getByText("item_card.next_up")).toBeTruthy();
  });
});
