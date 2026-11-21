import type React from "react";
import { useEffect, useMemo } from "react";
import { Platform, View } from "react-native";
import { itemContextMenuView } from "@/modules/item-context-menu";
import { writeInfoLog } from "@/utils/log";
import { contextMenuSections } from "./contextMenuSections";

export interface NativeContextMenuAction {
  key: string;
  label: string;
  /** SF Symbol. iOS 16-safe names only: the deployment target is 16.4. */
  systemImage?: string;
  destructive?: boolean;
  /**
   * "quick" goes in the icon row on top (as Music's Download, Favorite,
   * Share), "nav" in its own section under the list, "destructive" apart at
   * the end. Default: the list.
   */
  group?: "quick" | "primary" | "nav" | "destructive";
  /** The quick row's label under the icon, where a long one wraps. */
  shortLabel?: string;
}

type Props = {
  actions: readonly NativeContextMenuAction[];
  onAction: (key: string) => void;
  children: React.ReactElement;
  /**
   * Shown lifted above the menu in place of the content itself, as Music's
   * album card. Mounted with the content, so keep it light.
   */
  preview?: React.ReactElement;
  /** The lifted content or preview was tapped: open the item. */
  onPreviewPress?: () => void;
};

// Far enough left of any screen that the preview is never seen where it is
// drawn, only in the picture the native view takes of it.
const OFF_SCREEN = -10000;

/**
 * The system context menu around a piece of React Native UI: a long press
 * lifts it out of the page, blurs the rest and shows the actions beside it,
 * as Photos and Music do, and a tap on what is lifted opens it. iPhone and
 * iPad only (modules/item-context-menu); elsewhere (Android, Apple TV), on a
 * binary without the module, and with no actions it renders the content
 * alone, and the caller keeps its own long press.
 *
 * The menu attaches to the content where React Native lays it out
 * (UIContextMenuInteraction). It used to be @expo/ui's SwiftUI menu, which
 * moved the content into a SwiftUI host that sized to it: a list row, whose
 * height follows its text, ran off the screen and, in a scrolling list,
 * collapsed onto the rows around it. SwiftUI's menu also has no tap on the
 * preview.
 *
 * Spec: components/common/NativeContextMenu.test.tsx.
 */
export const NativeContextMenu: React.FC<Props> = ({
  actions,
  onAction,
  children,
  preview,
  onPreviewPress,
}) => {
  const NativeView = itemContextMenuView();
  const native = hasNativeContextMenu() && actions.length > 0;
  const menu = useMemo(
    () => JSON.stringify(contextMenuSections(actions)),
    [actions],
  );
  useEffect(() => {
    if (native) logOnce("Native context menus in use", platformDetails());
  }, [native]);

  if (!native || !NativeView) return children;

  return (
    <NativeView
      menu={menu}
      hasPreview={Boolean(preview)}
      onAction={(event) => {
        const { key } = event.nativeEvent;
        writeInfoLog("Context menu action chosen", { key });
        onAction(key);
      }}
      onPreviewPress={() => onPreviewPress?.()}
    >
      {children}
      {preview ? (
        // The native view takes a picture of this, its last child, when the
        // menu opens. Not collapsable, or React Native could flatten it into
        // its children and the last child would be something else.
        <View
          testID='context-menu-preview'
          collapsable={false}
          pointerEvents='none'
          accessibilityElementsHidden
          importantForAccessibility='no-hide-descendants'
          style={{ position: "absolute", left: OFF_SCREEN, top: 0 }}
        >
          {preview}
        </View>
      ) : null}
    </NativeView>
  );
};

/** Whether `NativeContextMenu` draws a native menu on this platform. */
export const hasNativeContextMenu = () =>
  Platform.OS === "ios" && !Platform.isTV && itemContextMenuView() !== null;

/**
 * What decides whether a long press gets the native menu, for the log:
 * Settings → Logs, or the Developer screen's shared diagnostics.
 */
export const platformDetails = () => ({
  os: Platform.OS,
  version: Platform.Version,
  isTV: Platform.isTV,
  isPad: Platform.OS === "ios" ? Platform.isPad : undefined,
  nativeContextMenu: hasNativeContextMenu(),
});

const logged = new Set<string>();
// Once per launch: every poster renders a menu.
const logOnce = (message: string, data: unknown) => {
  if (logged.has(message)) return;
  logged.add(message);
  writeInfoLog(message, data);
};
