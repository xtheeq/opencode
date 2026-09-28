import ChevronDown from "lucide-react-native/icons/chevron-down";
import ChevronRight from "lucide-react-native/icons/chevron-right";
import { useRecyclingState } from "@legendapp/list/react-native";
import {
  View,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { BubbleContainer } from "../bubble-container";
import { Text } from "@/components/primitives";
import { MarkdownPart } from "@/components/markdown";
import { spacing, typography, useTheme } from "@/theme";
import type { PartRef } from "@/types/rows";
import {
  useSessionMessage,
  useSessionParts,
} from "@/hooks/use-row-content";

function extractTitle(text: string): string | undefined {
  const bold = text.match(/^\s*\*\*(.+?)\*\*/);
  if (bold) return bold[1];
  const heading = text.match(/^\s*#\s+(.+)/m);
  if (heading) return heading[1];
  return undefined;
}

function sanitize(text: string): string {
  return text.replace(/\[REDACTED\]/g, "");
}

function formatDuration(completed: number, created: number): string {
  const seconds = Math.round((completed - created) / 1000);
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

export function ReasoningGroupRow({
  sessionID,
  messageID,
  parts,
  completed,
}: {
  sessionID: string;
  messageID: string;
  parts: PartRef[];
  completed: boolean;
}) {
  const { colors } = useTheme();
  // Reasoning groups share a recycling pool, so plain useState would leak the
  // previous group's expanded state into a recycled cell. useRecyclingState
  // re-seeds from `completed` whenever the cell is assigned a different group.
  const [expanded, setExpanded] = useRecyclingState<boolean>(() => !completed);
  const message = useSessionMessage(sessionID, messageID);
  const resolved = useSessionParts(sessionID, parts);

  const text = sanitize(
    resolved.flatMap((part) => (part.type === "reasoning" ? [part.text] : [])).join("\n"),
  );
  const title = extractTitle(text);
  const duration =
    completed && message?.type === "assistant" && message.time.completed
      ? formatDuration(message.time.completed, message.time.created)
      : undefined;

  if (!text) return null;

  return (
    <BubbleContainer alignment="flex-start" fullWidth>
      <View style={styles.container}>
        <TouchableOpacity
          onPress={() => setExpanded((v) => !v)}
          activeOpacity={0.7}
          style={styles.header}
        >
          {completed ? (
            <View style={styles.headerRow}>
              {expanded ? (
                <ChevronDown size={12} color={colors.text.secondary} />
              ) : (
                <ChevronRight size={12} color={colors.text.secondary} />
              )}
              <Text
                variant="caption"
                color="secondary"
                style={styles.headerText}
              >
                Thought{title ? `: ${title}` : ""}
                {duration ? ` · ${duration}` : ""}
              </Text>
            </View>
          ) : (
            <View style={styles.headerRow}>
              <ActivityIndicator size="small" color={colors.text.secondary} />
              <Text
                variant="caption"
                color="secondary"
                style={styles.headerText}
              >
                Thinking{title ? `: ${title}` : ""}...
              </Text>
            </View>
          )}
        </TouchableOpacity>
        {expanded && (
          <View
            style={[styles.content, { borderLeftColor: colors.border.default }]}
          >
            <MarkdownPart
              text={text}
              baseFontSize={typography.caption.fontSize}
            />
          </View>
        )}
      </View>
    </BubbleContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingVertical: spacing.xs,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerText: {
    marginLeft: spacing.xs,
  },
  content: {
    borderLeftWidth: 2,
    paddingLeft: spacing.sm,
    marginTop: spacing.xs,
  },
});
