import { fireEvent, render, screen } from "@testing-library/react-native";
import { Platform } from "react-native";
import type { CardData } from "./CardData";
import { CardListRow } from "./CardListRow";

// The artwork pulls in the image stack; what is under test is the layout.
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

  // The season's episode rows: sized to their content, a long title kept the
  // row as wide as the title, and the download button went off the screen.
  test("spans the width it is given, so its title wraps", async () => {
    Platform.OS = "ios";
    await render(
      <CardListRow
        card={CARD}
        onPress={() => {}}
        menuActions={MENU}
        onMenuAction={() => {}}
      />,
    );

    await fireEvent(screen.getByTestId("context-menu-measure"), "layout", {
      nativeEvent: { layout: { x: 0, y: 0, width: 343, height: 90 } },
    });

    expect(screen.getByTestId("context-menu-content")).toHaveStyle({
      width: 343,
    });
  });
});
