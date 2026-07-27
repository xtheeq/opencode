import type { SessionMessageAssistantTool } from "@opencode-ai/client/promise";
import { GenericTool } from "./generic-tool";

export function BashTool({ part }: { part: SessionMessageAssistantTool }) {
  return <GenericTool part={part} />;
}
