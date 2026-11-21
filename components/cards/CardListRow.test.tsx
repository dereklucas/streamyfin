import { render } from "@testing-library/react-native";
import { Platform } from "react-native";
import { swiftUiHostProps, swiftUiRNHostViewProps } from "@/test-utils/swiftUi";
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
    swiftUiHostProps.mockClear();
    swiftUiRNHostViewProps.mockClear();
    await render(
      <CardListRow
        card={CARD}
        onPress={() => {}}
        menuActions={MENU}
        onMenuAction={() => {}}
      />,
    );

    expect(swiftUiHostProps.mock.calls[0][0].matchContents).toEqual({
      vertical: true,
    });
    expect(swiftUiRNHostViewProps.mock.calls[0][0].matchContents).toEqual({
      vertical: true,
    });
  });
});
