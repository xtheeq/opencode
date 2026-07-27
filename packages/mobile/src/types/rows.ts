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
