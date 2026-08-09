import type {
  SessionMessageAssistant,
  SessionMessageAssistantReasoning,
  SessionMessageAssistantTool,
  SessionMessageInfo,
  TokenUsageInfo,
} from "@opencode-ai/client/promise";
import {
  isExploration,
  type CacheUsage,
  type SessionRow,
} from "../types/rows";

// Each message's projected rows are cached by message object identity. immer
// preserves identity for unchanged messages, so a re-projection only rebuilds
// rows for messages that actually changed, and unchanged rows keep their object
// references across renders. LegendList then skips re-rendering untouched rows
// (dataProp[i] === previousData[i]) instead of re-invoking renderItem for the
// whole visible timeline on every streaming delta.
const projectionCache = new WeakMap<SessionMessageInfo, SessionRow[]>();

type NonAssistantMessage = Exclude<SessionMessageInfo, SessionMessageAssistant>;

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

  const ordered = [
    ...messages.filter((message) => !pending.has(message.id)),
    ...pendingCompactions,
    ...messages.filter(isInput),
  ];

  if (turnTokens) return projectWithUsage(ordered);

  const rows: SessionRow[] = [];
  for (const message of ordered) {
    const cached = projectionCache.get(message);
    if (cached) {
      rows.push(...cached);
      continue;
    }
    const projected = projectMessage(message);
    projectionCache.set(message, projected);
    rows.push(...projected);
  }
  return rows;
}

// Each message's projection is self-contained: reasoning/exploration parts
// group only with adjacent same-type parts of the same message, so projected
// rows never depend on neighboring messages and cache entries stay valid.
function projectMessage(message: SessionMessageInfo): SessionRow[] {
  if (message.type !== "assistant") {
    if (message.type === "synthetic" && !message.description?.trim()) return [];
    return [messageToRow(message)];
  }

  const rows: SessionRow[] = [];
  const ordinals = { text: 0, reasoning: 0 };

  message.content.forEach((part) => {
    const partID =
      part.type === "tool" ? part.id : `${part.type}:${ordinals[part.type]++}`;

    if (
      (part.type === "text" || part.type === "reasoning") &&
      !part.text.trim()
    )
      return;

    if (part.type === "reasoning") {
      appendReasoning(rows, message, part, partID);
    } else if (part.type === "tool" && isExploration(part.name)) {
      appendExploration(rows, part);
    } else {
      completePrevious(rows);
      rows.push({ type: "assistant-part", message, part, partID });
    }
  });

  const terminal =
    (message.finish && !["tool-calls", "unknown"].includes(message.finish)) ||
    message.error;

  if (terminal || message.retry) {
    completePrevious(rows);
    rows.push({ type: "assistant-footer", message });
  }

  return rows;
}

// Turn-token rows fold state across messages, so they bypass the per-message
// cache. Grouping semantics match projectMessage (message-scoped groups).
function projectWithUsage(ordered: SessionMessageInfo[]): SessionRow[] {
  const usage: {
    steps: SessionMessageAssistant[];
    previousTurnCache: CacheUsage | undefined;
  } = { steps: [], previousTurnCache: undefined };

  const rows: SessionRow[] = [];
  for (const message of ordered) {
    if (message.type !== "assistant") {
      if (message.type === "synthetic" && !message.description?.trim()) continue;
      if (message.type === "compaction" && message.status === "completed")
        usage.previousTurnCache = undefined;
      rows.push(messageToRow(message));
      continue;
    }

    usage.steps.push(message);
    rows.push(...projectMessage(message));

    const terminal =
      (message.finish && !["tool-calls", "unknown"].includes(message.finish)) ||
      message.error;

    if (terminal) {
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
  }
  return rows;
}

function messageToRow(message: NonAssistantMessage): SessionRow {
  switch (message.type) {
    case "user":
      return { type: "user-message", message };
    case "shell":
      return { type: "shell-message", message };
    case "compaction":
      return { type: "compaction-message", message };
    default:
      return { type: "system-message", message };
  }
}

function completePrevious(rows: SessionRow[]) {
  const prev = rows[rows.length - 1];
  if (prev?.type === "reasoning-group") {
    prev.completed = true;
  }
}

function appendReasoning(
  rows: SessionRow[],
  message: SessionMessageAssistant,
  part: SessionMessageAssistantReasoning,
  partID: string,
) {
  const prev = rows[rows.length - 1];
  if (prev?.type === "reasoning-group") {
    prev.parts.push(part);
    return;
  }
  completePrevious(rows);
  rows.push({
    type: "reasoning-group",
    message,
    parts: [part],
    firstPartID: partID,
    completed: false,
  });
}

function appendExploration(
  rows: SessionRow[],
  part: SessionMessageAssistantTool,
) {
  const prev = rows[rows.length - 1];
  if (prev?.type === "exploration-group") {
    prev.parts.push(part);
    return;
  }
  completePrevious(rows);
  rows.push({ type: "exploration-group", parts: [part] });
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
