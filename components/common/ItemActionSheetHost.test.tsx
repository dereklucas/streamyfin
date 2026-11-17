import type { BaseItemDto } from "@jellyfin/sdk/lib/generated-client/models";
import { act, render } from "@testing-library/react-native";
import { ItemActionSheetHost } from "./ItemActionSheetHost";

let closeSheet: () => void = () => {};
const mockShowActionSheet = jest.fn();

// A new function on every render, as the real hook hands back while the
// item's favorite and played state settle.
jest.mock("@/hooks/useItemActionSheet", () => ({
  useItemActionSheet: () => () => {
    mockShowActionSheet();
    return new Promise<void>((resolve) => {
      closeSheet = resolve;
    });
  },
}));

const ITEM: BaseItemDto = { Id: "movie-1", Type: "Movie" };

describe("ItemActionSheetHost", () => {
  beforeEach(() => mockShowActionSheet.mockClear());

  test("presents once and reports the close", async () => {
    const onClose = jest.fn();
    await render(<ItemActionSheetHost item={ITEM} onClose={onClose} />);
    expect(mockShowActionSheet).toHaveBeenCalledTimes(1);

    await act(async () => closeSheet());
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // The favorite state settling while the sheet was up re-ran the effect,
  // whose cleanup marked the open sheet cancelled: closing it never called
  // onClose, the host stayed mounted, and the next long press on the same
  // poster showed nothing.
  test("reports the close when the sheet's callback changed while it was open", async () => {
    const onClose = jest.fn();
    const view = await render(
      <ItemActionSheetHost item={ITEM} onClose={onClose} />,
    );
    await view.rerender(<ItemActionSheetHost item={ITEM} onClose={onClose} />);
    expect(mockShowActionSheet).toHaveBeenCalledTimes(1);

    await act(async () => closeSheet());
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("does not report a close after it unmounted", async () => {
    const onClose = jest.fn();
    const view = await render(
      <ItemActionSheetHost item={ITEM} onClose={onClose} />,
    );
    await view.unmount();

    await act(async () => closeSheet());
    expect(onClose).not.toHaveBeenCalled();
  });
});
