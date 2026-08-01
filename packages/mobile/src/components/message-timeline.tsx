import { ActivityIndicator, StyleSheet, View } from "react-native";
import { LegendList } from "@legendapp/list/react-native";
import { spacing, useTheme } from "@/theme";
import { RowRenderer } from "@/components/message/row";
import { projectRows } from "@/hooks/project-rows";
import { rowKey } from "@/types/rows";
import { useSessionMessages } from "@/hooks/use-store";

export function MessageTimeline({ sessionID }: { sessionID: string }) {
  const { colors } = useTheme();
  const { messages, loaded, loading } = useSessionMessages(sessionID);
  const chronological = messages;
  const messageMap = new Map(chronological.map((m) => [m.id, m]));
  const rows = projectRows(chronological);

  if (!loaded && loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.text} />
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
      contentContainerStyle={{ paddingVertical: spacing.sm }}
    />
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
