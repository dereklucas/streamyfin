import type { BaseItemDto } from "@jellyfin/sdk/lib/generated-client/models";
import { act, render } from "@testing-library/react-native";
import { Platform } from "react-native";
import {
  chooseAction,
  showActionSheetWithOptions,
} from "@/test-utils/actionSheet";
import { useItemCardBehavior } from "./useItemCardBehavior";

// The menu's Play starts the player, which is not what is under test.
jest.mock("@/hooks/usePlayItem", () => ({ usePlayItem: () => async () => {} }));
jest.mock("@/hooks/usePlayNextEpisode", () => ({
  usePlayNextEpisode: () => async () => {},
}));
// The sheet's Shuffle starts the player, which is not what is under test.
jest.mock("@/hooks/useShuffleSeries", () => ({
  useShuffleSeries: () => async () => {},
}));
jest.mock("@/providers/JellyfinProvider", () => {
  const { atom } = jest.requireActual("jotai");
  return {
    apiAtom: atom({ basePath: "http://server" }),
    userAtom: atom(null),
  };
});
jest.mock("expo-router", () => ({ useSegments: () => [] }));
// One router object, as the real hook returns, or the handlers' deps change.
jest.mock("@/hooks/useAppRouter", () => {
  const router = { push: () => {} };
  return { __esModule: true, default: () => router };
});
jest.mock("@/components/common/TouchableItemRouter", () => ({
  getItemNavigation: () => "",
  itemRouter: () => "",
}));
const mockMarkAsPlayed = jest.fn(async (_played: boolean) => {});
jest.mock("@/hooks/useMarkAsPlayed", () => ({
  useMarkAsPlayed: () => mockMarkAsPlayed,
}));
jest.mock("@/hooks/useFavorite", () => ({
  favoritesAtom: jest.requireActual("jotai").atom({}),
  useFavorite: () => ({ isFavorite: false, toggleFavorite: () => {} }),
}));
jest.mock("@/providers/DownloadProvider", () => ({
  useDownload: () => ({ deleteFile: () => {}, downloadedItems: [] }),
}));
jest.mock(
  "@/providers/OfflineModeProvider",
  () => jest.requireActual("@/test-utils/stubModules").onlineModule,
);

const MOVIE: BaseItemDto = { Id: "movie-1", Type: "Movie", Name: "Movie" };

let longPress: ((id: string) => void) | undefined;
let menuActionsFor: ((id: string) => { key: string }[] | undefined) | undefined;
let menuAction: (id: string, key: string) => void = () => {};

const Harness = () => {
  const behavior = useItemCardBehavior({
    items: [MOVIE],
    kind: "rowWide",
    enableActionSheet: true,
  });
  longPress = behavior.handleLongPress;
  menuActionsFor = behavior.menuActionsFor;
  menuAction = behavior.handleMenuAction;
  return behavior.actionSheet;
};

const sheetsShown = () => jest.mocked(showActionSheetWithOptions).mock.calls;

// The action sheet is the long press where there is no native context menu.
describe("useItemCardBehavior long press, Android", () => {
  const originalOS = Platform.OS;
  beforeEach(() => {
    Platform.OS = "android";
    jest.mocked(showActionSheetWithOptions).mockReset();
  });
  afterEach(() => {
    Platform.OS = originalOS;
  });

  test("opens the sheet again after it is cancelled", async () => {
    await render(<Harness />);

    await act(async () => longPress?.(MOVIE.Id!));
    expect(sheetsShown()).toHaveLength(1);
    const cancelIndex = sheetsShown()[0][0].options.length - 1;
    await act(async () => {
      await chooseAction(cancelIndex);
    });

    await act(async () => longPress?.(MOVIE.Id!));
    expect(sheetsShown()).toHaveLength(2);
  });

  // A host that missed its close stayed mounted, so a second long press on
  // the same poster set the same state and showed nothing: the press-down
  // animation ran, and no menu came. See ItemActionSheetHost.test.tsx.
  test("opens the sheet again when the last one closed without an answer", async () => {
    await render(<Harness />);

    await act(async () => longPress?.(MOVIE.Id!));
    expect(sheetsShown()).toHaveLength(1);

    await act(async () => longPress?.(MOVIE.Id!));
    expect(sheetsShown()).toHaveLength(2);
  });
});

describe("useItemCardBehavior long press, iPhone and iPad", () => {
  beforeEach(() => {
    jest.mocked(showActionSheetWithOptions).mockReset();
    mockMarkAsPlayed.mockClear();
  });

  test("gives each poster a native context menu instead of the sheet", async () => {
    await render(<Harness />);

    expect(longPress).toBeUndefined();
    expect(menuActionsFor?.(MOVIE.Id!)?.map((a) => a.key)).toEqual([
      "play",
      "played",
      "favorite",
    ]);
  });

  test("runs the chosen menu action for that item", async () => {
    await render(<Harness />);

    await act(async () => menuAction(MOVIE.Id!, "played"));

    expect(mockMarkAsPlayed).toHaveBeenCalledWith(true);
    expect(showActionSheetWithOptions).not.toHaveBeenCalled();
  });

  test("runs the same action again on a second choice", async () => {
    await render(<Harness />);

    await act(async () => menuAction(MOVIE.Id!, "unplayed"));
    await act(async () => menuAction(MOVIE.Id!, "unplayed"));

    expect(mockMarkAsPlayed).toHaveBeenCalledTimes(2);
  });
});
