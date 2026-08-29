import { SectionList, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { spacing, useTheme } from "@/theme";
import { Text } from "@/components/primitives";
import { SessionRow } from "@/components/session-row";
import type { SessionInfo } from "@opencode-ai/client/promise";

export function SessionTab({
  sessions,
  emptyMessage,
  refreshing,
  onRefresh,
  onOpenSession,
  contentContainerStyle,
}: {
  sessions: SessionInfo[];
  emptyMessage: string;
  refreshing: boolean;
  onRefresh: () => void;
  onOpenSession: (id: string) => void;
  contentContainerStyle?: StyleProp<ViewStyle>;
}) {
  const sections = sessionSections(sessions);
  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <SessionRow session={item} onPress={() => onOpenSession(item.id)} />
      )}
      renderSectionHeader={({ section }) => (
        <Text variant="caption" color="secondary" style={styles.sectionHeader}>
          {section.title}
        </Text>
      )}
      ItemSeparatorComponent={RowSeparator}
      stickySectionHeadersEnabled={false}
      keyboardShouldPersistTaps="handled"
      refreshing={refreshing}
      onRefresh={onRefresh}
      ListEmptyComponent={
        <View style={styles.centered}>
          <Text color="secondary">{emptyMessage}</Text>
        </View>
      }
      contentContainerStyle={[
        {
          paddingTop: spacing.sm,
          flexGrow: 1,
        },
        contentContainerStyle,
      ]}
    />
  );
}

function RowSeparator() {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.separator,
        { backgroundColor: colors.border.subtle },
      ]}
    />
  );
}

type SessionSection = { title: string; data: SessionInfo[] };

/** Calendar-day groups matching the web sidebar: Today / Yesterday / Older. */
function sessionSections(sessions: SessionInfo[]): SessionSection[] {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const isSameDay = (ms: number, ref: Date) => {
    const date = new Date(ms);
    return (
      date.getFullYear() === ref.getFullYear() &&
      date.getMonth() === ref.getMonth() &&
      date.getDate() === ref.getDate()
    );
  };
  const todays = sessions.filter((session) => isSameDay(session.time.updated, today));
  const yesterdays = sessions.filter((session) => isSameDay(session.time.updated, yesterday));
  const older = sessions.filter(
    (session) => !isSameDay(session.time.updated, today) && !isSameDay(session.time.updated, yesterday),
  );
  const sections: SessionSection[] = [];
  if (todays.length > 0) sections.push({ title: "Today", data: todays });
  if (yesterdays.length > 0) sections.push({ title: "Yesterday", data: yesterdays });
  if (older.length > 0) {
    sections.push({
      title: todays.length > 0 || yesterdays.length > 0 ? "Older" : "Recent sessions",
      data: older,
    });
  }
  return sections;
}

const styles = StyleSheet.create({
  sectionHeader: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: spacing.md,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});