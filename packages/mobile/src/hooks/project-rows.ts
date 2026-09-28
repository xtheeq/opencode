import type {
  SessionMessageAssistant,
  SessionMessageInfo,
  TokenUsageInfo,
} from "@opencode/client/promise";
import { groupEntries, type GroupNode } from "../session/rows/tree";
import {
  findTerminalAssistant,
  foldTurns,
  isTerminalAssistant,
  type Turn,
} from "../session/rows/turn";
import {
  rowKey,
  type AssistantContentPart,
  type CacheUsage,
  type PartRef,
  type SessionRow,
} from "../types/rows";

// A message's structural signature depends only on the shape of its content
// (part order, ids, tool names/status, and empty/non-empty visibility) plus its
// terminal flags, never on text. The session signature is the ordered list of
// per-message signatures, so a text delta leaves it unchanged and the previous
// rows are returned untouched.
const structureByMessage = new WeakMap<SessionMessageInfo, string>();

function messageStructure(message: SessionMessageInfo): string {
  const cached = structureByMessage.get(message);
  if (cached !== undefined) return cached;
  const structure = computeStructure(message);
  structureByMessage.set(message, structure);
  return structure;
}

function computeStructure(message: SessionMessageInfo): string {
  if (message.type === "assistant") {
    let text = 0;
    let reasoning = 0;
    const parts = message.content.map((part) => {
      if (part.type === "tool")
        return `t:${part.id}:${part.name}:${part.state.status}`;
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

function sessionStructure(messages: SessionMessageInfo[]): string {
  let result = "";
  for (const message of messages)
    result += `${message.id}:${messageStructure(message)}\n`;
  return result;
}

let lastSignature = "";
let lastRows: SessionRow[] = [];

// Diagnostic counters for the projection baseline.
export type ProjectionStats = {
  runs: number;
  projections: number;
  cached: number;
};

export const projectionStats: ProjectionStats = {
  runs: 0,
  projections: 0,
  cached: 0,
};

export function resetProjectionStats() {
  projectionStats.runs = 0;
  projectionStats.projections = 0;
  projectionStats.cached = 0;
}

type TurnEntry =
  | { kind: "part"; ref: PartRef; part: AssistantContentPart }
  | { kind: "row"; row: SessionRow };

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
    ...messages.filter((message) => inputs.has(message.id)),
  ];

  if (turnTokens) {
    projectionStats.projections += 1;
    return projectWithUsage(ordered);
  }

  const signature = sessionStructure(ordered);
  if (signature === lastSignature) {
    projectionStats.cached += 1;
    return lastRows;
  }
  projectionStats.projections += 1;
  const rows = reuseRows(lastRows, projectOrdered(ordered));
  lastSignature = signature;
  lastRows = rows;
  return rows;
}

function projectOrdered(messages: SessionMessageInfo[]): SessionRow[] {
  const rows: SessionRow[] = [];
  const { leading, turns } = foldTurns(messages);
  for (const message of leading) {
    const row = noticeRow(message);
    if (row) rows.push(row);
  }
  for (const turn of turns) rows.push(...projectTurn(turn));
  return rows;
}

function projectTurn(turn: Turn): SessionRow[] {
  const rows: SessionRow[] = [];
  if (turn.userMessageID)
    rows.push({ type: "user-message", messageID: turn.userMessageID });
  if (turn.shellMessageID)
    rows.push({ type: "shell-message", messageID: turn.shellMessageID });

  const entries: TurnEntry[] = [];
  for (const message of turn.messages) {
    if (message.type === "assistant") {
      entries.push(...assistantEntries(message));
      continue;
    }
    const row = noticeRow(message);
    if (row) entries.push({ kind: "row", row });
  }

  const nodes = groupEntries(entries, entryPath);
  const ended = turn.messages.some(
    (message) =>
      message.type === "assistant" &&
      (isTerminalAssistant(message) || Boolean(message.retry)),
  );
  nodes.forEach((node, index) => {
    if (node.type === "entry") {
      rows.push(entryRow(node.entry));
      return;
    }
    rows.push({
      type: "activity-group",
      parts: collectRefs(node),
      completed: index < nodes.length - 1 || ended,
    });
  });

  const terminal = findTerminalAssistant(turn);
  if (terminal) rows.push({ type: "assistant-footer", messageID: terminal.id });
  return rows;
}

function assistantEntries(message: SessionMessageAssistant): TurnEntry[] {
  const entries: TurnEntry[] = [];
  const ordinals = { text: 0, reasoning: 0 };
  for (const part of message.content) {
    const partID =
      part.type === "tool" ? part.id : `${part.type}:${ordinals[part.type]++}`;
    if ((part.type === "text" || part.type === "reasoning") && !part.text.trim())
      continue;
    entries.push({ kind: "part", ref: { messageID: message.id, partID }, part });
  }
  return entries;
}

// Text and standalone tools (questions, errors) break an activity run; every
// other reasoning/tool part folds into the surrounding activity group.
function entryPath(entry: TurnEntry): readonly "activity"[] {
  if (entry.kind === "row") return [];
  const part = entry.part;
  if (part.type !== "tool") return part.type === "text" ? [] : ["activity"];
  if (part.name === "question") return [];
  if (part.state.status === "error") return [];
  return ["activity"];
}

function entryRow(entry: TurnEntry): SessionRow {
  if (entry.kind === "row") return entry.row;
  return {
    type: "assistant-part",
    messageID: entry.ref.messageID,
    partID: entry.ref.partID,
    kind: entry.part.type,
  };
}

type ActivityGroupNode = Extract<
  GroupNode<TurnEntry, "activity">,
  { type: "group" }
>;

function collectRefs(node: ActivityGroupNode): PartRef[] {
  return node.children.flatMap((child) => {
    if (child.type === "entry") {
      return child.entry.kind === "part" ? [child.entry.ref] : [];
    }
    return collectRefs(child);
  });
}

function noticeRow(message: SessionMessageInfo): SessionRow | undefined {
  if (message.type === "synthetic")
    return message.description?.trim()
      ? { type: "system-message", messageID: message.id }
      : undefined;
  if (message.type === "user")
    return { type: "user-message", messageID: message.id };
  if (message.type === "shell")
    return { type: "shell-message", messageID: message.id };
  if (message.type === "compaction")
    return { type: "compaction-message", messageID: message.id };
  if (message.type === "assistant" || message.type === "idle") return undefined;
  return { type: "system-message", messageID: message.id };
}

// Reuses a previous row object when the new row has the same key and structure,
// so a rebuild triggered by one tool's status change does not re-render every
// other row.
function reuseRows(previous: SessionRow[], next: SessionRow[]): SessionRow[] {
  if (previous.length === 0) return next;
  const byKey = new Map<string, SessionRow>();
  for (const row of previous) byKey.set(rowKey(row), row);
  return next.map((row) => {
    const prior = byKey.get(rowKey(row));
    return prior && rowSignature(prior) === rowSignature(row) ? prior : row;
  });
}

function rowSignature(row: SessionRow): string {
  switch (row.type) {
    case "user-message":
      return `user|${row.messageID}`;
    case "assistant-part":
      return `part|${row.messageID}|${row.partID}|${row.kind}`;
    case "activity-group":
      return `activity|${row.completed}|${row.parts
        .map((ref) => `${ref.messageID}:${ref.partID}`)
        .join(",")}`;
    case "assistant-footer":
      return `footer|${row.messageID}`;
    case "system-message":
      return `system|${row.messageID}`;
    case "shell-message":
      return `shell|${row.messageID}`;
    case "compaction-message":
      return `compaction|${row.messageID}`;
    case "turn-usage":
      return `usage|${row.messageIDs.join(",")}|${row.previousCache ? JSON.stringify(row.previousCache) : ""}`;
  }
}

// Turn-token rows fold state across messages and are only used for diagnostics.
function projectWithUsage(ordered: SessionMessageInfo[]): SessionRow[] {
  const rows = projectOrdered(ordered);
  const usage: {
    steps: SessionMessageAssistant[];
    previousTurnCache: CacheUsage | undefined;
  } = { steps: [], previousTurnCache: undefined };

  for (const message of ordered) {
    if (message.type === "compaction" && message.status === "completed")
      usage.previousTurnCache = undefined;
    if (message.type !== "assistant") continue;
    usage.steps.push(message);
    if (!isTerminalAssistant(message)) continue;

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
