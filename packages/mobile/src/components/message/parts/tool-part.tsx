import type { SessionMessageAssistantTool } from "@opencode-ai/client/promise";
import { GenericTool } from "./generic-tool";
import { WriteTool } from "./tool-write";
import { EditTool } from "./tool-edit";
import { BashTool } from "./tool-bash";
import { PatchTool } from "./tool-patch";
import { ReadTool } from "./tool-read";

// Key by part id so recycled cells reset expand/collapse state; LegendList
// omits row keys (recycleItems), so state would otherwise persist across parts.
export function ToolPart({ part }: { part: SessionMessageAssistantTool }) {
  switch (part.name) {
    case "write":
    case "create":
      return <WriteTool key={part.id} part={part} />;
    case "edit":
      return <EditTool key={part.id} part={part} />;
    case "bash":
    case "shell":
      return <BashTool key={part.id} part={part} />;
    case "patch":
    case "apply_patch":
      return <PatchTool key={part.id} part={part} />;
    case "read":
      return <ReadTool key={part.id} part={part} />;
    default:
      return <GenericTool key={part.id} part={part} />;
  }
}
