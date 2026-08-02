import { useState } from "react";
import Plus from "lucide-react-native/icons/plus";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import type { DrawerContentComponentProps } from "expo-router/drawer";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { borderRadius, spacing, useTheme } from "@/theme";
import { Text } from "@/components/primitives";
import { SessionCard } from "@/components/session-card";
import { useSessions, useSessionsLoaded } from "@/hooks/use-store";
import { useCreateSession } from "@/hooks/use-create-session";
import { syncSessionList } from "@/stores/sync";

export function SessionList({ navigation }: DrawerContentComponentProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { createSession, isCreating } = useCreateSession();
  const sessions = useSessions();
  const loaded = useSessionsLoaded();
  const [isRefreshing, setIsRefreshing] = useState(false);

  function openSession(id: string) {
    router.push({ pathname: "/session/[id]", params: { id } });
    navigation.closeDrawer();
  }

  async function handleNewSession() {
    try {
      const session = await createSession();
      openSession(session.id);
    } catch (error) {
      console.error("Failed to create session", error);
    }
  }

  async function handleRefresh() {
    setIsRefreshing(true);
    try {
      await syncSessionList();
    } catch {}
    setIsRefreshing(false);
  }

  if (!loaded) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.text} />
      </View>
    );
  }

  return (
    <FlatList
      data={sessions}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <SessionCard session={item} onPress={() => openSession(item.id)} />
      )}
      style={{ backgroundColor: colors.background }}
      refreshing={isRefreshing}
      onRefresh={handleRefresh}
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
        {
          backgroundColor: colors.background,
          paddingTop: spacing.sm,
          paddingBottom: insets.bottom + spacing.sm,
          flexGrow: 1,
        },
      ]}
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
});
