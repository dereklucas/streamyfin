import { fireEvent, render, screen } from "@testing-library/react-native";
import { createStore, Provider as JotaiProvider } from "jotai";
import { apiAtom, userAtom } from "@/providers/JellyfinProvider";
import { makeApi } from "@/test-utils/jellyfinApi";
import { QueryWrapper } from "@/test-utils/queryWrapper";
import { SearchLanding } from "./SearchLanding";

jest.mock("@/providers/JellyfinProvider", () => {
  const { atom } = jest.requireActual("jotai");
  return { apiAtom: atom(null), userAtom: atom(null) };
});
const mockPush = jest.fn();
jest.mock("@/hooks/useAppRouter", () => {
  const router = { push: (href: unknown) => mockPush(href) };
  return { __esModule: true, default: () => router };
});

// The row itself is not under test: its title, its action and its items.
jest.mock("@/components/cards/CardRow", () => ({
  CardRow: ({
    title,
    seeAllLabel,
    onPressSeeAll,
    items,
  }: {
    title: string;
    seeAllLabel: string;
    onPressSeeAll: () => void;
    items: { Id: string; Name: string }[];
  }) => {
    const { Text, Pressable, View } = jest.requireActual("react-native");
    return (
      <View>
        <Text>{title}</Text>
        <Pressable accessibilityLabel={seeAllLabel} onPress={onPressSeeAll} />
        {items.map((item) => (
          <Text key={item.Id}>{item.Name}</Text>
        ))}
      </View>
    );
  },
}));

const makeServer = () => {
  const api = makeApi();
  api.mock.onGet(/\/Genres/).reply(200, {
    Items: [
      { Id: "comedy", Name: "Comedy", Type: "Genre", MovieCount: 9 },
      { Id: "drama", Name: "Drama", Type: "Genre", MovieCount: 20 },
    ],
  });
  api.mock.onGet(/\/Items/).reply((config) => {
    const url = new URL(config.url ?? "", "https://x");
    if (url.searchParams.get("ids")) {
      // The server answers in its own order, not the history's.
      return [
        200,
        {
          Items: [
            { Id: "m2", Name: "Heat", Type: "Movie" },
            { Id: "m1", Name: "Alien", Type: "Movie" },
          ],
        },
      ];
    }
    return [
      200,
      { Items: [{ Id: `top-${url.searchParams.get("genreIds")}` }] },
    ];
  });
  return api;
};

const setup = async (itemIds: string[]) => {
  const store = createStore();
  store.set(apiAtom, makeServer() as never);
  store.set(userAtom, { Id: "user-1", ServerId: "server-1" } as never);
  const onClear = jest.fn();
  const onOpenItem = jest.fn();
  await render(
    <QueryWrapper>
      <JotaiProvider store={store}>
        <SearchLanding
          recentItemIds={itemIds}
          onClearRecent={onClear}
          onOpenItem={onOpenItem}
        />
      </JotaiProvider>
    </QueryWrapper>,
  );
  return { onClear, onOpenItem };
};

describe("SearchLanding", () => {
  beforeEach(() => mockPush.mockClear());

  test("shows what was opened from a search, most recent first", async () => {
    await setup(["m1", "m2"]);

    expect(await screen.findByText("search.recently_searched")).toBeTruthy();
    const names = screen
      .getAllByText(/^(Alien|Heat)$/)
      .map((node) => node.props.children);
    expect(names).toEqual(["Alien", "Heat"]);
  });

  test("hides the row until something has been opened", async () => {
    await setup([]);

    expect(await screen.findByText("Drama")).toBeTruthy();
    expect(screen.queryByText("search.recently_searched")).toBeNull();
  });

  test("clears the row", async () => {
    const { onClear } = await setup(["m1"]);

    fireEvent.press(await screen.findByLabelText("search.clear"));

    expect(onClear).toHaveBeenCalled();
  });

  test("lists the biggest genres to browse, and opens one", async () => {
    await setup([]);

    const tiles = await screen.findAllByRole("button", {
      name: /Comedy|Drama/,
    });
    expect(tiles.map((tile) => tile.props.accessibilityLabel)).toEqual([
      "Drama",
      "Comedy",
    ]);

    fireEvent.press(tiles[0]);

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/genres/[genreId]",
      params: { genreId: "drama" },
    });
  });
});
