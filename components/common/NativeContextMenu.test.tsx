import {
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react-native";
import { Platform, Text } from "react-native";
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
});
