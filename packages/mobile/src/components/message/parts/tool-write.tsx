import type { SessionMessageAssistantTool } from "@opencode/client/promise";
import { GenericTool } from "./generic-tool";

export function WriteTool({ part }: { part: SessionMessageAssistantTool }) {
  return <GenericTool part={part} />;
}
