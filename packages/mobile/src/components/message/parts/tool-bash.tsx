import { StyleSheet, View } from "react-native";
import Terminal from "lucide-react-native/icons/terminal";
import type { SessionMessageAssistantTool } from "@opencode-ai/client/promise";
import { Text } from "@/components/primitives";
import { borderRadius, spacing, useTheme } from "@/theme";
import { BasicTool } from "./basic-tool";
import {
  stripAnsi,
  toolInput,
  toolMetadata,
  toolOutput,
} from "@/utils/tool-state";

export function BashTool({ part }: { part: SessionMessageAssistantTool }) {
  const { colors } = useTheme();
  const input = toolInput(part);
  const metadata = toolMetadata(part);
  const command =
    (typeof input.command === "string" && input.command) ||
    (typeof metadata.command === "string" && metadata.command) ||
    "";
  const output = toolOutput(part);
  const text = `${command}${output ? `\n\n${output}` : ""}`.trim();

  return (
    <BasicTool
      icon={Terminal}
      title="Shell"
      subtitle={command || undefined}
      status={part.state.status}
      allowOpenWhilePending
    >
      {text ? (
        <View
          style={[
            styles.console,
            {
              borderColor: colors.border.default,
              backgroundColor: colors.background.inset,
            },
          ]}
        >
          <Text variant="mono" selectable>
            $ {text}
          </Text>
        </View>
      ) : undefined}
    </BasicTool>
  );
}

const styles = StyleSheet.create({
  console: {
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
  },
});
