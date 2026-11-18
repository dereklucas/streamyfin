import { render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { CARD_LAYOUTS, cardRowHeight } from "./CardData";
import { CardRowSkeleton } from "./CardRowSkeleton";

const mockWindow = { width: 390, height: 844, scale: 2, fontScale: 1 };
jest.mock("react-native/Libraries/Utilities/useWindowDimensions", () => ({
  __esModule: true,
  default: () => mockWindow,
}));

const rootStyle = () =>
  StyleSheet.flatten(screen.getByTestId("card-row-skeleton").props.style);

describe("CardRowSkeleton", () => {
  // The loaded row reserves its cards' height plus the footer; the skeleton
  // reserved the artwork alone, so rows with text below the art grew.
  test("takes the height the loaded row takes, footer included", async () => {
    await render(<CardRowSkeleton kind='wide' footerHeight={40} />);

    expect(rootStyle().height).toBe(cardRowHeight("wide") + 40);
  });

  // Three cards left most of an iPad row empty until the row loaded.
  test("fills the window's width with cards", async () => {
    mockWindow.width = 1366;
    await render(<CardRowSkeleton kind='portrait' />);

    const { cardWidth, spacing, contentInset } = CARD_LAYOUTS.portrait;
    const visible = Math.ceil((1366 - contentInset) / (cardWidth + spacing));
    expect(screen.getAllByTestId("card-skeleton")).toHaveLength(visible);
    mockWindow.width = 390;
  });
});
