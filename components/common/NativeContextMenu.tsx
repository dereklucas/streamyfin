import { Button, ContextMenu, Host, RNHostView } from "@expo/ui/swift-ui";
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
}

type Props = {
  actions: readonly NativeContextMenuAction[];
  onAction: (key: string) => void;
  children: React.ReactElement;
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
}) => {
  const native = hasNativeContextMenu() && actions.length > 0;
  useEffect(() => {
    if (native) logOnce("Native context menus in use", platformDetails());
  }, [native]);

  if (!native) return children;

  return (
    // Both size to the content: the Host takes the poster's size in the React
    // Native layout, and the RNHostView inside it the poster's own.
    <Host matchContents>
      <ContextMenu>
        <ContextMenu.Items>
          {actions.map((action) => (
            <Button
              key={action.key}
              label={action.label}
              systemImage={action.systemImage as never}
              role={action.destructive ? "destructive" : "default"}
              onPress={() => {
                writeInfoLog("Context menu action chosen", { key: action.key });
                onAction(action.key);
              }}
            />
          ))}
        </ContextMenu.Items>
        <ContextMenu.Trigger>
          <RNHostView matchContents>{children}</RNHostView>
        </ContextMenu.Trigger>
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
