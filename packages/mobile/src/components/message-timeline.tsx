import { ActivityIndicator, StyleSheet, View } from "react-native";
import { KeyboardAwareLegendList } from "@legendapp/list/keyboard";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { spacing, useTheme } from "@/theme";
import { RowRenderer } from "@/components/message/row";
import { projectRows } from "@/hooks/project-rows";
import { rowKey } from "@/types/rows";
import { useSessionMessages } from "@/hooks/use-store";

export function MessageTimeline({ sessionID }: { sessionID: string }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { messages, loaded, loading } = useSessionMessages(sessionID);
  const chronological = messages;
  const messageMap = new Map(chronological.map((m) => [m.id, m]));
  const rows = projectRows(chronological);

  if (!loaded && loading) {
    return (
      <View
        style={[
          styles.centered,
          { backgroundColor: colors.background.default },
        ]}
      >
        <ActivityIndicator size="large" color={colors.text.primary} />
      </View>
    );
  }

  return (
    <KeyboardAwareLegendList
      data={rows}
      keyExtractor={rowKey}
      renderItem={({ item }) => (
        <RowRenderer row={item} messages={messageMap} />
      )}
      recycleItems
      style={{ backgroundColor: colors.background.default, flex: 1 }}
      initialScrollAtEnd
      maintainScrollAtEnd
      maintainVisibleContentPosition
      alignItemsAtEnd
      keyboardOffset={insets.bottom}
      keyboardDismissMode="interactive"
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
