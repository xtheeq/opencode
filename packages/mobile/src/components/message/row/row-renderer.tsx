import type { SessionRow } from "@/types/rows";
import type { SessionMessageInfo } from "@opencode-ai/client/promise";
import { resolvePart } from "@/hooks/project-rows";
import { UserMessageRow } from "./user-message-row";
import { AssistantPartRow } from "./assistant-part-row";
import { ReasoningGroupRow } from "./reasoning-group-row";
import { ExplorationGroupRow } from "./exploration-group-row";
import { AssistantFooterRow } from "./assistant-footer-row";
import { SystemMessageRow } from "./system-message-row";
import { ShellMessageRow } from "./shell-message-row";
import { CompactionMessageRow } from "./compaction-message-row";

export function RowRenderer({
  row,
  messages,
}: {
  row: SessionRow;
  messages: Map<string, SessionMessageInfo>;
}) {
  switch (row.type) {
    case "user-message": {
      const m = messages.get(row.messageID);
      if (m?.type !== "user") return null;
      return <UserMessageRow message={m} />;
    }
    case "assistant-part": {
      const m = messages.get(row.ref.messageID);
      if (m?.type !== "assistant") return null;
      const part = resolvePart(m, row.ref.partID);
      if (!part) return null;
      return <AssistantPartRow part={part} />;
    }
    case "reasoning-group": {
      const m = messages.get(row.refs[0]?.messageID);
      if (m?.type !== "assistant") return null;
      return (
        <ReasoningGroupRow
          message={m}
          refs={row.refs}
          completed={row.completed}
        />
      );
    }
    case "exploration-group": {
      const m = messages.get(row.refs[0]?.messageID);
      if (m?.type !== "assistant") return null;
      return (
        <ExplorationGroupRow
          message={m}
          refs={row.refs}
          pending={row.pending}
          completed={row.completed}
        />
      );
    }
    case "assistant-footer": {
      const m = messages.get(row.messageID);
      if (m?.type !== "assistant") return null;
      return <AssistantFooterRow message={m} />;
    }
    case "system-message": {
      const m = messages.get(row.messageID);
      if (!m) return null;
      return <SystemMessageRow message={m} />;
    }
    case "shell-message": {
      const m = messages.get(row.messageID);
      if (m?.type !== "shell") return null;
      return <ShellMessageRow message={m} />;
    }
    case "compaction-message": {
      const m = messages.get(row.messageID);
      if (m?.type !== "compaction") return null;
      return <CompactionMessageRow message={m} />;
    }
    case "turn-usage":
      return null;
  }
}
