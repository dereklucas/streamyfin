import {
  Button,
  ContextMenu,
  ControlGroup,
  Divider,
  Host,
  RNHostView,
} from "@expo/ui/swift-ui";
import type React from "react";
import { useEffect } from "react";
import { Platform } from "react-native";
import { writeInfoLog } from "@/utils/log";

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
  /**
   * Take the width the layout gives (a list row), not the content's own (a
   * poster). Sized to its content, a row keeps a long title on one line and
   * pushes what hangs off its end out of the screen.
   */
  fillWidth?: boolean;
};

/**
 * The system context menu around a piece of React Native UI: a long press
 * lifts it out of the page, blurs the rest and shows the actions beside it,
 * as Photos and Music do. iPhone and iPad only; elsewhere (Android, Apple TV)
 * and with no actions it renders the content alone, and the caller keeps its
 * own long press.
 *
 * Spec: components/common/NativeContextMenu.test.tsx.
 */
export const NativeContextMenu: React.FC<Props> = ({
  actions,
  onAction,
  children,
  preview,
  fillWidth = false,
}) => {
  const native = hasNativeContextMenu() && actions.length > 0;
  useEffect(() => {
    if (native) logOnce("Native context menus in use", platformDetails());
  }, [native]);

  if (!native) return children;

  const sizing = fillWidth ? { vertical: true } : true;

  const groupOf = (action: NativeContextMenuAction) =>
    action.group ?? (action.destructive ? "destructive" : "primary");
  const quick = actions.filter((action) => groupOf(action) === "quick");
  const primary = actions.filter((action) => groupOf(action) === "primary");
  const nav = actions.filter((action) => groupOf(action) === "nav");
  const destructive = actions.filter(
    (action) => groupOf(action) === "destructive",
  );

  const button = (action: NativeContextMenuAction, label = action.label) => (
    <Button
      key={action.key}
      label={label}
      systemImage={action.systemImage as never}
      role={action.destructive ? "destructive" : "default"}
      onPress={() => {
        writeInfoLog("Context menu action chosen", { key: action.key });
        onAction(action.key);
      }}
    />
  );

  return (
    // Both size to the content: the Host takes the poster's size in the React
    // Native layout, and the RNHostView inside it the poster's own. Filling
    // the width, only the height follows the content: the Host takes its
    // width from the layout and hands it down, so the row's text wraps.
    <Host matchContents={sizing}>
      <ContextMenu>
        <ContextMenu.Items>
          {quick.length > 0 ? (
            <ControlGroup>
              {quick.map((action) =>
                button(action, action.shortLabel ?? action.label),
              )}
            </ControlGroup>
          ) : null}
          {primary.map((action) => button(action))}
          {nav.length > 0 && quick.length + primary.length > 0 ? (
            <Divider />
          ) : null}
          {nav.map((action) => button(action))}
          {destructive.length > 0 &&
          quick.length + primary.length + nav.length > 0 ? (
            <Divider />
          ) : null}
          {destructive.map((action) => button(action))}
        </ContextMenu.Items>
        <ContextMenu.Trigger>
          <RNHostView matchContents={sizing}>{children}</RNHostView>
        </ContextMenu.Trigger>
        {preview ? (
          <ContextMenu.Preview>
            <RNHostView matchContents>{preview}</RNHostView>
          </ContextMenu.Preview>
        ) : null}
      </ContextMenu>
    </Host>
  );
};

/** Whether `NativeContextMenu` draws a native menu on this platform. */
export const hasNativeContextMenu = () =>
  Platform.OS === "ios" && !Platform.isTV;

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
