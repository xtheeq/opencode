import { ActivityIndicator, FlatList, StyleSheet, View } from "react-native";
import { spacing, useTheme } from "@/theme";
import { Text } from "@/components/primitives";
import { useMessages } from "@/hooks/use-messages";

export function MessageTimeline({ sessionID }: { sessionID: string }) {
  const { colors } = useTheme();
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError, refetch, isRefetching } = useMessages(sessionID);

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.text} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text color="error">Failed to load messages</Text>
      </View>
    );
  }

  const messages = data?.pages.flatMap((page) => page.data) ?? [];

  if (messages.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text color="textSecondary">No messages yet</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={messages}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={styles.placeholder}>
          <Text variant="caption" color="textSecondary">{item.type}</Text>
        </View>
      )}
      style={{ backgroundColor: colors.background }}
      inverted
      onEndReached={() => { if (hasNextPage) fetchNextPage(); }}
      onEndReachedThreshold={0.5}
      refreshing={isRefetching}
      onRefresh={refetch}
      contentContainerStyle={{ paddingVertical: spacing.sm }}
      ListFooterComponent={isFetchingNextPage ? (
        <View style={styles.footer}>
          <ActivityIndicator size="small" color={colors.text} />
        </View>
      ) : null}
    />
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  placeholder: {
    padding: spacing.md,
  },
  footer: {
    padding: spacing.md,
    alignItems: "center",
  },
});
