import type {
  AgentInfo,
  CommandInfo,
  FormInfo,
  IntegrationInfo,
  LocationRef,
  LocationGetOutput,
  McpResource,
  McpServer,
  ModelInfo,
  PermissionSavedInfo,
  PermissionRequest,
  Project,
  ProviderInfo,
  ReferenceInfo,
  SessionMessageInfo,
  SessionMessageAssistant,
  SessionMessageAssistantReasoning,
  SessionMessageAssistantText,
  SessionMessageAssistantTool,
  SessionInfo,
  SessionPendingInfo,
  ShellInfo,
  SkillInfo,
  WebSearchProvider,
} from "@opencode-ai/client/promise";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

export type DataSessionStatus = "idle" | "running";

export const messageIDFromEvent = (eventID: string) =>
  eventID.replace(/^evt_/, "msg_");

export type FormWithLocation = FormInfo & { readonly location?: LocationRef };

export type LocationData = {
  info?: LocationGetOutput;
  agent?: AgentInfo[];
  command?: CommandInfo[];
  integration?: IntegrationInfo[];
  mcp?: {
    server?: McpServer[];
    resource?: McpResource[];
  };
  model?: ModelInfo[];
  provider?: ProviderInfo[];
  reference?: ReferenceInfo[];
  websearch?: WebSearchProvider[];
  shell?: Record<string, ShellInfo>;
  skill?: SkillInfo[];
};

export type Store = {
  session: {
    info: Record<string, SessionInfo>;
    family: Record<string, string[]>;
    active: Record<string, DataSessionStatus>;
    message: Record<string, SessionMessageInfo[]>;
    pending: Record<string, SessionPendingInfo[]>;
    input: Record<string, string[]>;
    permission: Record<string, PermissionRequest[]>;
    form: Record<string, FormWithLocation[]>;
  };
  project: {
    info: Record<string, Project>;
    permission: Record<string, PermissionSavedInfo[]>;
  };
  location: Record<string, LocationData>;
  _loadedMessages: Record<string, boolean>;
  _loadedSessions: boolean;
  _defaultLocation: LocationRef;
  _loadingMessages: Record<string, boolean>;
};

export function locationKey(location: LocationRef) {
  return JSON.stringify([location.directory, location.workspaceID]);
}

export function locationQuery(ref?: LocationRef) {
  return ref
    ? { directory: ref.directory, workspace: ref.workspaceID }
    : undefined;
}

export const eventStore = create<Store>()(
  immer(() => ({
    session: {
      info: {},
      family: {},
      active: {},
      message: {},
      pending: {},
      input: {},
      permission: {},
      form: {},
    },
    project: { info: {}, permission: {} },
    location: {},
    _defaultLocation: { directory: "" },
    _loadedMessages: {},
    _loadingMessages: {},
    _loadedSessions: false,
  })),
);

export const messageIndex = new Map<string, Map<string, number>>();

export function index(sessionID: string) {
  const existing = messageIndex.get(sessionID);
  if (existing) return existing;
  const created = new Map<string, number>();
  messageIndex.set(sessionID, created);
  return created;
}

export function append(
  messages: SessionMessageInfo[],
  idx: Map<string, number>,
  item: SessionMessageInfo,
) {
  if (idx.has(item.id)) return;
  idx.set(item.id, messages.length);
  messages.push(item);
}

export function activeAssistant(messages: SessionMessageInfo[]) {
  const item = messages.findLast(
    (item) => item.type === "assistant" && !item.time.completed,
  );
  return item?.type === "assistant" ? item : undefined;
}

export function findAssistant(
  messages: SessionMessageInfo[],
  idx: Map<string, number>,
  messageID: string,
) {
  const position = idx.get(messageID);
  const item = position === undefined ? undefined : messages[position];
  return item?.type === "assistant" ? item : undefined;
}

export function findShellByShellID(
  messages: SessionMessageInfo[],
  shellID: string,
) {
  return messages.findLast(
    (item) => item.type === "shell" && item.shellID === shellID,
  );
}

export function findRunningCompaction(messages: SessionMessageInfo[]) {
  return messages.findLast(
    (item) => item.type === "compaction" && item.status === "running",
  );
}

export function latestTool(
  assistant: SessionMessageAssistant | undefined,
  callID?: string,
) {
  return assistant?.content.findLast(
    (item): item is SessionMessageAssistantTool =>
      item.type === "tool" && (callID === undefined || item.id === callID),
  );
}

export function latestText(assistant: SessionMessageAssistant | undefined) {
  return assistant?.content.findLast(
    (item): item is SessionMessageAssistantText => item.type === "text",
  );
}

export function latestReasoning(assistant: SessionMessageAssistant | undefined) {
  return assistant?.content.findLast(
    (item): item is SessionMessageAssistantReasoning =>
      item.type === "reasoning" && !item.time?.completed,
  );
}

function resolveRoot(
  sessionInfo: Record<string, SessionInfo>,
  sessionID: string,
) {
  let current = sessionID;
  let parentID = sessionInfo[sessionID]?.parentID;
  const seen = new Set([sessionID]);
  while (parentID) {
    if (seen.has(parentID)) break;
    seen.add(parentID);
    current = parentID;
    parentID = sessionInfo[parentID]?.parentID;
  }
  return current;
}

export function registerSession(store: Store, sessionID: string) {
  const info = store.session.info[sessionID];
  if (!info) return;
  const rootID = resolveRoot(store.session.info, sessionID);
  if (sessionID !== rootID && store.session.family[sessionID]) {
    const members = (store.session.family[rootID] ??= []);
    for (const id of store.session.family[sessionID]) {
      if (!members.includes(id)) members.push(id);
    }
    delete store.session.family[sessionID];
  }
  const family = (store.session.family[rootID] ??= []);
  if (!family.includes(sessionID)) family.push(sessionID);
}

export function addPending(store: Store, item: SessionPendingInfo) {
  if (store.session.pending[item.sessionID]?.some((p) => p.id === item.id))
    return;
  store.session.pending[item.sessionID] = [
    ...(store.session.pending[item.sessionID] ?? []),
    item,
  ];
}

export function removePending(store: Store, sessionID: string, inputID?: string) {
  if (!inputID) return;
  store.session.pending[sessionID] = (
    store.session.pending[sessionID] ?? []
  ).filter((item) => item.id !== inputID);
}
