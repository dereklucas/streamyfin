import { fireEvent, render, screen } from "@testing-library/react-native";
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
});
