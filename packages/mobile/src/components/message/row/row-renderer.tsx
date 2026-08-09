import type { SessionRow } from "@/types/rows";
import { UserMessageRow } from "./user-message-row";
import { AssistantPartRow } from "./assistant-part-row";
import { ReasoningGroupRow } from "./reasoning-group-row";
import { ExplorationGroupRow } from "./exploration-group-row";
import { AssistantFooterRow } from "./assistant-footer-row";
import { SystemMessageRow } from "./system-message-row";
import { ShellMessageRow } from "./shell-message-row";
import { CompactionMessageRow } from "./compaction-message-row";

export function RowRenderer({ row }: { row: SessionRow }) {
  switch (row.type) {
    case "user-message":
      return <UserMessageRow message={row.message} />;
    case "assistant-part":
      return <AssistantPartRow part={row.part} />;
    case "reasoning-group":
      return (
        <ReasoningGroupRow
          message={row.message}
          parts={row.parts}
          completed={row.completed}
        />
      );
    case "exploration-group":
      return <ExplorationGroupRow parts={row.parts} />;
    case "assistant-footer":
      return <AssistantFooterRow message={row.message} />;
    case "system-message":
      return <SystemMessageRow message={row.message} />;
    case "shell-message":
      return <ShellMessageRow message={row.message} />;
    case "compaction-message":
      return <CompactionMessageRow message={row.message} />;
    case "turn-usage":
      return null;
  }
}
