import { ActivityIndicator, StyleSheet, View } from "react-native";
import { LegendList } from "@legendapp/list/react-native";
import { spacing, useTheme } from "@/theme";
import { Text } from "@/components/primitives";
import { RowRenderer } from "@/components/message/row";
import { projectRows } from "@/hooks/project-rows";
import { rowKey } from "@/types/rows";
import { useMessages } from "@/hooks/use-messages";
import { useSessionStream } from "@/hooks/use-session-stream";

export function MessageTimeline({ sessionID }: { sessionID: string }) {
  const { colors } = useTheme();
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useMessages(sessionID);
  useSessionStream(sessionID);

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

  const all = data?.pages.flatMap((page) => page.data) ?? [];
  const chronological = [...all].reverse();
  const messageMap = new Map(chronological.map((m) => [m.id, m]));
  const rows = projectRows(chronological);

  if (rows.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text color="textSecondary">No messages yet</Text>
      </View>
    );
  }

  return (
    <LegendList
      data={rows}
      keyExtractor={rowKey}
      renderItem={({ item }) => (
        <RowRenderer row={item} messages={messageMap} />
      )}
      recycleItems
      style={{ backgroundColor: colors.background, flex: 1 }}
      initialScrollAtEnd
      maintainScrollAtEnd
      maintainVisibleContentPosition
      onStartReached={() => {
        if (hasNextPage) fetchNextPage();
      }}
      refreshing={isRefetching}
      onRefresh={refetch}
      contentContainerStyle={{ paddingVertical: spacing.sm }}
      ListHeaderComponent={
        isFetchingNextPage ? (
          <View style={styles.footer}>
            <ActivityIndicator size="small" color={colors.text} />
          </View>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  footer: {
    padding: spacing.md,
    alignItems: "center",
  },
});
