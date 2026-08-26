import { ActivityIndicator, StyleSheet, View } from "react-native";
import { KeyboardAwareLegendList } from "@legendapp/list/keyboard";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { spacing, useTheme } from "@/theme";
import { RowRenderer } from "@/components/message/row";
import { projectRows } from "@/hooks/project-rows";
import { rowKey, type SessionRow } from "@/types/rows";
import { useSessionMessages, useSessionMessagesLoadingOlder } from "@/hooks/use-store";
import { loadOlderMessages } from "@/stores/sync";

function sameRowEntry(a: SessionRow, b: SessionRow) {
  return rowKey(a) === rowKey(b);
}

function rowType(row: SessionRow): string {
  return row.type === "assistant-part" ? `${row.type}-${row.part.type}` : row.type;
}

export function MessageTimeline({ sessionID }: { sessionID: string }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { messages, loaded, loading } = useSessionMessages(sessionID);
  const loadingOlder = useSessionMessagesLoadingOlder(sessionID);
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
      getItemType={rowType}
      renderItem={({ item }) => <RowRenderer row={item} />}
      recycleItems
      itemsAreEqual={sameRowEntry}
      extraData={messages}
      drawDistance={1000}
      style={{ backgroundColor: colors.background.default, flex: 1 }}
      initialScrollAtEnd
      maintainScrollAtEnd={{
        on: { dataChange: true, itemLayout: true, layout: false, footerLayout: false },
      }}
      // Anchors the top row across prepends so older pages don't shift position.
      maintainVisibleContentPosition={{ data: true }}
      alignItemsAtEnd
      onStartReached={() => void loadOlderMessages(sessionID)}
      ListHeaderComponent={
        loadingOlder ? (
          <ActivityIndicator
            style={styles.loadingOlder}
            color={colors.text.primary}
          />
        ) : null
      }
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
  loadingOlder: {
    marginVertical: 12,
  },
});
