import { useWindowDimensions, View } from "react-native";
import { CARD_LAYOUTS, type CardKind, cardRowHeight } from "./CardData";

export const CARD_PLACEHOLDER_COLOR = "#171717";

/**
 * A row of cards still loading, in the loaded row's geometry: the same
 * height (footer included), insets and spacing, and as many cards as fill
 * the window, so nothing moves when the cards arrive.
 */
export const CardRowSkeleton: React.FC<{
  kind: CardKind;
  /** The loaded row's `footerHeight`: text below the art, a footer slot. */
  footerHeight?: number;
}> = ({ kind, footerHeight = 0 }) => {
  const layout = CARD_LAYOUTS[kind];
  const { width: windowWidth } = useWindowDimensions();
  const count = Math.max(
    1,
    Math.ceil(
      (windowWidth - layout.contentInset) / (layout.cardWidth + layout.spacing),
    ),
  );

  return (
    <View
      testID='card-row-skeleton'
      style={{
        height: cardRowHeight(kind) + footerHeight,
        flexDirection: "row",
        gap: layout.spacing,
        paddingHorizontal: layout.contentInset,
        paddingVertical: layout.verticalPadding,
        overflow: "hidden",
      }}
    >
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          testID='card-skeleton'
          style={{
            width: layout.cardWidth,
            height: layout.cardWidth / layout.aspectRatio,
            borderRadius: layout.cornerRadius,
            backgroundColor: CARD_PLACEHOLDER_COLOR,
          }}
        />
      ))}
    </View>
  );
};
