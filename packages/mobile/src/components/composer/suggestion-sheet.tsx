import {
  FlatList,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { Text } from "@/components/primitives";
import { borderRadius, spacing, useTheme } from "@/theme";
import type { Suggestion } from "@/types/composer";

export function SuggestionSheet({
  suggestions,
  onSelect,
  emptyText,
}: {
  suggestions: Suggestion[];
  onSelect: (item: Suggestion) => void;
  emptyText: string;
}) {
  const { colors } = useTheme();
  const { height } = useWindowDimensions();

  return (
    <View
      style={[
        styles.sheet,
        {
          maxHeight: Math.min(320, height * 0.4),
          backgroundColor: colors.background.elevated,
          borderColor: colors.border.default,
        },
      ]}
    >
      <FlatList
        data={suggestions}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        style={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => onSelect(item)}
            accessibilityRole="button"
            style={styles.row}
          >
            <Text variant="body" numberOfLines={1}>
              {item.label}
            </Text>
            {item.description ? (
              <Text
                variant="caption"
                color="secondary"
                numberOfLines={1}
                style={styles.description}
              >
                {item.description}
              </Text>
            ) : null}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text variant="caption" color="secondary" style={styles.empty}>
            {emptyText}
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    overflow: "hidden",
  },
  list: {
    flexShrink: 1,
    paddingVertical: spacing.xs,
  },
  row: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  description: {
    marginTop: spacing.xs,
  },
  empty: {
    padding: spacing.md,
  },
});
