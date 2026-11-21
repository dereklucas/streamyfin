import type { ContextMenuSection } from "@/modules/item-context-menu";
import type { NativeContextMenuAction } from "./NativeContextMenu";

/**
 * The menu as the native view draws it: the icon row (short labels), the
 * list, navigation, then the destructive end, each section only when it has
 * something.
 */
export const contextMenuSections = (
  actions: readonly NativeContextMenuAction[],
): ContextMenuSection[] => {
  const groupOf = (action: NativeContextMenuAction) =>
    action.group ?? (action.destructive ? "destructive" : "primary");
  const item = (action: NativeContextMenuAction, label = action.label) => ({
    key: action.key,
    label,
    ...(action.systemImage ? { systemImage: action.systemImage } : {}),
    destructive: Boolean(action.destructive),
  });
  const of = (group: NonNullable<NativeContextMenuAction["group"]>) =>
    actions.filter((action) => groupOf(action) === group);

  const sections: ContextMenuSection[] = [
    {
      kind: "quick",
      items: of("quick").map((action) =>
        item(action, action.shortLabel ?? action.label),
      ),
    },
    { kind: "list", items: of("primary").map((action) => item(action)) },
    { kind: "list", items: of("nav").map((action) => item(action)) },
    { kind: "list", items: of("destructive").map((action) => item(action)) },
  ];
  return sections.filter((section) => section.items.length > 0);
};
