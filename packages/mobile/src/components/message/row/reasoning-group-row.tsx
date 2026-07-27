import ChevronDown from "lucide-react-native/icons/chevron-down";
import ChevronRight from "lucide-react-native/icons/chevron-right";
import { useState } from "react";
import { View, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import type { SessionMessageAssistant } from "@opencode-ai/client/promise";
import { BubbleContainer } from "../bubble-container";
import { Text } from "@/components/primitives";
import { MarkdownPart } from "@/components/markdown";
import { spacing, typography, useTheme } from "@/theme";
import { resolvePart } from "@/hooks/project-rows";
import type { PartRef } from "@/types/rows";

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
  message,
  refs,
  completed,
}: {
  message: SessionMessageAssistant;
  refs: PartRef[];
  completed: boolean;
}) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(!completed);

  const parts = refs
    .map((ref) => resolvePart(message, ref.partID))
    .filter(
      (
        p,
      ): p is SessionMessageAssistant["content"][number] & {
        type: "reasoning";
        text: string;
      } => p?.type === "reasoning",
    );
  const text = sanitize(parts.map((p) => p.text).join("\n"));
  const title = extractTitle(text);
  const duration =
    completed && message.time.completed
      ? formatDuration(message.time.completed, message.time.created)
      : undefined;

  if (!text) return null;

  return (
    <BubbleContainer alignment="flex-start">
      <View style={styles.container}>
        <TouchableOpacity
          onPress={() => setExpanded((v) => !v)}
          activeOpacity={0.7}
          style={styles.header}
        >
          {completed ? (
            <View style={styles.headerRow}>
              {expanded ? (
                <ChevronDown size={12} color={colors.textSecondary} />
              ) : (
                <ChevronRight size={12} color={colors.textSecondary} />
              )}
              <Text variant="caption" color="textSecondary" style={styles.headerText}>
                Thought{title ? `: ${title}` : ""}
                {duration ? ` · ${duration}` : ""}
              </Text>
            </View>
          ) : (
            <View style={styles.headerRow}>
              <ActivityIndicator size="small" color={colors.textSecondary} />
              <Text variant="caption" color="textSecondary" style={styles.headerText}>
                Thinking{title ? `: ${title}` : ""}...
              </Text>
            </View>
          )}
        </TouchableOpacity>
        {expanded && (
          <View
            style={[
              styles.content,
              { borderLeftColor: colors.textSecondary },
            ]}
          >
            <MarkdownPart text={text} baseFontSize={typography.caption.fontSize} />
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
