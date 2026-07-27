import { View, StyleSheet } from "react-native";
import ArrowRight from "lucide-react-native/icons/arrow-right";
import CornerDownRight from "lucide-react-native/icons/corner-down-right";
import type { SessionMessageAssistantTool } from "@opencode-ai/client/promise";
import { Text } from "@/components/primitives";
import { spacing, typography, useTheme } from "@/theme";

function getString(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  return undefined;
}

function displayPath(path: string): string {
  return path.startsWith("/") ? path.split("/").filter(Boolean).pop() ?? path : path;
}

function getFullPath(state: SessionMessageAssistantTool["state"]): string | undefined {
  if (state.status === "streaming") {
    try {
      const parsed = JSON.parse(state.input);
      return getString((parsed as Record<string, unknown>).path) ?? getString((parsed as Record<string, unknown>).filePath);
    } catch {
      return getString(state.input);
    }
  }
  const input = state.input as Record<string, unknown>;
  return getString(input.path) ?? getString(input.filePath);
}

function getLoaded(
  state: SessionMessageAssistantTool["state"],
): string[] | undefined {
  if (state.status === "streaming") return undefined;
  const meta =
    "metadata" in state
      ? (state as { metadata?: Record<string, unknown> }).metadata
      : undefined;
  if (!meta) return undefined;
  const loaded = meta.loaded;
  if (Array.isArray(loaded) && loaded.every((v) => typeof v === "string"))
    return loaded;
  return undefined;
}

export function ReadTool({ part }: { part: SessionMessageAssistantTool }) {
  const { colors } = useTheme();
  const fullPath = getFullPath(part.state);
  const loaded = getLoaded(part.state);

  if (!fullPath) return null;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.iconWrap}>
          <ArrowRight size={12} color={colors.textSecondary} />
        </View>
        <Text variant="mono" color="textSecondary" style={styles.headerText}>
          Read {displayPath(fullPath)}
        </Text>
      </View>
      {loaded?.map((filepath, i) => (
        <View key={i} style={styles.loadedRow}>
          <View style={styles.iconWrap}>
            <CornerDownRight size={12} color={colors.textSecondary} />
          </View>
          <Text variant="caption" color="textSecondary" style={styles.loadedText}>
            Loaded {displayPath(filepath)}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  iconWrap: {
    height: typography.mono.lineHeight,
    justifyContent: "center",
  },
  headerText: {
    marginLeft: spacing.xs,
  },
  loadedRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingLeft: spacing.md,
  },
  loadedText: {
    marginLeft: spacing.xs,
  },
});
