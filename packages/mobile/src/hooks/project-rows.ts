import type {
  SessionMessageAssistant,
  SessionMessageIdle,
  SessionMessageInfo,
  TokenUsageInfo,
} from "@opencode/client/promise";
import { isExploration, type CacheUsage, type SessionRow } from "../types/rows";

// Each message's projected rows are cached by message object identity. immer
// preserves identity for unchanged messages, so a re-projection only rebuilds
// rows for messages that actually changed, and unchanged rows keep their object
// references across renders. LegendList then skips re-rendering untouched rows
// (dataProp[i] === previousData[i]) instead of re-invoking renderItem for the
// whole visible timeline on every streaming delta.
const projectionCache = new WeakMap<SessionMessageInfo, SessionRow[]>();

// A message's row structure depends only on the shape of its content (part
// order, ids, and empty/non-empty visibility) plus its terminal flags, never on
// the text itself. When a streaming delta changes a message object but not its
// structure, the previous rows are reused, so the active message's tool and
// reasoning rows keep their identity and content is read live by the row view.
type StructureEntry = { structure: string; rows: SessionRow[] };
const STRUCTURE_CACHE_LIMIT = 512;
const structureCache = new Map<string, StructureEntry>();

function readStructure(id: string) {
  const entry = structureCache.get(id);
  if (entry) {
    structureCache.delete(id);
    structureCache.set(id, entry);
  }
  return entry;
}

function writeStructure(id: string, entry: StructureEntry) {
  structureCache.delete(id);
  structureCache.set(id, entry);
  if (structureCache.size > STRUCTURE_CACHE_LIMIT) {
    const oldest = structureCache.keys().next().value;
    if (oldest !== undefined) structureCache.delete(oldest);
  }
}

// Returning the identical rows array when nothing structural changed keeps the
// LegendList data reference stable across content deltas.
let lastOrderKey = "";
let lastRows: SessionRow[] = [];

// Diagnostic counters for the projection baseline.
export type ProjectionStats = {
  runs: number;
  projectedMessages: number;
  cachedMessages: number;
  reusedMessages: number;
};

export const projectionStats: ProjectionStats = {
  runs: 0,
  projectedMessages: 0,
  cachedMessages: 0,
  reusedMessages: 0,
};

export function resetProjectionStats() {
  projectionStats.runs = 0;
  projectionStats.projectedMessages = 0;
  projectionStats.cachedMessages = 0;
  projectionStats.reusedMessages = 0;
}

type NonAssistantMessage = Exclude<
  SessionMessageInfo,
  SessionMessageAssistant | SessionMessageIdle
>;

export function projectRows(
  messages: SessionMessageInfo[],
  options?: {
    turnTokens?: boolean;
    inputs?: Set<string>;
  },
): SessionRow[] {
  projectionStats.runs += 1;
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

  const reuseArray = inputs.size === 0;
  const orderKey = reuseArray ? ordered.map((message) => message.id).join("\n") : "";
  const rows: SessionRow[] = [];
  let changed = false;

  for (const message of ordered) {
    const cached = projectionCache.get(message);
    if (cached) {
      projectionStats.cachedMessages += 1;
      rows.push(...cached);
      continue;
    }
    const structure = messageStructure(message);
    const prior = readStructure(message.id);
    if (prior?.structure === structure) {
      projectionStats.reusedMessages += 1;
      projectionCache.set(message, prior.rows);
      rows.push(...prior.rows);
      continue;
    }
    changed = true;
    projectionStats.projectedMessages += 1;
    const projected = projectMessage(message);
    writeStructure(message.id, { structure, rows: projected });
    projectionCache.set(message, projected);
    rows.push(...projected);
  }

  if (reuseArray && !changed && orderKey === lastOrderKey) return lastRows;
  if (reuseArray) {
    lastOrderKey = orderKey;
    lastRows = rows;
  }
  return rows;
}

// Content shape of a message, excluding text/state values. Two messages with the
// same structure project to the same rows.
function messageStructure(message: SessionMessageInfo): string {
  if (message.type === "assistant") {
    let text = 0;
    let reasoning = 0;
    const parts = message.content.map((part) => {
      if (part.type === "tool") return `t:${part.id}:${part.name}`;
      const ordinal = part.type === "text" ? text++ : reasoning++;
      return `${part.type}:${ordinal}:${part.text.trim() ? 1 : 0}`;
    });
    return [
      message.finish ?? "",
      message.error ? 1 : 0,
      message.retry ? 1 : 0,
      parts.join(","),
    ].join("|");
  }
  if (message.type === "synthetic")
    return `synthetic:${message.description?.trim() ? 1 : 0}`;
  return message.type;
}

// Each message's projection is self-contained: reasoning/exploration parts
// group only with adjacent same-type parts of the same message, so projected
// rows never depend on neighboring messages and cache entries stay valid.
function projectMessage(message: SessionMessageInfo): SessionRow[] {
  if (message.type !== "assistant") {
    if (message.type === "synthetic" && !message.description?.trim()) return [];
    if (message.type === "idle") return [];
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
      appendReasoning(rows, message.id, partID);
    } else if (part.type === "tool" && isExploration(part.name)) {
      appendExploration(rows, message.id, partID);
    } else {
      completePrevious(rows);
      rows.push({
        type: "assistant-part",
        messageID: message.id,
        partID,
        kind: part.type,
      });
    }
  });

  const terminal =
    (message.finish && !["tool-calls", "unknown"].includes(message.finish)) ||
    message.error;

  if (terminal || message.retry) {
    completePrevious(rows);
    rows.push({ type: "assistant-footer", messageID: message.id });
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
      if (message.type === "synthetic" && !message.description?.trim())
        continue;
      if (message.type === "idle") continue;
      if (message.type === "compaction" && message.status === "completed")
        usage.previousTurnCache = undefined;
      rows.push(messageToRow(message));
      continue;
    }

    usage.steps.push(message);
    projectionStats.projectedMessages += 1;
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
      return { type: "user-message", messageID: message.id };
    case "shell":
      return { type: "shell-message", messageID: message.id };
    case "compaction":
      return { type: "compaction-message", messageID: message.id };
    default:
      return { type: "system-message", messageID: message.id };
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
  messageID: string,
  partID: string,
) {
  const prev = rows[rows.length - 1];
  if (prev?.type === "reasoning-group") {
    prev.parts.push({ messageID, partID });
    return;
  }
  completePrevious(rows);
  rows.push({
    type: "reasoning-group",
    messageID,
    parts: [{ messageID, partID }],
    completed: false,
  });
}

function appendExploration(
  rows: SessionRow[],
  messageID: string,
  partID: string,
) {
  const prev = rows[rows.length - 1];
  if (prev?.type === "exploration-group") {
    prev.parts.push({ messageID, partID });
    return;
  }
  completePrevious(rows);
  rows.push({ type: "exploration-group", parts: [{ messageID, partID }] });
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
