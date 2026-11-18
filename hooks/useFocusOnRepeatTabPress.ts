import { useNavigation } from "expo-router";
import { type RefObject, useEffect } from "react";
import { eventBus } from "@/utils/eventBus";

/**
 * Focuses a screen's field when its tab is pressed while the screen is
 * already showing, as iOS apps do. The tab press arrives before the switch,
 * so a screen that is not focused yet is being switched to: its field stays
 * as it is, and the page shows without the keyboard over it.
 */
export const useFocusOnRepeatTabPress = (
  ref: RefObject<{ focus: () => void } | null>,
  event: string,
) => {
  const navigation = useNavigation();
  useEffect(
    () =>
      eventBus.on(event, () => {
        if (navigation.isFocused()) ref.current?.focus();
      }),
    [event, navigation, ref],
  );
};
