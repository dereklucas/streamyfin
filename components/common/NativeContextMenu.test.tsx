import {
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react-native";
import { Platform, Text } from "react-native";
import { itemContextMenuProps } from "@/test-utils/itemContextMenu";
import { NativeContextMenu } from "./NativeContextMenu";

const ACTIONS = [
  { key: "played", label: "Mark as played", systemImage: "checkmark.circle" },
  {
    key: "delete",
    label: "Delete",
    systemImage: "trash",
    destructive: true,
  },
];

describe("NativeContextMenu", () => {
  const originalOS = Platform.OS;
  afterEach(() => {
    Platform.OS = originalOS;
  });

  test("wraps the content in a native context menu on iOS", async () => {
    Platform.OS = "ios";
    const onAction = jest.fn();
    await render(
      <NativeContextMenu actions={ACTIONS} onAction={onAction}>
        <Text>Poster</Text>
      </NativeContextMenu>,
    );

    expect(screen.getByText("Poster")).toBeTruthy();
    expect(screen.getByTestId("native-context-menu")).toBeTruthy();
    await fireEvent.press(screen.getByText("Delete"));
    expect(onAction).toHaveBeenCalledWith("delete");
  });

  test("renders only the content where there is no native menu", async () => {
    Platform.OS = "android";
    await render(
      <NativeContextMenu actions={ACTIONS} onAction={() => {}}>
        <Text>Poster</Text>
      </NativeContextMenu>,
    );

    expect(screen.getByText("Poster")).toBeTruthy();
    expect(screen.queryByTestId("native-context-menu")).toBeNull();
    expect(screen.queryByText("Delete")).toBeNull();
  });

  test("renders only the content when there are no actions", async () => {
    Platform.OS = "ios";
    await render(
      <NativeContextMenu actions={[]} onAction={() => {}}>
        <Text>Poster</Text>
      </NativeContextMenu>,
    );

    expect(screen.queryByTestId("native-context-menu")).toBeNull();
  });

  test("puts quick actions in the icon row with their short labels, and destructive ones last", async () => {
    Platform.OS = "ios";
    await render(
      <NativeContextMenu
        actions={[
          {
            key: "delete",
            label: "Delete download",
            systemImage: "trash",
            destructive: true,
            group: "destructive",
          },
          {
            key: "favorite",
            label: "Add to favorites",
            shortLabel: "Favorite",
            systemImage: "heart",
            group: "quick",
          },
          { key: "shuffle", label: "Shuffle", systemImage: "shuffle" },
        ]}
        onAction={() => {}}
      >
        <Text>Poster</Text>
      </NativeContextMenu>,
    );

    const row = screen.getByTestId("native-context-menu-section-quick");
    expect(within(row).getByText("Favorite")).toBeTruthy();
    expect(screen.queryByText("Add to favorites")).toBeNull();
    expect(
      screen.getAllByRole("menuitem").map((item) => item.props.children),
    ).toEqual(["Favorite", "Shuffle", "Delete download"]);
  });

  // The menu is the system's own, attached to the content where it is laid
  // out. Before, the content was moved into a SwiftUI host that sized to it:
  // a list row, whose height follows its text, ran off the screen and, in a
  // scrolling list, collapsed onto the rows around it.
  test("keeps the content in its own layout, as the view's first child", async () => {
    Platform.OS = "ios";
    itemContextMenuProps.mockClear();
    await render(
      <NativeContextMenu actions={ACTIONS} onAction={() => {}}>
        <Text>Row</Text>
      </NativeContextMenu>,
    );

    const props = itemContextMenuProps.mock.calls.at(-1)?.[0];
    expect(props.hasPreview).toBe(false);
    expect(props.style).toBeUndefined();
  });

  // The preview is drawn off screen, and the native view shows a picture of
  // it above the menu: moving it would put it back in a SwiftUI host.
  test("draws the preview it is given off screen, hidden from VoiceOver", async () => {
    Platform.OS = "ios";
    itemContextMenuProps.mockClear();
    await render(
      <NativeContextMenu
        actions={ACTIONS}
        onAction={() => {}}
        preview={<Text>Big poster</Text>}
      >
        <Text>Poster</Text>
      </NativeContextMenu>,
    );

    expect(itemContextMenuProps.mock.calls.at(-1)?.[0].hasPreview).toBe(true);
    // Hidden from VoiceOver, so the query has to ask for hidden elements.
    const preview = screen.getByTestId("context-menu-preview", {
      includeHiddenElements: true,
    });
    expect(preview.props.importantForAccessibility).toBe("no-hide-descendants");
    expect(preview.props.accessibilityElementsHidden).toBe(true);
    expect(preview.props.collapsable).toBe(false);
    expect(preview).toHaveStyle({ position: "absolute" });
    expect(
      within(preview).getByText("Big poster", { includeHiddenElements: true }),
    ).toBeTruthy();
  });

  // A tap on the lifted poster opens it, as in Photos and Music.
  test("tells a tap on the lifted preview", async () => {
    Platform.OS = "ios";
    const onPreviewPress = jest.fn();
    await render(
      <NativeContextMenu
        actions={ACTIONS}
        onAction={() => {}}
        onPreviewPress={onPreviewPress}
      >
        <Text>Poster</Text>
      </NativeContextMenu>,
    );

    await fireEvent.press(
      screen.getByTestId("native-context-menu-preview-tap"),
    );

    expect(onPreviewPress).toHaveBeenCalledTimes(1);
  });
});
