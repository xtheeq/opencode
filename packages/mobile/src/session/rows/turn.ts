import type {
  SessionMessageAssistant,
  SessionMessageInfo,
} from "@opencode/client/promise";

// A turn starts at a user or shell message and closes at an idle marker (or at
// the next user/shell in legacy histories without markers). Assistant messages
// and notices attach to the current turn.
export type Turn = {
  id: string;
  userMessageID?: string;
  shellMessageID?: string;
  /** Assistant messages and notices that belong to this turn, in order. */
  messages: SessionMessageInfo[];
};

export function isTerminalAssistant(message: SessionMessageAssistant): boolean {
  return (
    Boolean(
      message.finish && !["tool-calls", "unknown"].includes(message.finish),
    ) || Boolean(message.error)
  );
}

export function isNotice(message: SessionMessageInfo): boolean {
  return (
    message.type !== "user" &&
    message.type !== "assistant" &&
    message.type !== "shell" &&
    message.type !== "idle"
  );
}

export function foldTurns(messages: SessionMessageInfo[]): {
  leading: SessionMessageInfo[];
  turns: Turn[];
} {
  const leading: SessionMessageInfo[] = [];
  const turns: Turn[] = [];
  const byUserID = new Map<string, Turn>();
  let current: Turn | undefined;

  for (const message of messages) {
    if (message.type === "idle") {
      current = undefined;
      continue;
    }
    if (isNotice(message)) {
      if (current) current.messages.push(message);
      else leading.push(message);
      continue;
    }
    if (message.type === "shell") {
      current = { id: message.id, shellMessageID: message.id, messages: [] };
      turns.push(current);
      continue;
    }
    if (message.type === "user") {
      const existing = byUserID.get(message.id);
      if (existing) {
        current = existing;
        continue;
      }
      current = { id: message.id, userMessageID: message.id, messages: [] };
      byUserID.set(message.id, current);
      turns.push(current);
      continue;
    }
    // An assistant attaches to the current turn only when it has a user, or when
    // the turn is a leading bag of assistants; a shell turn is standalone.
    if (current?.userMessageID) {
      current.messages.push(message);
      continue;
    }
    if (current && !current.userMessageID && !current.shellMessageID) {
      current.messages.push(message);
      continue;
    }
    current = { id: message.id, messages: [message] };
    turns.push(current);
  }

  return { leading, turns };
}

export function findTerminalAssistant(
  turn: Turn,
): SessionMessageAssistant | undefined {
  for (let index = turn.messages.length - 1; index >= 0; index--) {
    const message = turn.messages[index];
    if (
      message?.type === "assistant" &&
      (isTerminalAssistant(message) || Boolean(message.retry))
    )
      return message;
  }
  return undefined;
}
