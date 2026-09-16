import type { SessionMessageAssistantTool } from "@opencode/client/promise";
import { GenericTool } from "./generic-tool";
import { WriteTool } from "./tool-write";
import { EditTool } from "./tool-edit";
import { BashTool } from "./tool-bash";
import { PatchTool } from "./tool-patch";
import { ReadTool } from "./tool-read";

// No per-part key here: LegendList recycles this cell across tool rows of the
// same type, and a key would force a full remount of the tool subtree on every
// recycle. Expanded state resets via BasicTool's resetKey instead.
export function ToolPart({ part }: { part: SessionMessageAssistantTool }) {
  switch (part.name) {
    case "write":
    case "create":
      return <WriteTool part={part} />;
    case "edit":
      return <EditTool part={part} />;
    case "bash":
    case "shell":
      return <BashTool part={part} />;
    case "patch":
    case "apply_patch":
      return <PatchTool part={part} />;
    case "read":
      return <ReadTool part={part} />;
    default:
      return <GenericTool part={part} />;
  }
}
