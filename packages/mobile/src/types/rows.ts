import type {
  SessionMessageAgentSelected,
  SessionMessageAssistant,
  SessionMessageAssistantReasoning,
  SessionMessageAssistantText,
  SessionMessageAssistantTool,
  SessionMessageCompaction,
  SessionMessageLocationSwitched,
  SessionMessageModelSelected,
  SessionMessageShell,
  SessionMessageSkill,
  SessionMessageSynthetic,
  SessionMessageSystem,
  SessionMessageUser,
} from "@opencode-ai/client/promise";

export type CacheUsage = {
  read: number;
  model: { id: string; providerID: string; variant?: string };
};

export const EXPLORATION_TOOLS = new Set(["read", "glob", "grep"]);

export function isExploration(name: string) {
  return EXPLORATION_TOOLS.has(name.toLowerCase());
}

export type AssistantContentPart =
  | SessionMessageAssistantText
  | SessionMessageAssistantReasoning
  | SessionMessageAssistantTool;

export type ReasoningPart = SessionMessageAssistantReasoning;

export type ToolPart = SessionMessageAssistantTool;

export type Systemish =
  | SessionMessageAgentSelected
  | SessionMessageLocationSwitched
  | SessionMessageModelSelected
  | SessionMessageSynthetic
  | SessionMessageSystem
  | SessionMessageSkill;

// Rows are self-contained projections: each carries the resolved message (and
// part) it renders, so RowRenderer needs no lookup map and unchanged messages
// keep the same row object identity across renders.
export type SessionRow =
  | { type: "user-message"; message: SessionMessageUser }
  | {
      type: "assistant-part";
      message: SessionMessageAssistant;
      part: AssistantContentPart;
      partID: string;
    }
  | {
      type: "reasoning-group";
      message: SessionMessageAssistant;
      parts: ReasoningPart[];
      firstPartID: string;
      completed: boolean;
    }
  | { type: "exploration-group"; parts: ToolPart[] }
  | { type: "assistant-footer"; message: SessionMessageAssistant }
  | {
      type: "turn-usage";
      messageIDs: string[];
      previousCache?: CacheUsage;
    }
  | { type: "system-message"; message: Systemish }
  | { type: "shell-message"; message: SessionMessageShell }
  | { type: "compaction-message"; message: SessionMessageCompaction };

export function rowKey(row: SessionRow): string {
  switch (row.type) {
    case "user-message":
      return `user:${row.message.id}`;
    case "assistant-part":
      return `part:${row.message.id}:${row.partID}`;
    case "reasoning-group":
      return `reasoning:${row.message.id}:${row.firstPartID}`;
    case "exploration-group":
      return `exploration:${row.parts[0].id}`;
    case "assistant-footer":
      return `footer:${row.message.id}`;
    case "system-message":
      return `system:${row.message.id}`;
    case "shell-message":
      return `shell:${row.message.id}`;
    case "compaction-message":
      return `compaction:${row.message.id}`;
    case "turn-usage":
      return `usage:${row.messageIDs[0]}`;
  }
}
