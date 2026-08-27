import { View, StyleSheet } from "react-native";
import Eye from "lucide-react-native/icons/eye";
import CornerDownRight from "lucide-react-native/icons/corner-down-right";
import type { SessionMessageAssistantTool } from "@opencode-ai/client/promise";
import { Text } from "@/components/primitives";
import { spacing, typography, useTheme } from "@/theme";
import { BasicTool } from "./basic-tool";
import { toolError } from "@/utils/tool-state";

function getString(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  return undefined;
}

function getPath(value: unknown): string | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const record = value as Record<string, unknown>;
  return getString(record.path) ?? getString(record.filePath);
}

function displayPath(path: string): string {
  return path.startsWith("/")
    ? (path.split("/").filter(Boolean).pop() ?? path)
    : path;
}

function getFullPath(
  state: SessionMessageAssistantTool["state"],
): string | undefined {
  if (state.status === "streaming") {
    try {
      return getPath(JSON.parse(state.input));
    } catch {
      return getString(state.input);
    }
  }
  return getString(state.input.path) ?? getString(state.input.filePath);
}

function getLoaded(
  state: SessionMessageAssistantTool["state"],
): string[] | undefined {
  if (state.status === "streaming") return undefined;
  const loaded = state.metadata?.["loaded"];
  if (!Array.isArray(loaded)) return undefined;
  const strings = loaded.filter(
    (value): value is string => typeof value === "string",
  );
  return strings.length === loaded.length ? strings : undefined;
}

export function ReadTool({ part }: { part: SessionMessageAssistantTool }) {
  const { colors } = useTheme();
  const fullPath = getFullPath(part.state);
  const loaded = getLoaded(part.state);
  const error = toolError(part);

  if (!fullPath) return null;

  return (
    <BasicTool
      icon={Eye}
      title="Read"
      subtitle={displayPath(fullPath)}
      status={part.state.status}
      error={error}
    >
      {loaded?.map((filepath, i) => (
        <View key={i} style={styles.loadedRow}>
          <View style={styles.iconWrap}>
            <CornerDownRight size={12} color={colors.text.secondary} />
          </View>
          <Text variant="caption" color="secondary" style={styles.loadedText}>
            Loaded {displayPath(filepath)}
          </Text>
        </View>
      ))}
    </BasicTool>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    height: typography.mono.lineHeight,
    justifyContent: "center",
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
