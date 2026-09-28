import ChevronDown from "lucide-react-native/icons/chevron-down";
import ChevronRight from "lucide-react-native/icons/chevron-right";
import { useRecyclingState } from "@legendapp/list/react-native";
import {
  View,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import type { AssistantContentPart, PartRef } from "@/types/rows";
import { BubbleContainer } from "../bubble-container";
import { ToolPart } from "../parts";
import { Text } from "@/components/primitives";
import { MarkdownPart } from "@/components/markdown";
import { spacing, typography, useTheme } from "@/theme";
import { useSessionParts } from "@/hooks/use-row-content";

function summarize(
  parts: AssistantContentPart[],
  completed: boolean,
): string {
  let reasoning = 0;
  const tools = new Map<string, number>();
  for (const part of parts) {
    if (part.type === "reasoning") {
      reasoning++;
      continue;
    }
    if (part.type === "tool")
      tools.set(part.name, (tools.get(part.name) ?? 0) + 1);
  }
  const label =
    reasoning > 0 ? (completed ? "Thought" : "Thinking") : completed ? "Worked" : "Working";
  const toolText = [...tools.entries()]
    .map(([name, count]) => `${count} ${name}`)
    .join(", ");
  return toolText ? `${label} · ${toolText}` : label;
}

export function ActivityGroupRow({
  sessionID,
  parts,
  completed,
}: {
  sessionID: string;
  parts: PartRef[];
  completed: boolean;
}) {
  const { colors } = useTheme();
  // Activity groups share a recycling pool, so useRecyclingState re-seeds the
  // expanded state whenever the cell is assigned a different group.
  const [expanded, setExpanded] = useRecyclingState<boolean>(() => !completed);
  const resolved = useSessionParts(sessionID, parts);

  if (resolved.length === 0) return null;

  return (
    <BubbleContainer alignment="flex-start" fullWidth>
      <View style={styles.container}>
        <TouchableOpacity
          onPress={() => setExpanded((value) => !value)}
          activeOpacity={0.7}
          style={styles.header}
        >
          <View style={styles.headerRow}>
            {completed ? (
              expanded ? (
                <ChevronDown size={12} color={colors.text.secondary} />
              ) : (
                <ChevronRight size={12} color={colors.text.secondary} />
              )
            ) : (
              <ActivityIndicator size="small" color={colors.text.secondary} />
            )}
            <Text
              variant="caption"
              color="secondary"
              numberOfLines={1}
              style={styles.headerText}
            >
              {summarize(resolved, completed)}
            </Text>
          </View>
        </TouchableOpacity>
        {expanded && (
          <View
            style={[styles.content, { borderLeftColor: colors.border.default }]}
          >
            {resolved.map((part, index) => {
              const ref = parts[index];
              return (
                <View
                  key={`${ref.messageID}:${ref.partID}`}
                  style={styles.part}
                >
                  {part.type === "reasoning" ? (
                    <MarkdownPart
                      text={part.text}
                      baseFontSize={typography.caption.fontSize}
                    />
                  ) : part.type === "tool" ? (
                    <ToolPart part={part} />
                  ) : null}
                </View>
              );
            })}
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
    flexShrink: 1,
  },
  content: {
    borderLeftWidth: 2,
    paddingLeft: spacing.sm,
    marginTop: spacing.xs,
  },
  part: {
    marginBottom: spacing.xs,
  },
});
