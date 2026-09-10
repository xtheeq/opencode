import type { SessionMessageAssistantTool } from "@opencode/client/promise";
import { GenericTool } from "./generic-tool";

export function PatchTool({ part }: { part: SessionMessageAssistantTool }) {
  return <GenericTool part={part} />;
}
