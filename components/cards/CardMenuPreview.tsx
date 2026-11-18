import { useTranslation } from "react-i18next";
import { Platform, View } from "react-native";
import { Text } from "@/components/common/Text";
import {
  CONTEXT_MENU_PREVIEW_PAD_SCALE,
  CONTEXT_MENU_PREVIEW_WIDTH,
} from "@/constants/Values";
import { CardArtwork } from "./CardArtwork";
import { CARD_LAYOUTS, type CardData, type CardKind } from "./CardData";
import type { CardPreview } from "./cardPreview";

const OVERVIEW_LINES = 3;
const TITLE_STYLE = { fontSize: 17, fontWeight: "600" } as const;
const LINE_STYLE = {
  fontSize: 14,
  color: "rgba(255,255,255,0.7)",
  marginTop: 2,
} as const;
const MUTED_STYLE = {
  fontSize: 13,
  color: "rgba(255,255,255,0.5)",
  marginTop: 2,
} as const;
const HEADING_STYLE = {
  fontSize: 13,
  fontWeight: "600",
  color: "rgba(255,255,255,0.6)",
  marginBottom: 2,
} as const;

const joined = (...parts: (string | number | null | undefined | false)[]) =>
  parts.filter((part) => part || part === 0).join(" · ");

/** The lines under the artwork, by what the item is. */
const PreviewText: React.FC<{ preview: CardPreview }> = ({ preview }) => {
  const { t } = useTranslation();
  if (preview.kind === "poster") {
    if (preview.minutesLeft === undefined) return null;
    return (
      <View style={{ paddingHorizontal: 14, paddingVertical: 10 }}>
        <Text numberOfLines={1} style={LINE_STYLE}>
          {t("item_card.preview.minutes_left", { count: preview.minutesLeft })}
        </Text>
      </View>
    );
  }

  if (preview.kind === "episode") {
    const state =
      preview.minutesLeft !== undefined
        ? t("item_card.preview.minutes_left", { count: preview.minutesLeft })
        : preview.watched
          ? t("item_card.preview.watched")
          : null;
    const aired = preview.premiereDate
      ? new Date(preview.premiereDate).toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : null;
    const details = joined(
      state,
      preview.runtimeMinutes !== undefined &&
        t("item_card.preview.runtime", { count: preview.runtimeMinutes }),
      aired,
    );
    return (
      <View style={{ paddingHorizontal: 14, paddingVertical: 12 }}>
        {Boolean(preview.heading) && (
          <Text numberOfLines={1} style={HEADING_STYLE}>
            {preview.heading}
          </Text>
        )}
        <Text numberOfLines={2} style={TITLE_STYLE}>
          {joined(preview.episodeNumber, preview.title)}
        </Text>
        {Boolean(details) && (
          <Text numberOfLines={1} style={LINE_STYLE}>
            {details}
          </Text>
        )}
        {Boolean(preview.overview) && (
          <Text
            numberOfLines={OVERVIEW_LINES}
            style={{ ...MUTED_STYLE, marginTop: 6 }}
          >
            {preview.overview}
          </Text>
        )}
      </View>
    );
  }

  const left =
    preview.unwatched > 0
      ? t("item_card.preview.unwatched", { count: preview.unwatched })
      : t("item_card.preview.watched");
  return (
    <View style={{ paddingHorizontal: 14, paddingVertical: 12 }}>
      {Boolean(preview.heading) && (
        <Text numberOfLines={1} style={HEADING_STYLE}>
          {preview.heading}
        </Text>
      )}
      <Text numberOfLines={2} style={TITLE_STYLE}>
        {preview.title}
      </Text>
      <Text numberOfLines={1} style={LINE_STYLE}>
        {joined(preview.year, left)}
      </Text>
    </View>
  );
};

type Props = {
  card: CardData;
  kind: CardKind;
};

/**
 * What a poster's native context menu lifts above its actions: the artwork,
 * larger, with what the item is under it (see cardPreview.ts): a movie is
 * its poster, an episode says which show and where, a show what is left.
 * Anything else repeats the card's lines, as Music's album card. It draws the
 * card's own image URL, already loaded for the poster, so the preview fetches
 * nothing.
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
      {card.preview ? (
        <PreviewText preview={card.preview} />
      ) : (
        <View style={{ paddingHorizontal: 14, paddingVertical: 12 }}>
          <Text numberOfLines={2} style={TITLE_STYLE}>
            {card.title}
          </Text>
          {Boolean(card.subtitle) && (
            <Text numberOfLines={1} style={LINE_STYLE}>
              {card.subtitle}
            </Text>
          )}
          {Boolean(card.detail) && (
            <Text numberOfLines={1} style={MUTED_STYLE}>
              {card.detail}
            </Text>
          )}
        </View>
      )}
    </View>
  );
};
