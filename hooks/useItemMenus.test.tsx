import type { BaseItemDto } from "@jellyfin/sdk/lib/generated-client/models";
import { act, render } from "@testing-library/react-native";
import { createStore, Provider as JotaiProvider } from "jotai";
import { favoritesAtom } from "@/hooks/useFavorite";
import { useItemMenus } from "./useItemMenus";

jest.mock("@/hooks/useFavorite", () => ({
  favoritesAtom: jest.requireActual("jotai").atom({}),
}));
jest.mock("@/providers/JellyfinProvider", () => {
  const { atom } = jest.requireActual("jotai");
  return { userAtom: atom({ Policy: { EnableContentDownloading: true } }) };
});
jest.mock("@/providers/DownloadProvider", () => ({
  useDownload: () => ({ downloadedItems: [{ item: { Id: "downloaded" } }] }),
}));
jest.mock(
  "@/providers/OfflineModeProvider",
  () => jest.requireActual("@/test-utils/stubModules").onlineModule,
);
// What a chosen action does is ItemActionRunner's; here, which item and
// action it is mounted for.
const mockRunner = jest.fn();
jest.mock("@/components/common/ItemActionRunner", () => ({
  ItemActionRunner: (props: { item: BaseItemDto; action: string }) => {
    mockRunner(props.item.Id, props.action);
    return null;
  },
}));

const ITEMS: BaseItemDto[] = [
  { Id: "movie", Type: "Movie" },
  { Id: "downloaded", Type: "Movie" },
];

let menus: ReturnType<typeof useItemMenus>;
const Harness = ({ items }: { items: BaseItemDto[] }) => {
  menus = useItemMenus(items);
  return menus.runner;
};

const keysFor = (id: string) => menus.menuActionsFor(id)?.map((a) => a.key);

describe("useItemMenus", () => {
  beforeEach(() => mockRunner.mockClear());

  test("describes each item's menu from the shared state", async () => {
    const store = createStore();
    store.set(favoritesAtom, { movie: true });
    await render(
      <JotaiProvider store={store}>
        <Harness items={ITEMS} />
      </JotaiProvider>,
    );

    expect(keysFor("movie")).toEqual([
      "play",
      "played",
      "favorite",
      "download",
    ]);
    expect(
      menus.menuActionsFor("movie")?.find((a) => a.key === "favorite")?.label,
    ).toBe("music.track_options.remove_from_favorites");
    expect(keysFor("downloaded")).toContain("delete");
    expect(menus.menuActionsFor("unknown")).toBeUndefined();
  });

  test("runs a chosen action for that item", async () => {
    await render(<Harness items={ITEMS} />);

    await act(async () => menus.handleMenuAction("movie", "played"));

    expect(mockRunner).toHaveBeenCalledWith("movie", "played");
  });

  test("ignores an action for an item it does not have", async () => {
    await render(<Harness items={ITEMS} />);

    await act(async () => menus.handleMenuAction("unknown", "played"));

    expect(mockRunner).not.toHaveBeenCalled();
  });
});
