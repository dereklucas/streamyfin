import {
  Button,
  ContextMenu,
  ControlGroup,
  Divider,
  Host,
  RNHostView,
} from "@expo/ui/swift-ui";
import type React from "react";
import { useEffect, useState } from "react";
import { Platform, View } from "react-native";
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
  /** Take the width the layout gives (a list row), not the content's own (a poster). */
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
  // The width a filling menu is given, once laid out.
  const [width, setWidth] = useState<number | null>(null);
  useEffect(() => {
    if (native) logOnce("Native context menus in use", platformDetails());
  }, [native]);

  if (!native) return children;

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

  const menu = (content: React.ReactElement) => (
    // Both size to the content: the Host takes the poster's size in the React
    // Native layout, and the RNHostView inside it the poster's own.
    <Host matchContents>
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
          <RNHostView matchContents>{content}</RNHostView>
        </ContextMenu.Trigger>
        {preview ? (
          <ContextMenu.Preview>
            <RNHostView matchContents>{preview}</RNHostView>
          </ContextMenu.Preview>
        ) : null}
      </ContextMenu>
    </Host>
  );

  if (!fillWidth) return menu(children);

  // A list row takes the width the layout gives it, not its content's own:
  // sized to its content, a long title stays on one line and pushes what
  // hangs off the row's end out of the screen. Asking the Host for the width
  // from the layout and the height from the content is another native sizing
  // path, the likely cause of rows collapsing onto each other as the page
  // scrolled (seen on a device with it). So the width is measured here and the content is given it, and the menu
  // sizes to that content on both axes, as a poster does.
  return (
    <View
      testID='context-menu-measure'
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
    >
      {width === null
        ? children
        : menu(
            <View testID='context-menu-content' style={{ width }}>
              {children}
            </View>,
          )}
    </View>
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
