import { useEffect, type Ref } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { KeyboardAwareLegendList } from "@legendapp/list/keyboard";
import type { LegendListRef } from "@legendapp/list/react-native";
import type { SharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { spacing, useTheme } from "@/theme";
import { RowRenderer } from "@/components/message/row";
import {
  clearCommittedRows,
  projectActiveRows,
  projectCommittedRows,
} from "@/hooks/project-rows";
import { rowKey, type SessionRow } from "@/types/rows";
import {
  useActiveAssistantMessage,
  useSessionMessages,
  useSessionMessagesLoadingOlder,
} from "@/hooks/use-store";
import { loadOlderMessages } from "@/stores/sync";

// Pool containers by the row's concrete component, not just "tool". A bash
// cell recycles into another bash cell (so React updates in place), instead of
// crossing tool kinds and remounting the whole subtree.
function rowType(row: SessionRow): string {
  if (row.type !== "assistant-part") return row.type;
  return row.part.type === "tool"
    ? `${row.type}-tool-${row.part.name}`
    : `${row.type}-${row.part.type}`;
}

// Subscribes to the streaming message on its own, so a text/tool delta only
// re-renders these rows and never touches LegendList's data prop. When the
// projection cannot isolate the active message as the tail it stays in `data`
// (streamed is false) and this renders nothing.
function ActiveStreamingRows({
  sessionID,
  streamed,
}: {
  sessionID: string;
  streamed: boolean;
}) {
  const active = useActiveAssistantMessage(sessionID);
  if (!streamed || !active) return null;

  return (
    <>
      {projectActiveRows(active).map((row) => (
        <RowRenderer key={rowKey(row)} row={row} />
      ))}
    </>
  );
}

export function MessageTimeline({
  sessionID,
  listRef,
  contentInsetEndAdjustment,
}: {
  sessionID: string;
  listRef?: Ref<LegendListRef>;
  contentInsetEndAdjustment?: SharedValue<number>;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { messages, loaded, loading } = useSessionMessages(sessionID);
  const loadingOlder = useSessionMessagesLoadingOlder(sessionID);
  const active = useActiveAssistantMessage(sessionID);
  const { committed, streamed } = projectCommittedRows(
    sessionID,
    messages,
    active,
  );

  useEffect(() => () => clearCommittedRows(sessionID), [sessionID]);

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
      ref={listRef}
      contentInsetEndAdjustment={contentInsetEndAdjustment}
      data={committed}
      keyExtractor={rowKey}
      getItemType={rowType}
      renderItem={({ item }) => <RowRenderer row={item} />}
      recycleItems
      // A smaller drawDistance bounds how many rich rows mount in one commit
      // when a fast fling jumps the window.
      drawDistance={400}
      style={{ backgroundColor: colors.background.default, flex: 1 }}
      initialScrollAtEnd
      maintainScrollAtEnd={{
        on: {
          dataChange: true,
          itemLayout: true,
          layout: false,
          // The streaming message grows in the footer, so follow its layout.
          footerLayout: true,
        },
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
      ListFooterComponent={
        streamed ? (
          <ActiveStreamingRows sessionID={sessionID} streamed={streamed} />
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
