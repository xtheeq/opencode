import type {
  SessionMessageInfo,
  SessionMessageAssistant,
  TokenUsageInfo,
} from "@opencode-ai/client/promise";
import {
  isExploration,
  type CacheUsage,
  type PartRef,
  type SessionRow,
} from "../types/rows";

export function projectRows(
  messages: SessionMessageInfo[],
  options?: {
    turnTokens?: boolean;
    inputs?: Set<string>;
  },
): SessionRow[] {
  const inputs = options?.inputs ?? new Set<string>();
  const turnTokens = options?.turnTokens ?? false;

  const isInput = (message: SessionMessageInfo) => inputs.has(message.id);

  const pendingCompactions = messages.filter(
    (message) => message.type === "compaction" && message.status === "running",
  );

  const pending = new Set([
    ...pendingCompactions.map((message) => message.id),
    ...inputs,
  ]);

  const usage = turnTokens
    ? {
        steps: [] as SessionMessageAssistant[],
        previousTurnCache: undefined as CacheUsage | undefined,
      }
    : undefined;

  return [
    ...messages.filter((message) => !pending.has(message.id)),
    ...pendingCompactions,
    ...messages.filter(isInput),
  ].reduce<SessionRow[]>((rows, message) => {
    if (message.type !== "assistant") {
      if (message.type === "synthetic" && !message.description?.trim())
        return rows;
      if (
        message.type === "compaction" &&
        message.status === "completed" &&
        usage
      )
        usage.previousTurnCache = undefined;
      if (!pending.has(message.id)) completePrevious(rows);
      rows.push(messageToRowType(message));
      return rows;
    }

    usage?.steps.push(message);

    const ordinals = { text: 0, reasoning: 0 };
    message.content.forEach((part) => {
      const partID =
        part.type === "tool"
          ? part.id
          : `${part.type}:${ordinals[part.type]++}`;

      if (
        (part.type === "text" || part.type === "reasoning") &&
        !part.text.trim()
      )
        return;

      const ref: PartRef = { messageID: message.id, partID };

      if (part.type === "reasoning") {
        appendReasoning(rows, ref);
      } else if (part.type === "tool" && isExploration(part.name)) {
        appendExploration(rows, ref);
      } else {
        completePrevious(rows);
        rows.push({ type: "assistant-part", ref });
      }
    });

    const terminal =
      (message.finish && !["tool-calls", "unknown"].includes(message.finish)) ||
      message.error;

    if (terminal || message.retry) {
      completePrevious(rows);
      rows.push({ type: "assistant-footer", messageID: message.id });
    }

    if (terminal && usage) {
      const stepsWithUsage = usage.steps.filter(hasTokenUsage);
      const last = stepsWithUsage.at(-1);
      if (last) {
        rows.push({
          type: "turn-usage",
          messageIDs: stepsWithUsage.map((step) => step.id),
          ...(usage.previousTurnCache === undefined
            ? {}
            : { previousCache: usage.previousTurnCache }),
        });
        usage.previousTurnCache = {
          read: last.tokens.cache.read,
          model: last.model,
        };
      }
      usage.steps.length = 0;
    }

    return rows;
  }, []);
}

function messageToRowType(message: SessionMessageInfo): SessionRow {
  switch (message.type) {
    case "user":
      return { type: "user-message", messageID: message.id };
    case "shell":
      return { type: "shell-message", messageID: message.id };
    case "compaction":
      return { type: "compaction-message", messageID: message.id };
    default:
      return { type: "system-message", messageID: message.id };
  }
}

function completePrevious(rows: SessionRow[], index = rows.length) {
  const prev = rows[index - 1];
  if (
    prev &&
    (prev.type === "reasoning-group" || prev.type === "exploration-group")
  ) {
    prev.completed = true;
  }
}

function appendReasoning(rows: SessionRow[], ref: PartRef) {
  const prev = rows[rows.length - 1];
  if (prev?.type === "reasoning-group") {
    prev.refs.push(ref);
    return;
  }
  completePrevious(rows);
  rows.push({ type: "reasoning-group", refs: [ref], completed: false });
}

function appendExploration(rows: SessionRow[], ref: PartRef) {
  const prev = rows[rows.length - 1];
  if (prev?.type === "exploration-group") {
    prev.refs.push(ref);
    return;
  }
  completePrevious(rows);
  rows.push({
    type: "exploration-group",
    refs: [ref],
    pending: [],
    completed: false,
  });
}

function hasTokenUsage(
  message: SessionMessageAssistant,
): message is SessionMessageAssistant & {
  tokens: NonNullable<SessionMessageAssistant["tokens"]>;
} {
  return message.tokens !== undefined && tokenTotal(message.tokens) > 0;
}

function tokenTotal(tokens: TokenUsageInfo) {
  return (
    tokens.input +
    tokens.output +
    tokens.reasoning +
    tokens.cache.read +
    tokens.cache.write
  );
}

export function cacheReuseDrop(
  previous: CacheUsage | undefined,
  current: CacheUsage,
): number | undefined {
  if (previous === undefined) return;

  if (
    previous.model.providerID !== current.model.providerID ||
    previous.model.id !== current.model.id ||
    previous.model.variant !== current.model.variant
  )
    return;

  const drop = previous.read - current.read;

  if (current.model.providerID === "openai" && drop >= 1_024 && drop <= 2_048)
    return;

  return drop > 0 ? drop : undefined;
}
