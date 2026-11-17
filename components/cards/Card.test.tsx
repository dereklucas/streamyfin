import { fireEvent, render, screen } from "@testing-library/react-native";
import { Platform } from "react-native";
import { Card, longPressFor } from "./Card";
import type { CardData } from "./CardData";

// The artwork pulls in the image stack; what is under test is the press.
jest.mock("./CardArtwork", () => ({ CardArtwork: () => null }));

const CARD: CardData = { id: "m1", title: "Movie One", subtitle: "2024" };
const MENU = [
  { key: "played", label: "Mark as played", systemImage: "checkmark.circle" },
];

describe("Card with a native context menu", () => {
  const originalOS = Platform.OS;
  afterEach(() => {
    Platform.OS = originalOS;
  });

  test("still opens the item on a tap", async () => {
    Platform.OS = "ios";
    const onPress = jest.fn();
    await render(
      <Card
        card={CARD}
        kind='portrait'
        onPress={onPress}
        menuActions={MENU}
        onMenuAction={() => {}}
      />,
    );

    await fireEvent.press(screen.getAllByText("Movie One")[0]);

    expect(onPress).toHaveBeenCalledWith("m1");
  });

  test("previews the poster larger, with its title, above the menu", async () => {
    Platform.OS = "ios";
    await render(
      <Card
        card={CARD}
        kind='portrait'
        onPress={() => {}}
        menuActions={MENU}
        onMenuAction={() => {}}
      />,
    );

    // The card's own title, and the preview's.
    expect(screen.getAllByText("Movie One")).toHaveLength(2);
    expect(screen.getAllByText("2024")).toHaveLength(2);
  });
});

describe("longPressFor", () => {
  // iOS lifts the poster at the haptic and shows the menu a moment later. A
  // finger lifted in between was a tap to the poster, which opened the item
  // under the menu. React Native never sends a press after a long press, so
  // with a menu the poster takes a long press of its own, ahead of the
  // system's (about 500 ms).
  test("takes a long press ahead of the system menu when there is one", () => {
    const { onLongPress, delayLongPress } = longPressFor(undefined, true);

    expect(onLongPress).toEqual(expect.any(Function));
    expect(delayLongPress).toBeLessThan(500);
  });

  test("keeps the caller's long press, and its timing, without a menu", () => {
    const handler = () => {};

    expect(longPressFor(handler, false)).toEqual({
      onLongPress: handler,
      delayLongPress: undefined,
    });
    expect(longPressFor(undefined, false)).toEqual({
      onLongPress: undefined,
      delayLongPress: undefined,
    });
  });
});
