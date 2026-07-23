import { ActivityIndicator, FlatList, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { spacing, useTheme } from "@/theme";
import { Text } from "@/components/primitives";
import { SessionCard } from "@/components/session-card";
import { useSessions } from "@/hooks/use-sessions";

export function SessionList() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError, refetch, isRefetching } = useSessions();

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
        <Text color="error">Failed to load sessions</Text>
      </View>
    );
  }

  const sessions = data?.pages.flatMap((page) => page.data) ?? [];

  if (sessions.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text color="textSecondary">No sessions yet</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={sessions}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <SessionCard session={item} />}
      style={{ backgroundColor: colors.background }}
      onEndReached={() => { if (hasNextPage) fetchNextPage(); }}
      onEndReachedThreshold={0.5}
      refreshing={isRefetching}
      onRefresh={refetch}
      contentContainerStyle={[styles.list, { backgroundColor: colors.background, paddingBottom: insets.bottom + spacing.sm }]}
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
  list: {
    paddingVertical: spacing.sm,
  },
  footer: {
    padding: spacing.md,
    alignItems: "center",
  },
});
