import type { SessionMessageAssistantTool } from "@opencode-ai/client/promise";

const EMPTY: Record<string, unknown> = Object.freeze({});

export function toolInput(
  tool: SessionMessageAssistantTool,
): Record<string, unknown> {
  if (tool.state.status === "streaming") return parseJsonRecord(tool.state.input);
  return tool.state.input;
}

export function toolMetadata(
  tool: SessionMessageAssistantTool,
): Record<string, unknown> {
  if (!("metadata" in tool.state)) return EMPTY;
  return tool.state.metadata ?? EMPTY;
}

export function toolOutput(
  tool: SessionMessageAssistantTool,
): string | undefined {
  if (tool.state.status === "running") {
    const output = tool.state.metadata.output;
    return typeof output === "string" ? output : undefined;
  }
  if (!("content" in tool.state) || !tool.state.content) return undefined;
  const text = tool.state.content
    .flatMap((item) => (item.type === "text" ? [item.text] : []))
    .join("\n");
  return text || undefined;
}

export function toolError(
  tool: SessionMessageAssistantTool,
): string | undefined {
  if (tool.state.status !== "error") return undefined;
  return tool.state.error.message;
}

const LABEL_KEYS = ["description", "query", "url", "path", "pattern", "name"] as const;

export function toolLabel(input: Record<string, unknown>): string | undefined {
  for (const key of LABEL_KEYS) {
    const value = input[key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return undefined;
}

const SKIP_KEYS = new Set<string>(LABEL_KEYS);
const MAX_ARG_LENGTH = 48;

export function toolArgs(input: Record<string, unknown>): string[] {
  const args: string[] = [];
  for (const [key, value] of Object.entries(input)) {
    if (SKIP_KEYS.has(key)) continue;
    if (args.length >= 3) break;
    if (Array.isArray(value) || typeof value === "object") continue;
    const rendered = renderArg(value);
    if (rendered === undefined) continue;
    args.push(`${key}=${rendered}`);
  }
  return args;
}

function renderArg(value: unknown): string | undefined {
  if (typeof value === "string") {
    if (value.length === 0 || value.length > MAX_ARG_LENGTH) return undefined;
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return undefined;
}

const ANSI_ESCAPE =
  /[\u001B\u009B][[\]()#;?]*(?:(?:(?:[a-zA-Z\d]*(?:;[-a-zA-Z\d/#&.:=?%@~_]*)*)?\u0007)|(?:(?:\d{1,4}(?:[;:]\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~]))/g;

export function stripAnsi(text: string): string {
  return text.replace(ANSI_ESCAPE, "");
}

// Schema-module value imports are unavailable to mobile (see AGENTS.md), so
// parse the streamed JSON input inline.
function parseJsonRecord(input: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(input);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      !Array.isArray(parsed)
    ) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Partial JSON mid-stream; empty until tool.called resolves the input.
  }
  return EMPTY;
}
