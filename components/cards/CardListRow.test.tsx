import { fireEvent, render, screen } from "@testing-library/react-native";
import { Platform } from "react-native";
import type { CardData } from "./CardData";
import { CardListRow } from "./CardListRow";

// The artwork pulls in the image stack; what is under test is the row.
jest.mock("./CardArtwork", () => ({ CardArtwork: () => null }));

const CARD: CardData = {
  id: "e1",
  title: "A very long episode title that is wider than the screen",
};
const MENU = [
  { key: "played", label: "Mark as played", systemImage: "checkmark.circle" },
];

describe("CardListRow with a native context menu", () => {
  const originalOS = Platform.OS;
  afterEach(() => {
    Platform.OS = originalOS;
  });

  test("offers the item's actions in the native menu", async () => {
    Platform.OS = "ios";
    const onMenuAction = jest.fn();
    await render(
      <CardListRow
        card={CARD}
        onPress={() => {}}
        menuActions={MENU}
        onMenuAction={onMenuAction}
      />,
    );

    expect(screen.getByTestId("native-context-menu")).toBeTruthy();
    await fireEvent.press(screen.getByText("Mark as played"));
    expect(onMenuAction).toHaveBeenCalledWith("played");
  });

  test("opens the episode on a tap of the lifted row", async () => {
    Platform.OS = "ios";
    const onPress = jest.fn();
    await render(
      <CardListRow
        card={CARD}
        onPress={onPress}
        menuActions={MENU}
        onMenuAction={() => {}}
      />,
    );

    await fireEvent.press(
      screen.getByTestId("native-context-menu-preview-tap"),
    );

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
