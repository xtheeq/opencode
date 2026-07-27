export type PartRef = {
  messageID: string;
  partID: string;
};

export type CacheUsage = {
  read: number;
  model: { id: string; providerID: string; variant?: string };
};

export const EXPLORATION_TOOLS = new Set(["read", "glob", "grep"]);

export function isExploration(name: string) {
  return EXPLORATION_TOOLS.has(name.toLowerCase());
}

export type SessionRow =
  | { type: "user-message"; messageID: string }
  | { type: "assistant-part"; ref: PartRef }
  | { type: "reasoning-group"; refs: PartRef[]; completed: boolean }
  | {
      type: "exploration-group";
      refs: PartRef[];
      pending: string[];
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
      return `part:${row.ref.messageID}:${row.ref.partID}`;
    case "reasoning-group":
      return `reasoning:${row.refs[0].messageID}`;
    case "exploration-group":
      return `exploration:${row.refs[0].messageID}`;
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
