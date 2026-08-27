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

  const body = output ? (
    <Text variant="mono" selectable>
      {stripAnsi(output)}
    </Text>
  ) : undefined;

  return (
    <BasicTool
      icon={Wrench}
      title={`Called \`${part.name}\``}
      subtitle={toolLabel(input)}
      args={toolArgs(input)}
      status={part.state.status}
      error={error}
    >
      {body}
    </BasicTool>
  );
}
