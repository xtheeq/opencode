import type { Ref } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { KeyboardAwareLegendList } from "@legendapp/list/keyboard";
import type { LegendListRef } from "@legendapp/list/react-native";
import type { SharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { borderRadius, spacing, useTheme } from "@/theme";
import { RowRenderer } from "@/components/message/row";
import { projectRows } from "@/hooks/project-rows";
import { rowKey, type SessionRow } from "@/types/rows";
import {
  useSessionMessages,
  useSessionMessagesLoadingOlder,
} from "@/hooks/use-store";
import { loadOlderMessages } from "@/stores/sync";

function rowType(row: SessionRow): string {
  return row.type === "assistant-part"
    ? `${row.type}-${row.part.type}`
    : row.type;
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
  const { colors, effects } = useTheme();
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
    <View style={styles.container}>
      <KeyboardAwareLegendList
        ref={listRef}
        contentInsetEndAdjustment={contentInsetEndAdjustment}
        data={rows}
        keyExtractor={rowKey}
        getItemType={rowType}
        renderItem={({ item }) => <RowRenderer row={item} />}
        recycleItems
        drawDistance={1000}
        style={{ backgroundColor: colors.background.default, flex: 1 }}
        initialScrollAtEnd
        maintainScrollAtEnd={{
          on: {
            dataChange: true,
            itemLayout: true,
            layout: false,
            footerLayout: false,
          },
        }}
        // Anchors the top row across prepends so older pages don't shift position.
        maintainVisibleContentPosition={{ data: true }}
        alignItemsAtEnd
        onStartReached={() => void loadOlderMessages(sessionID)}
        keyboardOffset={insets.bottom}
        keyboardDismissMode="interactive"
        contentContainerStyle={{ paddingVertical: spacing.sm }}
      />
      {loadingOlder ? (
        <View pointerEvents="none" style={styles.loadingOlder}>
          <View
            style={[
              styles.loadingOlderPill,
              {
                backgroundColor: colors.background.surface,
                borderColor: colors.border.default,
              },
              effects.elevation.raised,
            ]}
          >
            <ActivityIndicator size="small" color={colors.text.secondary} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingOlder: {
    position: "absolute",
    top: spacing.sm,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  loadingOlderPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius.pill,
  },
});
