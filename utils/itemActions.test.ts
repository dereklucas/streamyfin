import type {
  BaseItemDto,
  BaseItemKind,
} from "@jellyfin/sdk/lib/generated-client/models";
import type { TFunction } from "i18next";
import { itemMenuActions } from "./itemActions";

const t = ((key: string) => key) as TFunction;

const item = (Type: BaseItemKind | undefined): BaseItemDto => ({
  Id: "item-1",
  Type,
});
const online = { t, isOffline: false, isFavorite: false };

describe("itemMenuActions", () => {
  test("offers played, unplayed and favorite for a movie", () => {
    expect(itemMenuActions(item("Movie"), online).map((a) => a.key)).toEqual([
      "played",
      "unplayed",
      "favorite",
    ]);
  });

  test("puts Shuffle first for a series", () => {
    expect(itemMenuActions(item("Series"), online)[0]).toMatchObject({
      key: "shuffle",
      label: "player.shuffle",
    });
  });

  test("names the favorite action after the current state", () => {
    const add = itemMenuActions(item("Movie"), online).at(-1);
    const remove = itemMenuActions(item("Movie"), {
      ...online,
      isFavorite: true,
    }).at(-1);

    expect(add?.label).toBe("music.track_options.add_to_favorites");
    expect(remove?.label).toBe("music.track_options.remove_from_favorites");
    expect(add?.systemImage).toBe("heart");
    expect(remove?.systemImage).toBe("heart.slash");
  });

  test("offers deleting the download offline, as a destructive action last", () => {
    const actions = itemMenuActions(item("Episode"), {
      t,
      isOffline: true,
      isFavorite: false,
    });

    expect(actions.at(-1)).toMatchObject({ key: "delete", destructive: true });
  });

  test("gives every action an SF Symbol", () => {
    for (const action of itemMenuActions(item("Series"), {
      t,
      isOffline: true,
      isFavorite: false,
    })) {
      expect(action.systemImage).toBeTruthy();
    }
  });

  test.each<BaseItemKind | undefined>([
    "Person",
    "CollectionFolder",
    "Playlist",
    undefined,
  ])("offers nothing for a %s", (type) => {
    expect(itemMenuActions(item(type), online)).toEqual([]);
  });
});
