import type React from "react";
import { Platform, Pressable, Text, View } from "react-native";

export const itemContextMenuProps = jest.fn();

type Section = {
  kind: string;
  items: { key: string; label: string }[];
};

type StandInProps = {
  menu: string;
  hasPreview: boolean;
  onAction: (event: { nativeEvent: { key: string } }) => void;
  onPreviewPress: () => void;
  children?: React.ReactNode;
};

/**
 * The native context menu view, as it carries itself: its children, then each
 * menu section as rows of items (a press is choosing it), then a stand-in for
 * the lifted preview a tap commits. It records its props.
 */
const ItemContextMenuStandIn = (props: StandInProps) => {
  itemContextMenuProps(props);
  const sections = JSON.parse(props.menu) as Section[];
  return (
    <View testID='native-context-menu'>
      {props.children}
      {sections.map((section, index) => (
        <View
          key={index}
          testID={`native-context-menu-section-${section.kind}`}
        >
          {section.items.map((item) => (
            <Text
              key={item.key}
              accessibilityRole='menuitem'
              onPress={() => props.onAction({ nativeEvent: { key: item.key } })}
            >
              {item.label}
            </Text>
          ))}
        </View>
      ))}
      <Pressable
        testID='native-context-menu-preview-tap'
        onPress={() => props.onPreviewPress()}
      />
    </View>
  );
};

/** `@/modules/item-context-menu` for every unit spec, wired in `unitSetup.ts`. */
export const itemContextMenuModule = {
  itemContextMenuView: () =>
    Platform.OS === "ios" && !Platform.isTV ? ItemContextMenuStandIn : null,
};
