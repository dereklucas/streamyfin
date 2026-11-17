import { Platform, View } from "react-native";
import { Text } from "@/components/common/Text";
import {
  CONTEXT_MENU_PREVIEW_PAD_SCALE,
  CONTEXT_MENU_PREVIEW_WIDTH,
} from "@/constants/Values";
import { CardArtwork } from "./CardArtwork";
import { CARD_LAYOUTS, type CardData, type CardKind } from "./CardData";

type Props = {
  card: CardData;
  kind: CardKind;
};

/**
 * What a poster's native context menu lifts above its actions: the artwork,
 * larger, with the title and the lines under it, as Music's album card. It
 * draws the card's own image URL, already loaded for the poster, so the
 * preview fetches nothing.
 */
export const CardMenuPreview: React.FC<Props> = ({ card, kind }) => {
  const layout = CARD_LAYOUTS[kind];
  const aspectRatio = card.aspectRatio ?? layout.aspectRatio;
  const scale =
    Platform.OS === "ios" && Platform.isPad
      ? CONTEXT_MENU_PREVIEW_PAD_SCALE
      : 1;
  const width =
    (aspectRatio < 1
      ? CONTEXT_MENU_PREVIEW_WIDTH.tall
      : CONTEXT_MENU_PREVIEW_WIDTH.wide) * scale;

  return (
    <View style={{ width, backgroundColor: "#1c1c1e" }}>
      <CardArtwork
        card={card}
        width={width}
        height={width / aspectRatio}
        cornerRadius={0}
      />
      <View style={{ paddingHorizontal: 14, paddingVertical: 12 }}>
        <Text numberOfLines={2} style={{ fontSize: 17, fontWeight: "600" }}>
          {card.title}
        </Text>
        {Boolean(card.subtitle) && (
          <Text
            numberOfLines={1}
            style={{
              fontSize: 14,
              color: "rgba(255,255,255,0.7)",
              marginTop: 2,
            }}
          >
            {card.subtitle}
          </Text>
        )}
        {Boolean(card.detail) && (
          <Text
            numberOfLines={1}
            style={{
              fontSize: 13,
              color: "rgba(255,255,255,0.5)",
              marginTop: 2,
            }}
          >
            {card.detail}
          </Text>
        )}
      </View>
    </View>
  );
};
