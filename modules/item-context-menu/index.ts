import { requireNativeView } from "expo";
import type { ComponentType, ReactNode } from "react";
import { Platform, type ViewProps } from "react-native";

/** One item of a context menu section, as the native view reads it. */
export interface ContextMenuItem {
  key: string;
  label: string;
  /** SF Symbol name. */
  systemImage?: string;
  destructive: boolean;
}

/**
 * A run of items drawn together: `quick` as the small icon row on top (as
 * Music's), `list` as rows. Consecutive sections are separated by a line.
 */
export interface ContextMenuSection {
  kind: "quick" | "list";
  items: ContextMenuItem[];
}

export interface ItemContextMenuViewProps extends ViewProps {
  /** The sections, as JSON: Expo drops a prop it fails to convert, silently. */
  menu: string;
  /** The last child is the preview, drawn off screen and shown as a picture. */
  hasPreview: boolean;
  onAction: (event: { nativeEvent: { key: string } }) => void;
  /** The lifted preview was tapped: open the item. */
  onPreviewPress: () => void;
  children?: ReactNode;
}

let nativeView: ComponentType<ItemContextMenuViewProps> | null | undefined;

/**
 * The system context menu, attached to a view of React Native content laid
 * out where it is (UIContextMenuInteraction). iPhone and iPad builds only;
 * null elsewhere, and on a binary built before this module.
 */
export const itemContextMenuView =
  (): ComponentType<ItemContextMenuViewProps> | null => {
    if (nativeView !== undefined) return nativeView;
    nativeView = null;
    if (Platform.OS === "ios" && !Platform.isTV) {
      try {
        nativeView =
          requireNativeView<ItemContextMenuViewProps>("ItemContextMenu");
      } catch {
        nativeView = null;
      }
    }
    return nativeView;
  };
