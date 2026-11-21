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

describe("CardListRow", () => {
  const originalOS = Platform.OS;
  afterEach(() => {
    Platform.OS = originalOS;
  });

  // A row's height follows its text. Moved into the native menu's SwiftUI
  // host it lost its width (a long title ran the row off the screen) and,
  // in a scrolling list, its place (rows collapsed onto each other). A row
  // stays plain React Native, on iPhone and iPad too.
  test("stays plain React Native, with no native menu, on iOS", async () => {
    Platform.OS = "ios";
    await render(<CardListRow card={CARD} onPress={() => {}} />);

    expect(screen.getByText(CARD.title)).toBeTruthy();
    expect(screen.queryByTestId("swiftui-context-menu")).toBeNull();
  });

  test("opens on a tap and offers its actions on a long press", async () => {
    const onPress = jest.fn();
    const onLongPress = jest.fn();
    await render(
      <CardListRow card={CARD} onPress={onPress} onLongPress={onLongPress} />,
    );

    await fireEvent.press(screen.getByText(CARD.title));
    await fireEvent(screen.getByText(CARD.title), "longPress");

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onLongPress).toHaveBeenCalledTimes(1);
  });
});
