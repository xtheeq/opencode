import type { SessionRow } from "@/types/rows";
import { UserMessageRow } from "./user-message-row";
import { AssistantPartRow } from "./assistant-part-row";
import { ActivityGroupRow } from "./activity-group-row";
import { AssistantFooterRow } from "./assistant-footer-row";
import { SystemMessageRow } from "./system-message-row";
import { ShellMessageRow } from "./shell-message-row";
import { CompactionMessageRow } from "./compaction-message-row";

export function RowRenderer({
  sessionID,
  row,
}: {
  sessionID: string;
  row: SessionRow;
}) {
  switch (row.type) {
    case "user-message":
      return <UserMessageRow sessionID={sessionID} messageID={row.messageID} />;
    case "assistant-part":
      return (
        <AssistantPartRow
          sessionID={sessionID}
          messageID={row.messageID}
          partID={row.partID}
        />
      );
    case "activity-group":
      return (
        <ActivityGroupRow
          sessionID={sessionID}
          parts={row.parts}
          completed={row.completed}
        />
      );
    case "assistant-footer":
      return (
        <AssistantFooterRow sessionID={sessionID} messageID={row.messageID} />
      );
    case "system-message":
      return <SystemMessageRow sessionID={sessionID} messageID={row.messageID} />;
    case "shell-message":
      return <ShellMessageRow sessionID={sessionID} messageID={row.messageID} />;
    case "compaction-message":
      return (
        <CompactionMessageRow sessionID={sessionID} messageID={row.messageID} />
      );
    case "turn-usage":
      return null;
  }
}
