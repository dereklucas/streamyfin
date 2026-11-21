import {
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react-native";
import { Platform, Text } from "react-native";
import { swiftUiHostProps, swiftUiRNHostViewProps } from "@/test-utils/swiftUi";
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
    expect(screen.getByTestId("swiftui-context-menu")).toBeTruthy();
    await fireEvent.press(screen.getByText("Delete"));
    expect(onAction).toHaveBeenCalledWith("delete");
  });

  // A poster has its own size, so the menu takes it. A list row's width comes
  // from the screen: sized to its content instead, a long title stays on one
  // line and pushes whatever hangs off the row's end out of the screen.
  test("sizes to a poster's own width and height", async () => {
    Platform.OS = "ios";
    swiftUiHostProps.mockClear();
    swiftUiRNHostViewProps.mockClear();
    await render(
      <NativeContextMenu actions={ACTIONS} onAction={() => {}}>
        <Text>Poster</Text>
      </NativeContextMenu>,
    );

    expect(swiftUiHostProps.mock.calls[0][0].matchContents).toBe(true);
    expect(swiftUiRNHostViewProps.mock.calls[0][0].matchContents).toBe(true);
  });

  // Width from the layout and height from the content is a separate native
  // sizing path, the likely cause of the season's rows collapsing onto each
  // other as the page scrolled. Filling the width measures it instead, and sizes the
  // content to it on both axes, as a poster is.
  test("measures the width it is given and sizes the content to it", async () => {
    Platform.OS = "ios";
    swiftUiHostProps.mockClear();
    swiftUiRNHostViewProps.mockClear();
    await render(
      <NativeContextMenu actions={ACTIONS} onAction={() => {}} fillWidth>
        <Text>Row</Text>
      </NativeContextMenu>,
    );

    // Until the width is known, the content lays out on its own.
    expect(screen.getByText("Row")).toBeTruthy();
    expect(screen.queryByTestId("swiftui-context-menu")).toBeNull();

    await fireEvent(screen.getByTestId("context-menu-measure"), "layout", {
      nativeEvent: { layout: { x: 0, y: 0, width: 320, height: 100 } },
    });

    expect(screen.getByTestId("swiftui-context-menu")).toBeTruthy();
    expect(swiftUiHostProps.mock.calls.at(-1)?.[0].matchContents).toBe(true);
    expect(swiftUiRNHostViewProps.mock.calls.at(-1)?.[0].matchContents).toBe(
      true,
    );
    expect(screen.getByTestId("context-menu-content")).toHaveStyle({
      width: 320,
    });
  });

  test("renders only the content where there is no native menu", async () => {
    Platform.OS = "android";
    await render(
      <NativeContextMenu actions={ACTIONS} onAction={() => {}}>
        <Text>Poster</Text>
      </NativeContextMenu>,
    );

    expect(screen.getByText("Poster")).toBeTruthy();
    expect(screen.queryByTestId("swiftui-context-menu")).toBeNull();
    expect(screen.queryByText("Delete")).toBeNull();
  });

  test("renders only the content when there are no actions", async () => {
    Platform.OS = "ios";
    await render(
      <NativeContextMenu actions={[]} onAction={() => {}}>
        <Text>Poster</Text>
      </NativeContextMenu>,
    );

    expect(screen.queryByTestId("swiftui-context-menu")).toBeNull();
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
          {
            key: "shuffle",
            label: "Shuffle",
            systemImage: "shuffle",
            group: "primary",
          },
        ]}
        onAction={() => {}}
      >
        <Text>Poster</Text>
      </NativeContextMenu>,
    );

    const row = screen.getByTestId("swiftui-control-group");
    expect(within(row).getByText("Favorite")).toBeTruthy();
    expect(screen.queryByText("Add to favorites")).toBeNull();
    const rows = screen
      .getAllByRole("menuitem")
      .map((row) => row.props.children);
    expect(rows).toEqual(["Favorite", "Shuffle", "Delete download"]);
    expect(screen.getByTestId("swiftui-divider")).toBeTruthy();
  });

  test("shows the preview it is given", async () => {
    Platform.OS = "ios";
    await render(
      <NativeContextMenu
        actions={ACTIONS}
        onAction={() => {}}
        preview={<Text>Big poster</Text>}
      >
        <Text>Poster</Text>
      </NativeContextMenu>,
    );

    expect(screen.getByText("Big poster")).toBeTruthy();
  });

  test("puts navigation in its own section between the list and the destructive end", async () => {
    Platform.OS = "ios";
    await render(
      <NativeContextMenu
        actions={[
          { key: "play", label: "Play", group: "primary" },
          { key: "goToSeries", label: "Go to show", group: "nav" },
          {
            key: "delete",
            label: "Delete download",
            destructive: true,
            group: "destructive",
          },
        ]}
        onAction={() => {}}
      >
        <Text>Poster</Text>
      </NativeContextMenu>,
    );

    expect(
      screen.getAllByRole("menuitem").map((row) => row.props.children),
    ).toEqual(["Play", "Go to show", "Delete download"]);
    expect(screen.getAllByTestId("swiftui-divider")).toHaveLength(2);
  });
});
