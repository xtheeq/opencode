import Plus from "lucide-react-native/icons/plus";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { borderRadius, spacing, useTheme } from "@/theme";
import { Text } from "@/components/primitives";
import { SessionCard } from "@/components/session-card";
import { useSessions } from "@/hooks/use-sessions";
import { useCreateSession } from "@/hooks/use-create-session";

export function SessionList() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { createSession, isCreating } = useCreateSession();
  const sessionsQuery = useSessions();

  async function handleNewSession() {
    try {
      const session = await createSession();
      router.push(`/session/${session.id}`);
    } catch (error) {
      console.error("Failed to create session", error);
    }
  }

  if (sessionsQuery.isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.text} />
      </View>
    );
  }

  if (sessionsQuery.isError) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text color="error">Failed to load sessions</Text>
      </View>
    );
  }

  const sessions = sessionsQuery.data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <FlatList
      data={sessions}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <SessionCard
          session={item}
          onPress={() => router.push(`/session/${item.id}`)}
        />
      )}
      style={{ backgroundColor: colors.background }}
      onEndReached={() => {
        if (sessionsQuery.hasNextPage) sessionsQuery.fetchNextPage();
      }}
      onEndReachedThreshold={0.5}
      refreshing={sessionsQuery.isRefetching}
      onRefresh={sessionsQuery.refetch}
      ListHeaderComponent={
        <TouchableOpacity
          onPress={handleNewSession}
          disabled={isCreating}
          style={[
            styles.newSession,
            { borderColor: colors.border, opacity: isCreating ? 0.6 : 1 },
          ]}
        >
          {isCreating ? (
            <ActivityIndicator size="small" color={colors.text} />
          ) : (
            <View style={styles.newSessionRow}>
              <Plus size={18} color={colors.text} />
              <Text variant="body">New session</Text>
            </View>
          )}
        </TouchableOpacity>
      }
      ListEmptyComponent={
        <View style={styles.centered}>
          <Text color="textSecondary">No sessions yet</Text>
        </View>
      }
      contentContainerStyle={[
        styles.list,
        {
          backgroundColor: colors.background,
          paddingBottom: insets.bottom + spacing.sm,
          flexGrow: 1,
        },
      ]}
      ListFooterComponent={
        sessionsQuery.isFetchingNextPage ? (
          <View style={styles.footer}>
            <ActivityIndicator size="small" color={colors.text} />
          </View>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  newSession: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    alignItems: "center",
  },
  newSessionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
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
