import type { BaseItemDto } from "@jellyfin/sdk/lib/generated-client/models";
import { useAtomValue } from "jotai";
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ItemActionRunner } from "@/components/common/ItemActionRunner";
import type { NativeContextMenuAction } from "@/components/common/NativeContextMenu";
import { favoritesAtom } from "@/hooks/useFavorite";
import { useDownload } from "@/providers/DownloadProvider";
import { userAtom } from "@/providers/JellyfinProvider";
import { useOfflineMode } from "@/providers/OfflineModeProvider";
import { type ItemActionKey, itemMenuActions } from "@/utils/itemActions";

/**
 * The native context menus of a set of items, wherever they are drawn: card
 * rows and grids, the home hero. Each item's actions are plain data, built
 * from state read once for the whole set (favorites, downloads, the user's
 * download permission) rather than once per poster; choosing one mounts a
 * single ItemActionRunner for that item.
 */
export function useItemMenus(items: BaseItemDto[] | undefined) {
  const { t } = useTranslation();
  const isOffline = useOfflineMode();
  const favorites = useAtomValue(favoritesAtom);
  const user = useAtomValue(userAtom);
  const canDownload = Boolean(user?.Policy?.EnableContentDownloading);
  const { downloadedItems } = useDownload();
  const downloadedIds = useMemo(
    () => new Set((downloadedItems ?? []).map((d) => d.item.Id)),
    [downloadedItems],
  );

  // Read through a ref so a paged list growing `items` does not hand every
  // memoized poster a new handler.
  const itemsRef = useRef(items);
  useLayoutEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const menuActionsFor = useCallback(
    (id: string): NativeContextMenuAction[] | undefined => {
      const item = itemsRef.current?.find((i) => i.Id === id);
      if (!item) return undefined;
      return itemMenuActions(item, {
        t,
        isOffline,
        isFavorite: Boolean(favorites[id] ?? item.UserData?.IsFavorite),
        isDownloaded: downloadedIds.has(id),
        canDownload,
      });
    },
    [t, isOffline, favorites, downloadedIds, canDownload],
  );

  // Each choice is its own run, so choosing the same action twice runs twice.
  const [actionRun, setActionRun] = useState<{
    item: BaseItemDto;
    action: ItemActionKey;
    id: number;
  } | null>(null);
  const handleMenuAction = useCallback((id: string, key: string) => {
    const item = itemsRef.current?.find((i) => i.Id === id);
    if (!item) return;
    setActionRun((prev) => ({
      item,
      action: key as ItemActionKey,
      id: (prev?.id ?? 0) + 1,
    }));
  }, []);
  const closeActionRun = useCallback(() => setActionRun(null), []);

  return {
    menuActionsFor,
    handleMenuAction,
    /** Mount alongside the items; renders nothing until an action is chosen. */
    runner: actionRun ? (
      <ItemActionRunner
        key={actionRun.id}
        item={actionRun.item}
        action={actionRun.action}
        onDone={closeActionRun}
      />
    ) : null,
  };
}
