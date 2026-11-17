import type { BaseItemDto } from "@jellyfin/sdk/lib/generated-client/models";
import { useSegments } from "expo-router";
import { useAtomValue } from "jotai";
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ItemActionSheetHost } from "@/components/common/ItemActionSheetHost";
import { hasNativeContextMenu } from "@/components/common/NativeContextMenu";
import {
  getItemNavigation,
  itemRouter,
} from "@/components/common/TouchableItemRouter";
import useRouter from "@/hooks/useAppRouter";
import { useItemMenus } from "@/hooks/useItemMenus";
import { apiAtom } from "@/providers/JellyfinProvider";
import { buildItemCards, type CardData, type CardKind } from "./CardData";

type Options = {
  /** Media items — cards are built here, and presses navigate. */
  items?: BaseItemDto[];
  /** Prebuilt cards, for anything that isn't a `BaseItemDto`. */
  cards?: CardData[];
  kind: CardKind;
  /** Width the cards are drawn at, when it isn't the kind's own (items mode). */
  cardWidth?: number;
  useEpisodePoster?: boolean;
  /** Show a TV child's series name before its own name. */
  showParentTitle?: boolean;
  selectedId?: string | null;
  /** Replaces the default navigation (items mode). */
  onPressItem?: (item: BaseItemDto) => void;
  /** Press handler for `cards` mode. */
  onPressId?: (id: string) => void;
  /** Replaces the long-press action sheet (items mode). */
  onLongPressItem?: (item: BaseItemDto) => void;
  /** Long-press handler for `cards` mode. */
  onLongPressId?: (id: string) => void;
  /**
   * Long press offers the item's actions (items mode): the native context menu
   * on iPhone and iPad, the action sheet elsewhere. Default: off.
   */
  enableActionSheet?: boolean;
};

/**
 * Everything a container of cards needs besides its layout: the cards
 * themselves, what a press means, and the long-press action sheet. Kept apart
 * from `CardRow` so another arrangement of the same cards gets all of it free.
 */
export function useItemCardBehavior({
  items,
  cards: providedCards,
  kind,
  cardWidth,
  useEpisodePoster = false,
  showParentTitle = false,
  selectedId,
  onPressItem,
  onPressId,
  onLongPressItem,
  onLongPressId,
  enableActionSheet = false,
}: Options) {
  const api = useAtomValue(apiAtom);
  const { menuActionsFor, handleMenuAction, runner } = useItemMenus(items);
  const router = useRouter();
  const segments = useSegments();
  // Each long press is its own request, so a press always mounts a new host.
  // Keyed by the item alone, a host that missed its close (ItemActionSheetHost
  // once did, when the item's favorite state settled with the sheet up) stayed
  // mounted, and a second long press on the same poster showed nothing.
  const [actionSheetRequest, setActionSheetRequest] = useState<{
    item: BaseItemDto;
    id: number;
  } | null>(null);

  const from = (segments as string[])[2] || "(home)";

  // Read through a ref so a paged list growing `items` does not hand every
  // memoized Card a new press handler.
  const itemsRef = useRef(items);
  useLayoutEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const cards = useMemo(
    () =>
      providedCards ??
      buildItemCards(items ?? [], {
        api,
        kind,
        cardWidth,
        useEpisodePoster,
        showParentTitle,
        selectedId,
      }),
    [
      providedCards,
      items,
      api,
      kind,
      cardWidth,
      useEpisodePoster,
      showParentTitle,
      selectedId,
    ],
  );

  const handlePress = useCallback(
    (id: string) => {
      if (onPressId) {
        onPressId(id);
        return;
      }

      const item = itemsRef.current?.find((i) => i.Id === id);
      if (!item) return;

      if (onPressItem) {
        onPressItem(item);
        return;
      }

      // Music libraries navigate via the explicit string route so the dynamic
      // [libraryId] param survives the nested navigator.
      if ("CollectionType" in item && item.CollectionType === "music") {
        router.push(itemRouter(item, from) as any);
        return;
      }

      router.push(getItemNavigation(item, from) as any);
    },
    [from, onPressId, onPressItem, router],
  );

  const handleLongPress = useCallback(
    (id: string) => {
      if (onLongPressId) {
        onLongPressId(id);
        return;
      }

      const item = itemsRef.current?.find((i) => i.Id === id);
      if (!item) return;

      if (onLongPressItem) {
        onLongPressItem(item);
        return;
      }

      setActionSheetRequest((prev) => ({ item, id: (prev?.id ?? 0) + 1 }));
    },
    [onLongPressId, onLongPressItem],
  );

  const closeActionSheet = useCallback(() => setActionSheetRequest(null), []);

  // The native context menu replaces the sheet where there is one, unless the
  // screen handles the long press itself.
  const nativeMenu =
    hasNativeContextMenu() &&
    enableActionSheet &&
    Boolean(items) &&
    !onLongPressItem &&
    !onLongPressId;

  // Only media items have a played/favorite state to act on — but a screen
  // that handles the long press itself always gets it.
  const allowLongPress =
    Boolean(onLongPressId) ||
    (Boolean(items) && (Boolean(onLongPressItem) || enableActionSheet));

  return {
    cards,
    handlePress,
    handleLongPress:
      allowLongPress && !nativeMenu ? handleLongPress : undefined,
    /** The poster's native context menu actions, where there is one. */
    menuActionsFor: nativeMenu ? menuActionsFor : undefined,
    handleMenuAction,
    /** Mount alongside the cards; renders nothing until a long press. */
    actionSheet: (
      <>
        {actionSheetRequest ? (
          <ItemActionSheetHost
            key={actionSheetRequest.id}
            item={actionSheetRequest.item}
            onClose={closeActionSheet}
          />
        ) : null}
        {runner}
      </>
    ),
  };
}
