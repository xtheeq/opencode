import { ActivityIndicator, StyleSheet, View } from "react-native";
import { KeyboardAwareLegendList } from "@legendapp/list/keyboard";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { spacing, useTheme } from "@/theme";
import { RowRenderer } from "@/components/message/row";
import { projectRows } from "@/hooks/project-rows";
import { rowKey, type SessionRow } from "@/types/rows";
import { useSessionMessages } from "@/hooks/use-store";

function sameRowEntry(a: SessionRow, b: SessionRow) {
  return rowKey(a) === rowKey(b);
}

export function MessageTimeline({ sessionID }: { sessionID: string }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { messages, loaded, loading } = useSessionMessages(sessionID);
  const rows = projectRows(messages);

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
      getItemType={(row) => row.type}
      renderItem={({ item }) => <RowRenderer row={item} />}
      recycleItems
      itemsAreEqual={sameRowEntry}
      extraData={messages}
      estimatedItemSize={60}
      style={{ backgroundColor: colors.background.default, flex: 1 }}
      initialScrollAtEnd
      maintainScrollAtEnd={{
        on: { dataChange: true, itemLayout: true, layout: false, footerLayout: false },
      }}
      maintainVisibleContentPosition={false}
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
