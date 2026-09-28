import type {
  SessionMessageAssistantReasoning,
  SessionMessageAssistantText,
  SessionMessageAssistantTool,
} from "@opencode/client/promise";

export type CacheUsage = {
  read: number;
  model: { id: string; providerID: string; variant?: string };
};

export type AssistantContentPart =
  | SessionMessageAssistantText
  | SessionMessageAssistantReasoning
  | SessionMessageAssistantTool;

// A content part addressed by reference. Text/reasoning parts use their ordinal
// (`text:0`, `reasoning:1`); tools use their own id.
export type PartRef = { messageID: string; partID: string };

// Rows are structural: they carry only message/part references and grouping.
// Content is resolved from the store by the row component, so a content delta
// never changes a row object and LegendList can skip re-rendering it.
export type SessionRow =
  | { type: "user-message"; messageID: string }
  | {
      type: "assistant-part";
      messageID: string;
      partID: string;
      kind: AssistantContentPart["type"];
    }
  | {
      type: "activity-group";
      parts: PartRef[];
      completed: boolean;
    }
  | { type: "assistant-footer"; messageID: string }
  | {
      type: "turn-usage";
      messageIDs: string[];
      previousCache?: CacheUsage;
    }
  | { type: "system-message"; messageID: string }
  | { type: "shell-message"; messageID: string }
  | { type: "compaction-message"; messageID: string };

export function rowKey(row: SessionRow): string {
  switch (row.type) {
    case "user-message":
      return `user:${row.messageID}`;
    case "assistant-part":
      return `part:${row.messageID}:${row.partID}`;
    case "activity-group":
      return `activity:${row.parts[0]?.messageID}:${row.parts[0]?.partID}`;
    case "assistant-footer":
      return `footer:${row.messageID}`;
    case "system-message":
      return `system:${row.messageID}`;
    case "shell-message":
      return `shell:${row.messageID}`;
    case "compaction-message":
      return `compaction:${row.messageID}`;
    case "turn-usage":
      return `usage:${row.messageIDs[0]}`;
  }
}
