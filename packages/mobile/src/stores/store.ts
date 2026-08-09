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
  OpenCodeClient,
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

export type HydrationStatus = "loading" | "loaded";

export type ConnectionStatus =
  | "connected"
  | "connecting"
  | "reconnecting"
  | "disconnected";

export type ConnectionSlice = {
  status: ConnectionStatus;
  attempt: number;
  error?: string;
};

// Inlined equivalent of SessionMessage.ID.fromEvent, which performs exactly this
// replacement: schema modules re-export themselves with `.js` specifiers (e.g.
// `export * as SessionMessage from "./session-message.js"`), which Metro resolves
// literally and never maps to the `.ts` sources. Any value import of a schema
// module would therefore fail the native bundle.
export const messageIDFromEvent = (eventID: string) =>
  eventID.replace(/^evt_/, "msg_");

export type FormWithLocation = FormInfo & { readonly location?: LocationRef };

export type Blocker =
  | { kind: "permission"; request: PermissionRequest }
  | { kind: "form"; request: FormWithLocation };

export type BlockerKind = Blocker["kind"];

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
    blocker: Record<string, Blocker[]>;
    // Per-session, in-memory only. Auto-approve is intentionally ephemeral:
    // mobile has no settings surface to turn it off, so it is never persisted
    // and resets on app restart. A key present with `true` means the session's
    // permission.asked requests are answered "once" automatically.
    autoApprove: Record<string, boolean>;
  };
  project: {
    info: Record<string, Project>;
    permission: Record<string, PermissionSavedInfo[]>;
  };
  location: Record<string, LocationData>;
  // Per-session projection state. Absence means "never hydrated"; "loading"
  // and "loaded" are the two stages. Reconnect recovery hydrates every
  // session that has a key here.
  _hydration: Record<string, HydrationStatus>;
  _loadedSessions: boolean;
  _defaultLocation: LocationRef;
  _client: OpenCodeClient | null;
  _serverConfigLoaded: boolean;
  connection: ConnectionSlice;
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
      blocker: {},
      autoApprove: {},
    },
    project: { info: {}, permission: {} },
    location: {},
    _defaultLocation: { directory: "" },
    _hydration: {},
    _loadedSessions: false,
    _client: null,
    _serverConfigLoaded: false,
    connection: { status: "disconnected", attempt: 0 },
  })),
);

export function getClient(): OpenCodeClient {
  const client = eventStore.getState()._client;
  if (!client) throw new Error("Client not initialized");
  return client;
}

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
  id?: string,
) {
  return assistant?.content.findLast(
    (item): item is SessionMessageAssistantTool =>
      item.type === "tool" && (id === undefined || item.id === id),
  );
}

export function latestText(assistant: SessionMessageAssistant | undefined) {
  return assistant?.content.findLast(
    (item): item is SessionMessageAssistantText => item.type === "text",
  );
}

export function latestReasoning(
  assistant: SessionMessageAssistant | undefined,
) {
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

export function removePending(
  store: Store,
  sessionID: string,
  inputID?: string,
) {
  if (!inputID) return;
  store.session.pending[sessionID] = (
    store.session.pending[sessionID] ?? []
  ).filter((item) => item.id !== inputID);
}

export function setDelivery(
  store: Store,
  sessionID: string,
  inputID: string,
  delivery: "steer" | "queue",
) {
  const list = store.session.pending[sessionID];
  if (!list) return;
  const position = list.findIndex((item) => item.id === inputID);
  const item = list[position];
  if (!item || item.type === "compaction" || item.delivery === delivery)
    return;
  list[position] = { ...item, delivery };
}

export function addBlocker(store: Store, sessionID: string, blocker: Blocker) {
  const list = store.session.blocker[sessionID] ?? [];
  if (
    list.some(
      (item) =>
        item.kind === blocker.kind && item.request.id === blocker.request.id,
    )
  )
    return;
  store.session.blocker[sessionID] = [...list, blocker];
}

export function removeBlocker(
  store: Store,
  sessionID: string,
  kind: BlockerKind,
  id: string,
) {
  const list = store.session.blocker[sessionID];
  if (!list) return;
  store.session.blocker[sessionID] = list.filter(
    (item) => !(item.kind === kind && item.request.id === id),
  );
}

export function setAutoApprove(
  store: Store,
  sessionID: string,
  enabled: boolean,
) {
  if (enabled) store.session.autoApprove[sessionID] = true;
  else delete store.session.autoApprove[sessionID];
}

export function resolvePermissionTool(
  messages: SessionMessageInfo[] | undefined,
  request: PermissionRequest,
): SessionMessageAssistantTool | undefined {
  const source = request.source;
  if (source?.type !== "tool") return;
  if (!messages) return;
  const assistant = messages.findLast(
    (item): item is SessionMessageAssistant =>
      item.type === "assistant" && item.id === source.messageID,
  );
  return latestTool(assistant, source.id);
}

const BLOCKER_PRIORITY: BlockerKind[] = ["permission", "form"];

export function pickBlocker(
  blockers: ReadonlyArray<Blocker>,
): Blocker | undefined {
  for (const kind of BLOCKER_PRIORITY) {
    const blocker = blockers.find((item) => item.kind === kind);
    if (blocker) return blocker;
  }
}

// Root sessions surface descendant (subagent) blockers; child sessions only their own.
export function selectBlockers(
  store: Pick<Store, "session">,
  sessionID: string,
): Blocker[] {
  const info = store.session.info[sessionID];
  const ids = info?.parentID
    ? [sessionID]
    : Array.from(
        new Set([sessionID, ...(store.session.family[sessionID] ?? [])]),
      );

  return [
    ...ids.flatMap((id) => store.session.blocker[id] ?? []),
    ...(store.session.blocker["global"] ?? []),
  ];
}
