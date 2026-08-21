import Wrench from "lucide-react-native/icons/wrench";
import type { SessionMessageAssistantTool } from "@opencode-ai/client/promise";
import { Text } from "@/components/primitives";
import { BasicTool } from "./basic-tool";
import {
  stripAnsi,
  toolArgs,
  toolError,
  toolInput,
  toolLabel,
  toolOutput,
} from "@/utils/tool-state";

export function GenericTool({ part }: { part: SessionMessageAssistantTool }) {
  const input = toolInput(part);
  const output = toolOutput(part);
  const error = toolError(part);
  const skipped = part.executed === false;

  const body = error ? (
    <Text variant="caption" color="error">
      {error}
    </Text>
  ) : output ? (
    <Text variant="mono" selectable>
      {stripAnsi(output)}
    </Text>
  ) : skipped ? (
    <Text variant="caption" color="secondary">
      (skipped)
    </Text>
  ) : undefined;

  return (
    <BasicTool
      icon={Wrench}
      title={`Called \`${part.name}\``}
      subtitle={toolLabel(input)}
      args={toolArgs(input)}
      status={part.state.status}
    >
      {body}
    </BasicTool>
  );
}
