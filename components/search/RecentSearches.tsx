import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { TouchableOpacity, View } from "react-native";
import { SectionHeader } from "@/components/common/SectionHeader";
import { Text } from "@/components/common/Text";

/**
 * The searches that led somewhere, offered while the field is focused and
 * still empty, to run one again with a tap.
 */
export const RecentSearches: React.FC<{
  queries: string[];
  onSelect: (query: string) => void;
  onClear: () => void;
}> = ({ queries, onSelect, onClear }) => {
  const { t } = useTranslation();
  if (queries.length === 0) return null;

  return (
    <View className='mt-2'>
      <SectionHeader
        title={t("search.recent_searches")}
        actionLabel={t("search.clear")}
        onPressAction={onClear}
      />
      {queries.map((query) => (
        <TouchableOpacity
          key={query}
          accessibilityRole='button'
          onPress={() => onSelect(query)}
          className='flex flex-row items-center px-4 py-3 border-b border-neutral-900'
        >
          <Ionicons name='time-outline' size={18} color='#737373' />
          <Text className='ml-3 text-base' numberOfLines={1}>
            {query}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};
