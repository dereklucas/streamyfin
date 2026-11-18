import type { BaseItemDto } from "@jellyfin/sdk/lib/generated-client/models";
import { useSegments } from "expo-router";
import { type PropsWithChildren, useCallback } from "react";
import { TouchableOpacity, type TouchableOpacityProps } from "react-native";
import { longPressFor } from "@/components/cards/Card";
import useRouter from "@/hooks/useAppRouter";
import { useItemLongPress } from "@/hooks/useItemActionSheet";
import type { ItemActionKey } from "@/utils/itemActions";
import { getItemNavigation, itemRouter } from "@/utils/itemNavigation";
import { hasNativeContextMenu, NativeContextMenu } from "./NativeContextMenu";

interface Props extends TouchableOpacityProps {
  item: BaseItemDto;
  /** Told as the item opens, before navigating (the search's history). */
  onOpen?: (item: BaseItemDto) => void;
}

// Moved to utils so hooks can route without importing this component.
export { getItemNavigation, itemRouter };

export const TouchableItemRouter: React.FC<PropsWithChildren<Props>> = ({
  item,
  children,
  onOpen,
  ...props
}) => {
  const segments = useSegments();
  const router = useRouter();
  const { menuActions, runAction, showActionSheet } = useItemLongPress(item);
  const nativeMenu = hasNativeContextMenu() && menuActions.length > 0;
  const handleMenuAction = useCallback(
    (key: string) => void runAction(key as ItemActionKey),
    [runAction],
  );

  const from = (segments as string[])[2] || "(home)";

  const handlePress = useCallback(() => {
    onOpen?.(item);
    // Force music libraries to navigate via the explicit string route.
    // This avoids losing the dynamic [libraryId] param when going through a nested navigator.
    if ("CollectionType" in item && item.CollectionType === "music") {
      router.push(itemRouter(item, from) as any);
      return;
    }

    const navigation = getItemNavigation(item, from);
    router.push(navigation as any);
  }, [from, item, onOpen, router]);

  if (
    from === "(home)" ||
    from === "(search)" ||
    from === "(libraries)" ||
    from === "(more)" ||
    from === "(tv-favorites)" ||
    from === "(tv-watchlists)"
  )
    return (
      // iPhone and iPad: the system context menu in place of the sheet.
      <NativeContextMenu
        actions={nativeMenu ? menuActions : []}
        onAction={handleMenuAction}
      >
        <TouchableOpacity
          {...longPressFor(
            nativeMenu ? undefined : showActionSheet,
            nativeMenu,
          )}
          onPress={handlePress}
          {...props}
        >
          {children}
        </TouchableOpacity>
      </NativeContextMenu>
    );

  return null;
};
