import { View } from "react-native";
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import type { CardKind } from "@/components/cards/CardData";
import { CardRowSkeleton } from "@/components/cards/CardRowSkeleton";
import { SectionHeader } from "@/components/common/SectionHeader";

interface Props {
  isLoading: boolean;
}

/** The result sections a search shows first: Movies, Series, Episodes. */
const ROWS: CardKind[] = ["portrait", "portrait", "wide"];

/**
 * The search results while they load, drawn with the result rows' own
 * header and row skeletons, so the results land where their placeholders
 * were.
 */
export const LoadingSkeleton: React.FC<Props> = ({ isLoading }) => {
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  useAnimatedReaction(
    () => isLoading,
    (loading) => {
      if (loading) {
        opacity.value = withTiming(1, { duration: 200 });
      } else {
        opacity.value = withTiming(0, { duration: 200 });
      }
    },
  );

  return (
    <Animated.View
      style={animatedStyle}
      className='absolute w-full'
      pointerEvents='none'
    >
      {ROWS.map((kind, index) => (
        <View key={index}>
          <SectionHeader title='Section title' placeholder />
          <CardRowSkeleton kind={kind} />
        </View>
      ))}
    </Animated.View>
  );
};
