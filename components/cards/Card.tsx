import { LinearGradient } from "expo-linear-gradient";
import { type Href, Link } from "expo-router";
import isEqual from "lodash/isEqual";
import { memo, useCallback } from "react";
import { TouchableOpacity, View } from "react-native";
import {
  NativeContextMenu,
  type NativeContextMenuAction,
} from "@/components/common/NativeContextMenu";
import { Text } from "@/components/common/Text";
import { Colors } from "@/constants/Colors";
import { CONTEXT_MENU_LONG_PRESS_GUARD_MS } from "@/constants/Values";
import { writeInfoLog } from "@/utils/log";
import { CardArtwork } from "./CardArtwork";
import {
  CARD_LAYOUTS,
  type CardData,
  type CardKind,
  type CardSlots,
} from "./CardData";
import { CardMenuPreview } from "./CardMenuPreview";

type CardProps = {
  card: CardData;
  kind: CardKind;
  /** Overrides the kind's card width — a grid sizes cards by its columns. */
  width?: number;
  /**
   * Where the title goes. "over" is the poster card: text on the artwork
   * behind a frosted band. "below" leaves the artwork clean and stacks the
   * text underneath, for rows that carry more than two lines.
   */
  textPlacement?: "over" | "below";
  slots?: Pick<CardSlots, "overlay" | "footer">;
  onPress: (id: string) => void;
  onLongPress?: (id: string) => void;
  /** The native context menu's actions (iPhone and iPad), in place of a long press. */
  menuActions?: NativeContextMenuAction[];
  onMenuAction?: (id: string, key: string) => void;
  /**
   * The page this poster zooms into (iOS 18's zoom transition): the card
   * opens through an expo-router Link, its artwork the zoom's source.
   */
  zoomHref?: Href;
};

/**
 * A media card: artwork edge to edge, the title and subtitle over a frosted
 * band at the bottom, and the progress bar under them but still on the card.
 * Everything it draws comes from `CardData` — see `buildItemCards`.
 */
let loggedZoomLink = false;

const CardComponent: React.FC<CardProps> = ({
  card,
  kind,
  width,
  textPlacement = "over",
  slots,
  onPress,
  onLongPress,
  menuActions,
  onMenuAction,
  zoomHref,
}) => {
  const layout = CARD_LAYOUTS[kind];
  const cardWidth = width ?? layout.cardWidth;
  const height = cardWidth / (card.aspectRatio ?? layout.aspectRatio);
  const progress = Math.min(Math.max(card.progress ?? 0, 0), 1);
  const isOver = textPlacement === "over";

  const handlePress = useCallback(() => {
    onPress(card.id);
  }, [onPress, card.id]);

  const handleLongPress = useCallback(() => {
    onLongPress?.(card.id);
  }, [onLongPress, card.id]);

  const handleMenuAction = useCallback(
    (key: string) => onMenuAction?.(card.id, key),
    [onMenuAction, card.id],
  );

  const hasMenu = Boolean(menuActions?.length);

  const progressBar = progress > 0 && (
    <View
      style={{
        height: 3,
        borderRadius: 2,
        marginTop: 5,
        backgroundColor: "rgba(255,255,255,0.25)",
      }}
    >
      <View
        style={{
          height: 3,
          borderRadius: 2,
          width: `${progress * 100}%`,
          backgroundColor: Colors.primary,
        }}
      />
    </View>
  );

  // TEMPORARY (feat/zoom-transition): that posters get their zoom link.
  if (zoomHref && !loggedZoomLink) {
    loggedZoomLink = true;
    writeInfoLog("Zoom: poster has a zoom link", { href: zoomHref });
  }

  // With a zoom link, the touchable is the Link's pressable and the artwork
  // block (with its frosted title, when over) is what zooms into the page.
  const zoomable = (touchable: React.ReactElement) =>
    zoomHref ? (
      <Link href={zoomHref} asChild>
        {touchable}
      </Link>
    ) : (
      touchable
    );
  const zoomSource = (artwork: React.ReactElement) =>
    zoomHref ? <Link.AppleZoom>{artwork}</Link.AppleZoom> : artwork;

  return (
    <NativeContextMenu
      actions={menuActions ?? []}
      onAction={handleMenuAction}
      onPreviewPress={handlePress}
      preview={
        hasMenu ? <CardMenuPreview card={card} kind={kind} /> : undefined
      }
    >
      {zoomable(
        <TouchableOpacity
          // Through a Link, the Link opens the page (with the zoom) instead.
          onPress={zoomHref ? undefined : handlePress}
          {...longPressFor(onLongPress ? handleLongPress : undefined, hasMenu)}
          style={{ width: cardWidth, opacity: card.dimmed ? 0.5 : 1 }}
        >
          {zoomSource(
            <View>
              <CardArtwork
                card={card}
                width={cardWidth}
                height={height}
                cornerRadius={layout.cornerRadius}
                overlay={slots?.overlay?.(card)}
              />

              {isOver && (
                <>
                  {/* Frosted band, faded in from nothing so the text stays readable. */}
                  <LinearGradient
                    colors={["transparent", "rgba(0,0,0,0.85)"]}
                    pointerEvents='none'
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      bottom: 0,
                      height: height * layout.frostFraction,
                      borderBottomLeftRadius: layout.cornerRadius,
                      borderBottomRightRadius: layout.cornerRadius,
                    }}
                  />
                  <View
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      bottom: 0,
                      paddingHorizontal: 10,
                      paddingBottom: 9,
                    }}
                  >
                    <Text
                      numberOfLines={1}
                      style={{ fontSize: 13, fontWeight: "600" }}
                    >
                      {card.title}
                    </Text>
                    {Boolean(card.subtitle) && (
                      <Text
                        numberOfLines={1}
                        style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}
                      >
                        {card.subtitle}
                      </Text>
                    )}
                    {progressBar}
                  </View>
                </>
              )}
            </View>,
          )}

          {!isOver && (
            <View style={{ paddingTop: 6 }}>
              {progressBar}
              <Text
                numberOfLines={2}
                style={{ fontSize: 13, fontWeight: "600", marginTop: 2 }}
              >
                {card.title}
              </Text>
              {Boolean(card.subtitle) && (
                <Text
                  numberOfLines={1}
                  style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}
                >
                  {card.subtitle}
                </Text>
              )}
              {Boolean(card.detail) && (
                <Text
                  numberOfLines={1}
                  style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}
                >
                  {card.detail}
                </Text>
              )}
            </View>
          )}

          {slots?.footer?.(card)}
        </TouchableOpacity>,
      )}
    </NativeContextMenu>
  );
};

// Taken so the press stops being a tap; the native menu does the rest.
const ignoreLongPress = () => {};

/**
 * The long press of something that may carry a native context menu. With one,
 * a hold past the guard is a long press: React Native never sends a press
 * after a long press, so a finger lifted while the system menu comes up does
 * not open what is under it. Spec: components/cards/Card.test.tsx.
 */
export const longPressFor = (
  onLongPress: (() => void) | undefined,
  hasMenu: boolean,
) => ({
  onLongPress: onLongPress ?? (hasMenu ? ignoreLongPress : undefined),
  delayLongPress: hasMenu ? CONTEXT_MENU_LONG_PRESS_GUARD_MS : undefined,
});

export const Card = memo(CardComponent, isEqual);
