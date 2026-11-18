import { TouchableOpacity, View } from "react-native";
import { Colors } from "@/constants/Colors";
import { Text } from "./Text";

const PLACEHOLDER_COLOR = "#171717";

type Props = {
  title: string;
  actionLabel?: string;
  actionDisabled?: boolean;
  onPressAction?: () => void;
  /** Drawn at the end of the row — a count pill, a small action. */
  accessory?: React.ReactNode;
  /**
   * A header still loading: the title's own line, its text hidden behind a
   * bar, so it is exactly as tall as the header that replaces it.
   */
  placeholder?: boolean;
};

export const SectionHeader: React.FC<Props> = ({
  title,
  actionLabel,
  actionDisabled = false,
  onPressAction,
  accessory,
  placeholder = false,
}) => {
  if (placeholder) {
    return (
      <View
        testID='section-header-placeholder'
        className='px-4 flex flex-row items-center justify-between mb-2'
      >
        <Text
          className='text-lg font-bold rounded-md'
          style={{
            color: PLACEHOLDER_COLOR,
            backgroundColor: PLACEHOLDER_COLOR,
          }}
        >
          {title}
        </Text>
      </View>
    );
  }

  const shouldShowAction = Boolean(actionLabel) && Boolean(onPressAction);

  return (
    <View className='px-4 flex flex-row items-center justify-between mb-2'>
      <Text className='text-lg font-bold text-neutral-100'>{title}</Text>
      {accessory}
      {shouldShowAction && (
        <TouchableOpacity
          onPress={onPressAction}
          disabled={actionDisabled}
          accessibilityRole='button'
          accessibilityLabel={actionLabel}
          className='py-1 pl-3'
        >
          <Text
            style={{
              color: actionDisabled ? "rgba(255,255,255,0.4)" : Colors.primary,
            }}
          >
            {actionLabel}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};
