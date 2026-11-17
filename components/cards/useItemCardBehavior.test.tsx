import type { BaseItemDto } from "@jellyfin/sdk/lib/generated-client/models";
import { act, render } from "@testing-library/react-native";
import {
  chooseAction,
  showActionSheetWithOptions,
} from "@/test-utils/actionSheet";
import { useItemCardBehavior } from "./useItemCardBehavior";

// The sheet's Shuffle starts the player, which is not what is under test.
jest.mock("@/hooks/useShuffleSeries", () => ({
  useShuffleSeries: () => async () => {},
}));
jest.mock("@/providers/JellyfinProvider", () => {
  const { atom } = jest.requireActual("jotai");
  return { apiAtom: atom({ basePath: "http://server" }) };
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
jest.mock("@/hooks/useMarkAsPlayed", () => ({
  useMarkAsPlayed: () => async () => {},
}));
jest.mock("@/hooks/useFavorite", () => ({
  useFavorite: () => ({ isFavorite: false, toggleFavorite: () => {} }),
}));
jest.mock("@/providers/DownloadProvider", () => ({
  useDownload: () => ({ deleteFile: () => {} }),
}));
jest.mock(
  "@/providers/OfflineModeProvider",
  () => jest.requireActual("@/test-utils/stubModules").onlineModule,
);

const MOVIE: BaseItemDto = { Id: "movie-1", Type: "Movie", Name: "Movie" };

let longPress: (id: string) => void = () => {};

const Harness = () => {
  const { handleLongPress, actionSheet } = useItemCardBehavior({
    items: [MOVIE],
    kind: "rowWide",
    enableActionSheet: true,
  });
  longPress = handleLongPress ?? (() => {});
  return actionSheet;
};

const sheetsShown = () => jest.mocked(showActionSheetWithOptions).mock.calls;

describe("useItemCardBehavior long press", () => {
  beforeEach(() => {
    jest.mocked(showActionSheetWithOptions).mockReset();
  });

  test("opens the sheet again after it is cancelled", async () => {
    await render(<Harness />);

    await act(async () => longPress(MOVIE.Id!));
    expect(sheetsShown()).toHaveLength(1);
    const cancelIndex = sheetsShown()[0][0].options.length - 1;
    await act(async () => {
      await chooseAction(cancelIndex);
    });

    await act(async () => longPress(MOVIE.Id!));
    expect(sheetsShown()).toHaveLength(2);
  });

  // A host that missed its close stayed mounted, so a second long press on
  // the same poster set the same state and showed nothing: the press-down
  // animation ran, and no menu came. See ItemActionSheetHost.test.tsx.
  test("opens the sheet again when the last one closed without an answer", async () => {
    await render(<Harness />);

    await act(async () => longPress(MOVIE.Id!));
    expect(sheetsShown()).toHaveLength(1);

    await act(async () => longPress(MOVIE.Id!));
    expect(sheetsShown()).toHaveLength(2);
  });
});
