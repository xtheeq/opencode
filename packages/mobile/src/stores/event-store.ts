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
  V2Event,
  JsonValue,
} from "@opencode-ai/client/promise";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { getClient } from "@/services/api";

export type DataSessionStatus = "idle" | "running";

const messageIDFromEvent = (eventID: string) =>
  eventID.replace(/^evt_/, "msg_");

export type FormWithLocation = FormInfo & { readonly location?: LocationRef };

type LocationData = {
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
    permission: Record<string, PermissionSavedInfo[]>;
  };
  location: Record<string, LocationData>;
  _loadedMessages: Record<string, boolean>;
  _loadedSessions: boolean;
  _defaultLocation: LocationRef;
};

function locationKey(location: LocationRef) {
  return JSON.stringify([location.directory, location.workspaceID]);
}

function locationQuery(ref?: LocationRef) {
  return ref
    ? { directory: ref.directory, workspace: ref.workspaceID }
    : undefined;
}

function createSync() {
  const state = new Map<string, true | Promise<void>>();
  return {
    run(key: string, load: () => Promise<void>) {
      const active = state.get(key);
      if (active === true) return Promise.resolve();
      if (active) return active;
      const pending = load()
        .then(() => {
          if (state.get(key) === pending) state.set(key, true);
        })
        .finally(() => {
          if (state.get(key) === pending) state.delete(key);
        });
      state.set(key, pending);
      return pending;
    },
    complete(key: string) {
      if (state.has(key)) return;
      state.set(key, true);
    },
    invalidate(key?: string) {
      if (key) {
        state.delete(key);
        return;
      }
      state.clear();
    },
  };
}

const sync = createSync();
const messageIndex = new Map<string, Map<string, number>>();

function index(sessionID: string) {
  const existing = messageIndex.get(sessionID);
  if (existing) return existing;
  const created = new Map<string, number>();
  messageIndex.set(sessionID, created);
  return created;
}

function append(
  messages: SessionMessageInfo[],
  idx: Map<string, number>,
  item: SessionMessageInfo,
) {
  if (idx.has(item.id)) return;
  idx.set(item.id, messages.length);
  messages.push(item);
}

function activeAssistant(messages: SessionMessageInfo[]) {
  const item = messages.findLast(
    (item) => item.type === "assistant" && !item.time.completed,
  );
  return item?.type === "assistant" ? item : undefined;
}

function findAssistant(
  messages: SessionMessageInfo[],
  idx: Map<string, number>,
  messageID: string,
) {
  const position = idx.get(messageID);
  const item = position === undefined ? undefined : messages[position];
  return item?.type === "assistant" ? item : undefined;
}

function findShellByShellID(messages: SessionMessageInfo[], shellID: string) {
  return messages.findLast(
    (item) => item.type === "shell" && item.shellID === shellID,
  );
}

function findRunningCompaction(messages: SessionMessageInfo[]) {
  return messages.findLast(
    (item) => item.type === "compaction" && item.status === "running",
  );
}

function latestTool(
  assistant: SessionMessageAssistant | undefined,
  callID?: string,
) {
  return assistant?.content.findLast(
    (item): item is SessionMessageAssistantTool =>
      item.type === "tool" && (callID === undefined || item.id === callID),
  );
}

function latestText(assistant: SessionMessageAssistant | undefined) {
  return assistant?.content.findLast(
    (item): item is SessionMessageAssistantText => item.type === "text",
  );
}

function latestReasoning(assistant: SessionMessageAssistant | undefined) {
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

function registerSession(store: Store, sessionID: string) {
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

function addPending(store: Store, item: SessionPendingInfo) {
  if (store.session.pending[item.sessionID]?.some((p) => p.id === item.id))
    return;
  store.session.pending[item.sessionID] = [
    ...(store.session.pending[item.sessionID] ?? []),
    item,
  ];
}

function removePending(store: Store, sessionID: string, inputID?: string) {
  if (!inputID) return;
  store.session.pending[sessionID] = (
    store.session.pending[sessionID] ?? []
  ).filter((item) => item.id !== inputID);
}

function removeSession(store: Store, sessionID: string) {
  messageIndex.delete(sessionID);
  delete store.session.info[sessionID];
  delete store.session.active[sessionID];
  delete store.session.message[sessionID];
  delete store.session.pending[sessionID];
  delete store.session.input[sessionID];
  delete store.session.permission[sessionID];
  delete store.session.form[sessionID];
  for (const [rootID, family] of Object.entries(store.session.family)) {
    const next = family.filter((id) => id !== sessionID);
    if (next.length === 0) delete store.session.family[rootID];
    else store.session.family[rootID] = next;
  }
}

type FullStore = Store & {
  _defaultLocation: LocationRef;
  _loadedMessages: Record<string, boolean>;
};

export const eventStore = create<FullStore>()(
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
    project: { permission: {} },
    location: {},
    _defaultLocation: { directory: "" },
    _loadedMessages: {},
    _loadedSessions: false,
  })),
);

export function handleEvent(event: V2Event) {
  const state = eventStore.getState();

  switch (event.type) {
    case "session.created":
      sync.invalidate(`session:${event.data.sessionID}`);
      sync.run(`session:${event.data.sessionID}`, async () => {
        const session = await getClient().session.get({
          sessionID: event.data.sessionID,
        });
        eventStore.setState((s) => {
          s.session.info[event.data.sessionID] = session;
          registerSession(s, event.data.sessionID);
        });
      });
      sync.complete(`session.pending:${event.data.sessionID}`);
      sync.complete(`session.message:${event.data.sessionID}`);
      break;

    case "session.deleted":
      eventStore.setState((s) => {
        removeSession(s, event.data.sessionID);
      });
      break;

    case "session.usage.updated":
      eventStore.setState((s) => {
        const info = s.session.info[event.data.sessionID];
        if (info) {
          info.cost = event.data.cost;
          info.tokens = event.data.tokens;
        }
      });
      break;

    case "catalog.updated":
      sync.invalidate(
        `location.model:${locationKey(event.location ?? state._defaultLocation)}`,
      );
      sync.invalidate(
        `location.provider:${locationKey(event.location ?? state._defaultLocation)}`,
      );
      sync.run(
        `location.model:${locationKey(event.location ?? state._defaultLocation)}`,
        async () => {
          const response = await getClient().model.list({
            location: locationQuery(event.location ?? state._defaultLocation),
          });
          eventStore.setState((s) => {
            const key = locationKey(response.location);
            s.location[key] = { ...s.location[key], model: response.data };
          });
        },
      );
      sync.run(
        `location.provider:${locationKey(event.location ?? state._defaultLocation)}`,
        async () => {
          const response = await getClient().provider.list({
            location: locationQuery(event.location ?? state._defaultLocation),
          });
          eventStore.setState((s) => {
            const key = locationKey(response.location);
            s.location[key] = { ...s.location[key], provider: response.data };
          });
        },
      );
      break;

    case "agent.updated":
      sync.invalidate(
        `location.agent:${locationKey(event.location ?? state._defaultLocation)}`,
      );
      sync.run(
        `location.agent:${locationKey(event.location ?? state._defaultLocation)}`,
        async () => {
          const response = await getClient().agent.list({
            location: locationQuery(event.location ?? state._defaultLocation),
          });
          eventStore.setState((s) => {
            const key = locationKey(response.location);
            s.location[key] = { ...s.location[key], agent: response.data };
          });
        },
      );
      break;

    case "command.updated":
      sync.invalidate(
        `location.command:${locationKey(event.location ?? state._defaultLocation)}`,
      );
      sync.run(
        `location.command:${locationKey(event.location ?? state._defaultLocation)}`,
        async () => {
          const response = await getClient().command.list({
            location: locationQuery(event.location ?? state._defaultLocation),
          });
          eventStore.setState((s) => {
            const key = locationKey(response.location);
            s.location[key] = { ...s.location[key], command: response.data };
          });
        },
      );
      break;

    case "skill.updated":
      sync.invalidate(
        `location.skill:${locationKey(event.location ?? state._defaultLocation)}`,
      );
      sync.run(
        `location.skill:${locationKey(event.location ?? state._defaultLocation)}`,
        async () => {
          const response = await getClient().skill.list({
            location: locationQuery(event.location ?? state._defaultLocation),
          });
          eventStore.setState((s) => {
            const key = locationKey(response.location);
            s.location[key] = { ...s.location[key], skill: response.data };
          });
        },
      );
      break;

    case "session.agent.selected":
      if (state.session.info[event.data.sessionID]) {
        eventStore.setState((s) => {
          const info = s.session.info[event.data.sessionID];
          if (info) info.agent = event.data.agent;
        });
      }
      eventStore.setState((s) => {
        const idx = index(event.data.sessionID);
        const messages = (s.session.message[event.data.sessionID] ??= []);
        append(messages, idx, {
          id: messageIDFromEvent(event.id),
          type: "agent-switched",
          agent: event.data.agent,
          time: { created: event.created },
        });
      });
      break;

    case "session.model.selected":
      if (state.session.info[event.data.sessionID]) {
        eventStore.setState((s) => {
          const info = s.session.info[event.data.sessionID];
          if (info) info.model = event.data.model;
        });
      }
      if (state.session.message[event.data.sessionID]) {
        eventStore.setState((s) => {
          const idx = index(event.data.sessionID);
          const messages = (s.session.message[event.data.sessionID] ??= []);
          append(messages, idx, {
            id: messageIDFromEvent(event.id),
            type: "model-switched",
            model: event.data.model,
            time: { created: event.created },
          });
        });
      }
      getClient()
        .session.message({
          sessionID: event.data.sessionID,
          messageID: messageIDFromEvent(event.id),
        })
        .then((item) => {
          eventStore.setState((s) => {
            const idx = index(event.data.sessionID);
            const messages = s.session.message[event.data.sessionID];
            if (!messages) return;
            const position = idx.get(item.id);
            if (position === undefined) {
              append(messages, idx, item);
              return;
            }
            messages[position] = item;
          });
        })
        .catch((error: Error) =>
          console.error("Failed to load projected model switch message", error),
        );
      break;

    case "session.renamed":
      if (state.session.info[event.data.sessionID]) {
        eventStore.setState((s) => {
          const info = s.session.info[event.data.sessionID];
          if (info) info.title = event.data.title;
        });
      }
      break;

    case "session.moved":
      if (state.session.info[event.data.sessionID]) {
        eventStore.setState((s) => {
          const info = s.session.info[event.data.sessionID];
          if (info) {
            info.location = event.data.location;
            if (event.data.projectID) info.projectID = event.data.projectID;
            info.subpath = event.data.subpath;
          }
        });
      }
      break;

    case "session.input.promoted": {
      eventStore.setState((s) => {
        removePending(s, event.data.sessionID, event.data.inputID);
        const idx = index(event.data.sessionID);
        const existing = idx.get(event.data.inputID);
        if (existing === undefined) return;
        const messages = s.session.message[event.data.sessionID];
        if (!messages) return;
        const msg = messages[existing];
        if (
          !msg ||
          !s.session.input[event.data.sessionID]?.includes(event.data.inputID)
        )
          return;
        msg.time.created = event.created;
        messages.splice(existing, 1);
        messages.push(msg);
        idx.clear();
        messages.forEach((m, i) => idx.set(m.id, i));
      });
      eventStore.setState((s) => {
        if (s.session.input[event.data.sessionID]) {
          s.session.input[event.data.sessionID] = s.session.input[
            event.data.sessionID
          ].filter((id) => id !== event.data.inputID);
        }
      });
      break;
    }

    case "session.input.admitted":
      eventStore.setState((s) => {
        addPending(s, {
          id: event.data.inputID,
          sessionID: event.data.sessionID,
          admittedSeq: event.durable.seq,
          timeCreated: event.created,
          ...event.data.input,
        });
        if (
          !s.session.input[event.data.sessionID]?.includes(event.data.inputID)
        ) {
          s.session.input[event.data.sessionID] = [
            ...(s.session.input[event.data.sessionID] ?? []),
            event.data.inputID,
          ];
        }
        const idx = index(event.data.sessionID);
        const messages = (s.session.message[event.data.sessionID] ??= []);
        append(
          messages,
          idx,
          event.data.input.type === "user"
            ? {
                id: event.data.inputID,
                type: "user",
                ...event.data.input.data,
                time: { created: event.created },
              }
            : {
                id: event.data.inputID,
                type: "synthetic",
                ...event.data.input.data,
                time: { created: event.created },
              },
        );
      });
      break;

    case "session.instructions.updated": {
      const instructionsMeta = (event as any).metadata?.instructions;
      if (
        typeof instructionsMeta === "object" &&
        instructionsMeta !== null &&
        "initial" in instructionsMeta &&
        instructionsMeta.initial === true
      )
        break;
      eventStore.setState((s) => {
        const idx = index(event.data.sessionID);
        const messages = (s.session.message[event.data.sessionID] ??= []);
        append(messages, idx, {
          id: messageIDFromEvent(event.id),
          type: "system",
          text: `Instructions updated: ${Object.keys(event.data.delta).join(", ")}`,
          metadata: (event as any).metadata,
          time: { created: event.created },
        });
      });
      break;
    }

    case "session.synthetic":
      eventStore.setState((s) => {
        const idx = index(event.data.sessionID);
        const messages = (s.session.message[event.data.sessionID] ??= []);
        append(messages, idx, {
          id: messageIDFromEvent(event.id),
          type: "synthetic",
          text: event.data.text,
          description: event.data.description,
          metadata: event.data.metadata,
          time: { created: event.created },
        });
      });
      break;

    case "session.shell.started":
      eventStore.setState((s) => {
        const idx = index(event.data.sessionID);
        const messages = (s.session.message[event.data.sessionID] ??= []);
        append(messages, idx, {
          id: messageIDFromEvent(event.id),
          type: "shell",
          shellID: event.data.shell.id,
          command: event.data.shell.command,
          status: event.data.shell.status,
          exit: event.data.shell.exit,
          metadata: (event as any).metadata,
          time: { created: event.created },
        });
      });
      break;

    case "session.shell.ended":
      eventStore.setState((s) => {
        const messages = s.session.message[event.data.sessionID];
        if (!messages) return;
        const match = findShellByShellID(messages, event.data.shell.id);
        if (!match || match.type !== "shell") return;
        match.status = event.data.shell.status;
        match.exit = event.data.shell.exit;
        match.output = event.data.output;
        match.time.completed = event.created;
      });
      break;

    case "session.step.started":
      eventStore.setState((s) => {
        const idx = index(event.data.sessionID);
        const messages = (s.session.message[event.data.sessionID] ??= []);
        const position = idx.get(event.data.assistantMessageID);
        const existing =
          position === undefined ? undefined : messages[position];
        if (existing?.type === "assistant") {
          existing.agent = event.data.agent;
          existing.model = event.data.model;
          existing.retry = undefined;
          existing.error = undefined;
          existing.finish = undefined;
          existing.time.completed = undefined;
          if (event.data.snapshot)
            existing.snapshot = {
              ...existing.snapshot,
              start: event.data.snapshot,
            };
          return;
        }
        const currentAssistant = activeAssistant(messages);
        if (currentAssistant) {
          currentAssistant.retry = undefined;
          currentAssistant.time.completed = event.created;
        }
        append(messages, idx, {
          id: event.data.assistantMessageID,
          type: "assistant",
          agent: event.data.agent,
          model: event.data.model,
          metadata: (event as any).metadata,
          content: [],
          snapshot: event.data.snapshot
            ? { start: event.data.snapshot }
            : undefined,
          time: { created: event.created },
        });
      });
      break;

    case "session.step.ended":
      eventStore.setState((s) => {
        const idx = index(event.data.sessionID);
        const messages = s.session.message[event.data.sessionID];
        if (!messages) return;
        const currentAssistant = findAssistant(
          messages,
          idx,
          event.data.assistantMessageID,
        );
        if (!currentAssistant) return;
        currentAssistant.time.completed = event.created;
        currentAssistant.finish = event.data.finish;
        currentAssistant.cost = event.data.cost;
        currentAssistant.tokens = event.data.tokens;
        if (event.data.snapshot)
          currentAssistant.snapshot = {
            ...currentAssistant.snapshot,
            end: event.data.snapshot,
          };
      });
      break;

    case "session.step.failed":
      eventStore.setState((s) => {
        const idx = index(event.data.sessionID);
        const messages = s.session.message[event.data.sessionID];
        if (!messages) return;
        const currentAssistant = findAssistant(
          messages,
          idx,
          event.data.assistantMessageID,
        );
        if (!currentAssistant) return;
        currentAssistant.time.completed = event.created;
        currentAssistant.finish = "error";
        currentAssistant.error = event.data.error;
        currentAssistant.retry = undefined;
        if (event.data.cost !== undefined && event.data.tokens !== undefined) {
          currentAssistant.cost = event.data.cost;
          currentAssistant.tokens = event.data.tokens;
        }
      });
      break;

    case "session.text.started":
      eventStore.setState((s) => {
        const idx = index(event.data.sessionID);
        const messages = s.session.message[event.data.sessionID];
        if (!messages) return;
        findAssistant(
          messages,
          idx,
          event.data.assistantMessageID,
        )?.content.push({ type: "text", text: "" });
      });
      break;

    case "session.text.delta":
      eventStore.setState((s) => {
        const idx = index(event.data.sessionID);
        const messages = s.session.message[event.data.sessionID];
        if (!messages) return;
        const match = latestText(
          findAssistant(messages, idx, event.data.assistantMessageID),
        );
        if (match) match.text += event.data.delta;
      });
      break;

    case "session.text.ended":
      eventStore.setState((s) => {
        const idx = index(event.data.sessionID);
        const messages = s.session.message[event.data.sessionID];
        if (!messages) return;
        const match = latestText(
          findAssistant(messages, idx, event.data.assistantMessageID),
        );
        if (match) match.text = event.data.text;
      });
      break;

    case "session.tool.input.started":
      eventStore.setState((s) => {
        const idx = index(event.data.sessionID);
        const messages = s.session.message[event.data.sessionID];
        if (!messages) return;
        findAssistant(
          messages,
          idx,
          event.data.assistantMessageID,
        )?.content.push({
          type: "tool",
          id: event.data.callID,
          name: event.data.name,
          time: { created: event.created },
          state: { status: "streaming", input: "" },
        });
      });
      break;

    case "session.tool.input.delta":
      eventStore.setState((s) => {
        const idx = index(event.data.sessionID);
        const messages = s.session.message[event.data.sessionID];
        if (!messages) return;
        const match = latestTool(
          findAssistant(messages, idx, event.data.assistantMessageID),
          event.data.callID,
        );
        if (match?.state.status === "streaming")
          match.state.input += event.data.delta;
      });
      break;

    case "session.tool.input.ended":
      eventStore.setState((s) => {
        const idx = index(event.data.sessionID);
        const messages = s.session.message[event.data.sessionID];
        if (!messages) return;
        const match = latestTool(
          findAssistant(messages, idx, event.data.assistantMessageID),
          event.data.callID,
        );
        if (match?.state.status === "streaming")
          match.state.input = event.data.text;
      });
      break;

    case "session.tool.called":
      eventStore.setState((s) => {
        const idx = index(event.data.sessionID);
        const messages = s.session.message[event.data.sessionID];
        if (!messages) return;
        const match = latestTool(
          findAssistant(messages, idx, event.data.assistantMessageID),
          event.data.callID,
        );
        if (!match) return;
        match.time.ran = event.created;
        match.executed = event.data.executed;
        match.providerState = event.data.state;
        match.state = {
          status: "running",
          input: event.data.input,
          metadata: {},
        };
      });
      break;

    case "session.tool.progress":
      eventStore.setState((s) => {
        const idx = index(event.data.sessionID);
        const messages = s.session.message[event.data.sessionID];
        if (!messages) return;
        const match = latestTool(
          findAssistant(messages, idx, event.data.assistantMessageID),
          event.data.callID,
        );
        if (match?.state.status !== "running") return;
        match.state.metadata = event.data.metadata;
      });
      break;

    case "session.tool.success":
      eventStore.setState((s) => {
        const idx = index(event.data.sessionID);
        const messages = s.session.message[event.data.sessionID];
        if (!messages) return;
        const match = latestTool(
          findAssistant(messages, idx, event.data.assistantMessageID),
          event.data.callID,
        );
        if (match?.state.status !== "running") return;
        match.state = {
          status: "completed",
          input: match.state.input,
          metadata: event.data.metadata,
          content: [...event.data.content],
        };
        match.executed = event.data.executed || match.executed === true;
        match.providerResultState = event.data.resultState;
        match.time.completed = event.created;
      });
      break;

    case "session.tool.failed":
      eventStore.setState((s) => {
        const idx = index(event.data.sessionID);
        const messages = s.session.message[event.data.sessionID];
        if (!messages) return;
        const match = latestTool(
          findAssistant(messages, idx, event.data.assistantMessageID),
          event.data.callID,
        );
        if (
          !match ||
          (match.state.status !== "streaming" &&
            match.state.status !== "running")
        )
          return;
        match.state = {
          status: "error",
          error: event.data.error,
          input: {},
          metadata: event.data.metadata,
          content: event.data.content,
        };
        match.executed = event.data.executed || match.executed === true;
        match.providerResultState = event.data.resultState;
        match.time.completed = event.created;
      });
      break;

    case "session.reasoning.started":
      eventStore.setState((s) => {
        const idx = index(event.data.sessionID);
        const messages = s.session.message[event.data.sessionID];
        if (!messages) return;
        findAssistant(
          messages,
          idx,
          event.data.assistantMessageID,
        )?.content.push({
          type: "reasoning",
          text: "",
          state: event.data.state,
          time: { created: event.created },
        });
      });
      break;

    case "session.reasoning.delta":
      eventStore.setState((s) => {
        const idx = index(event.data.sessionID);
        const messages = s.session.message[event.data.sessionID];
        if (!messages) return;
        const match = latestReasoning(
          findAssistant(messages, idx, event.data.assistantMessageID),
        );
        if (match) match.text += event.data.delta;
      });
      break;

    case "session.reasoning.ended":
      eventStore.setState((s) => {
        const idx = index(event.data.sessionID);
        const messages = s.session.message[event.data.sessionID];
        if (!messages) return;
        const match = latestReasoning(
          findAssistant(messages, idx, event.data.assistantMessageID),
        );
        if (match) {
          match.text = event.data.text;
          match.time = {
            created: match.time?.created ?? event.created,
            completed: event.created,
          };
          if (event.data.state !== undefined) match.state = event.data.state;
        }
      });
      break;

    case "session.retry.scheduled":
      eventStore.setState((s) => {
        const idx = index(event.data.sessionID);
        const messages = s.session.message[event.data.sessionID];
        if (!messages) return;
        const currentAssistant = findAssistant(
          messages,
          idx,
          event.data.assistantMessageID,
        );
        if (!currentAssistant) return;
        currentAssistant.retry = {
          attempt: event.data.attempt,
          at: event.data.at,
          error: event.data.error,
        };
      });
      break;

    case "session.execution.started":
      eventStore.setState((s) => {
        s.session.active[event.data.sessionID] = "running";
      });
      break;

    case "session.compaction.admitted":
      eventStore.setState((s) => {
        addPending(s, {
          id: event.data.inputID,
          sessionID: event.data.sessionID,
          admittedSeq: event.durable.seq,
          timeCreated: event.created,
          type: "compaction",
        });
      });
      break;

    case "session.compaction.started":
      eventStore.setState((s) => {
        removePending(s, event.data.sessionID, event.data.inputID);
        const idx = index(event.data.sessionID);
        const messages = (s.session.message[event.data.sessionID] ??= []);
        append(messages, idx, {
          id: event.data.inputID ?? messageIDFromEvent(event.id),
          type: "compaction",
          status: "running",
          reason: event.data.reason,
          summary: "",
          recent: event.data.recent ?? "",
          time: { created: event.created },
        });
      });
      break;

    case "session.execution.succeeded":
    case "session.execution.failed":
    case "session.execution.interrupted":
      eventStore.setState((s) => {
        s.session.active[event.data.sessionID] = "idle";
        const messages = s.session.message[event.data.sessionID];
        if (!messages) return;
        const currentAssistant = activeAssistant(messages);
        if (currentAssistant) currentAssistant.retry = undefined;
      });
      break;

    case "session.revert.staged":
      if (state.session.info[event.data.sessionID]) {
        eventStore.setState((s) => {
          const info = s.session.info[event.data.sessionID];
          if (info) info.revert = event.data.revert;
        });
      }
      break;

    case "session.revert.cleared":
      if (state.session.info[event.data.sessionID]) {
        eventStore.setState((s) => {
          const info = s.session.info[event.data.sessionID];
          if (info) info.revert = undefined;
        });
      }
      break;

    case "session.revert.committed":
      if (state.session.info[event.data.sessionID]) {
        eventStore.setState((s) => {
          const info = s.session.info[event.data.sessionID];
          if (info) info.revert = undefined;
        });
      }
      eventStore.setState((s) => {
        s.session.input[event.data.sessionID] = (
          s.session.input[event.data.sessionID] ?? []
        ).filter((id) => id < event.data.to);
        const messages = s.session.message[event.data.sessionID];
        if (!messages) return;
        const idx = index(event.data.sessionID);
        const position = messages.findIndex((item) => item.id >= event.data.to);
        if (position === -1) return;
        for (const item of messages.splice(position)) idx.delete(item.id);
      });
      break;

    case "session.compaction.delta":
      eventStore.setState((s) => {
        const messages = s.session.message[event.data.sessionID];
        if (!messages) return;
        const current = findRunningCompaction(messages);
        if (current?.type === "compaction" && current.status === "running")
          current.summary += event.data.text;
      });
      break;

    case "session.compaction.ended":
      eventStore.setState((s) => {
        const messages = s.session.message[event.data.sessionID];
        if (!messages) return;
        const idx = index(event.data.sessionID);
        const position = messages.findLastIndex(
          (item) => item.type === "compaction" && item.status === "running",
        );
        const current = messages[position];
        if (current?.type === "compaction") {
          Object.assign(current, {
            status: "completed",
            reason: event.data.reason,
            summary: event.data.text,
            recent: event.data.recent,
          });
          return;
        }
        append(messages, idx, {
          id: messageIDFromEvent(event.id),
          type: "compaction",
          status: "completed",
          reason: event.data.reason,
          summary: event.data.text,
          recent: event.data.recent,
          time: { created: event.created },
        });
      });
      break;

    case "session.compaction.failed":
      eventStore.setState((s) => {
        removePending(s, event.data.sessionID, event.data.inputID);
        const messages = s.session.message[event.data.sessionID];
        if (!messages) return;
        const idx = index(event.data.sessionID);
        const position = messages.findLastIndex(
          (item) => item.type === "compaction" && item.status === "running",
        );
        const current = messages[position];
        const failed: Extract<
          SessionMessageInfo,
          { type: "compaction"; status: "failed" }
        > = {
          id: current?.id ?? event.data.inputID ?? messageIDFromEvent(event.id),
          type: "compaction",
          status: "failed",
          reason: event.data.reason ?? "manual",
          error: event.data.error ?? {
            type: "compaction.failed",
            message: "Compaction failed before recording an error",
          },
          metadata:
            current?.type === "compaction"
              ? current.metadata
              : (event as any).metadata,
          time:
            current?.type === "compaction"
              ? current.time
              : { created: event.created },
        };
        if (current?.type === "compaction") {
          messages[position] = failed;
          return;
        }
        append(messages, idx, failed);
      });
      break;

    case "permission.asked":
      if (
        state.session.permission[event.data.sessionID]?.some(
          (r) => r.id === event.data.id,
        )
      )
        break;
      eventStore.setState((s) => {
        s.session.permission[event.data.sessionID] = [
          ...(s.session.permission[event.data.sessionID] ?? []),
          event.data,
        ];
      });
      break;

    case "permission.replied":
      eventStore.setState((s) => {
        if (s.session.permission[event.data.sessionID]) {
          s.session.permission[event.data.sessionID] = s.session.permission[
            event.data.sessionID
          ].filter((r) => r.id !== event.data.requestID);
        }
      });
      break;

    case "form.created":
      if (
        state.session.form[event.data.form.sessionID]?.some(
          (f) => f.id === event.data.form.id,
        )
      )
        break;
      eventStore.setState((s) => {
        s.session.form[event.data.form.sessionID] = [
          ...(s.session.form[event.data.form.sessionID] ?? []),
          event.data.form.sessionID === "global"
            ? { ...event.data.form, location: event.location }
            : event.data.form,
        ];
      });
      break;

    case "form.replied":
    case "form.cancelled":
      eventStore.setState((s) => {
        if (s.session.form[event.data.sessionID]) {
          s.session.form[event.data.sessionID] = s.session.form[
            event.data.sessionID
          ].filter((f) => f.id !== event.data.id);
        }
      });
      break;

    case "shell.created":
      eventStore.setState((s) => {
        const key = locationKey(event.location ?? s._defaultLocation);
        s.location[key] = {
          ...s.location[key],
          shell: {
            ...s.location[key]?.shell,
            [event.data.info.id]: event.data.info,
          },
        };
      });
      break;

    case "shell.exited":
    case "shell.deleted":
      eventStore.setState((s) => {
        if (event.location) {
          const key = locationKey(event.location);
          if (s.location[key]?.shell)
            delete s.location[key].shell[event.data.id];
        } else {
          for (const data of Object.values(s.location))
            delete data.shell?.[event.data.id];
        }
      });
      break;

    case "reference.updated":
      sync.invalidate(
        `location.reference:${locationKey(state._defaultLocation)}`,
      );
      sync.run(
        `location.reference:${locationKey(state._defaultLocation)}`,
        async () => {
          const response = await getClient().reference.list({
            location: locationQuery(state._defaultLocation),
          });
          eventStore.setState((s) => {
            const key = locationKey(response.location);
            s.location[key] = { ...s.location[key], reference: response.data };
          });
        },
      );
      break;

    case "integration.updated":
      sync.invalidate(
        `location.integration:${locationKey(event.location ?? state._defaultLocation)}`,
      );
      sync.invalidate(
        `location.model:${locationKey(event.location ?? state._defaultLocation)}`,
      );
      sync.invalidate(
        `location.provider:${locationKey(event.location ?? state._defaultLocation)}`,
      );
      void Promise.all([
        sync.run(
          `location.integration:${locationKey(event.location ?? state._defaultLocation)}`,
          async () => {
            const response = await getClient().integration.list({
              location: locationQuery(event.location ?? state._defaultLocation),
            });
            eventStore.setState((s) => {
              const key = locationKey(response.location);
              s.location[key] = {
                ...s.location[key],
                integration: response.data,
              };
            });
          },
        ),
        sync.run(
          `location.model:${locationKey(event.location ?? state._defaultLocation)}`,
          async () => {
            const response = await getClient().model.list({
              location: locationQuery(event.location ?? state._defaultLocation),
            });
            eventStore.setState((s) => {
              const key = locationKey(response.location);
              s.location[key] = { ...s.location[key], model: response.data };
            });
          },
        ),
        sync.run(
          `location.provider:${locationKey(event.location ?? state._defaultLocation)}`,
          async () => {
            const response = await getClient().provider.list({
              location: locationQuery(event.location ?? state._defaultLocation),
            });
            eventStore.setState((s) => {
              const key = locationKey(response.location);
              s.location[key] = { ...s.location[key], provider: response.data };
            });
          },
        ),
      ]);
      break;

    case "config.updated":
    case "websearch.updated":
      sync.run(
        `location.websearch:${locationKey(event.location ?? state._defaultLocation)}`,
        async () => {
          const response = await getClient().websearch.providers({
            location: locationQuery(event.location ?? state._defaultLocation),
          });
          eventStore.setState((s) => {
            const key = locationKey(response.location);
            s.location[key] = { ...s.location[key], websearch: response.data };
          });
        },
      );
      break;

    case "mcp.status.changed":
      sync.invalidate(
        `location.mcp.server:${locationKey(event.location ?? state._defaultLocation)}`,
      );
      sync.run(
        `location.mcp.server:${locationKey(event.location ?? state._defaultLocation)}`,
        async () => {
          const response = await getClient().mcp.list({
            location: locationQuery(event.location ?? state._defaultLocation),
          });
          eventStore.setState((s) => {
            const key = locationKey(response.location);
            s.location[key] = {
              ...s.location[key],
              mcp: { ...s.location[key]?.mcp, server: response.data },
            };
          });
        },
      );
      break;

    case "mcp.resources.changed":
      sync.invalidate(
        `location.mcp.resource:${locationKey(event.location ?? state._defaultLocation)}`,
      );
      sync.run(
        `location.mcp.resource:${locationKey(event.location ?? state._defaultLocation)}`,
        async () => {
          const response = await getClient().mcp.resource.catalog({
            location: locationQuery(event.location ?? state._defaultLocation),
          });
          eventStore.setState((s) => {
            const key = locationKey(response.location);
            s.location[key] = {
              ...s.location[key],
              mcp: {
                ...s.location[key]?.mcp,
                resource: response.data.resources,
              },
            };
          });
        },
      );
      break;
  }
}

export async function loadMessages(sessionID: string) {
  return sync.run(`session.message:${sessionID}`, async () => {
    const response = await getClient().message.list({
      sessionID,
      limit: 200,
      order: "desc",
    });
    const messages = response.data.toReversed();
    messageIndex.set(sessionID, new Map(messages.map((m, i) => [m.id, i])));
    eventStore.setState((s) => {
      s.session.message[sessionID] = messages;
      s._loadedMessages[sessionID] = true;
    });
  });
}

export async function syncLocation() {
  const currentLoc = eventStore.getState()._defaultLocation;
  await sync.run(`location:${locationKey(currentLoc)}`, async () => {
    const location = await getClient().location.get({
      location: locationQuery(currentLoc),
    });
    const key = locationKey(location);
    eventStore.setState((s) => {
      if (!s.location[key]) s.location[key] = {};
      s.location[key].info = location;
      s._defaultLocation = {
        directory: location.directory,
        workspaceID: location.workspaceID,
      };
    });
  });
  const loc = eventStore.getState()._defaultLocation;
  await Promise.all([
    sync.run(`location.agent:${locationKey(loc)}`, async () => {
      const r = await getClient().agent.list({ location: locationQuery(loc) });
      eventStore.setState((s) => {
        s.location[locationKey(r.location)] = {
          ...s.location[locationKey(r.location)],
          agent: r.data,
        };
      });
    }),
    sync.run(`location.command:${locationKey(loc)}`, async () => {
      const r = await getClient().command.list({
        location: locationQuery(loc),
      });
      eventStore.setState((s) => {
        s.location[locationKey(r.location)] = {
          ...s.location[locationKey(r.location)],
          command: r.data,
        };
      });
    }),
    sync.run(`location.integration:${locationKey(loc)}`, async () => {
      const r = await getClient().integration.list({
        location: locationQuery(loc),
      });
      eventStore.setState((s) => {
        s.location[locationKey(r.location)] = {
          ...s.location[locationKey(r.location)],
          integration: r.data,
        };
      });
    }),
    sync.run(`location.mcp.server:${locationKey(loc)}`, async () => {
      const r = await getClient().mcp.list({ location: locationQuery(loc) });
      eventStore.setState((s) => {
        s.location[locationKey(r.location)] = {
          ...s.location[locationKey(r.location)],
          mcp: { ...s.location[locationKey(r.location)]?.mcp, server: r.data },
        };
      });
    }),
    sync.run(`location.mcp.resource:${locationKey(loc)}`, async () => {
      const r = await getClient().mcp.resource.catalog({
        location: locationQuery(loc),
      });
      eventStore.setState((s) => {
        s.location[locationKey(r.location)] = {
          ...s.location[locationKey(r.location)],
          mcp: {
            ...s.location[locationKey(r.location)]?.mcp,
            resource: r.data.resources,
          },
        };
      });
    }),
    sync.run(`location.model:${locationKey(loc)}`, async () => {
      const r = await getClient().model.list({ location: locationQuery(loc) });
      eventStore.setState((s) => {
        s.location[locationKey(r.location)] = {
          ...s.location[locationKey(r.location)],
          model: r.data,
        };
      });
    }),
    sync.run(`location.provider:${locationKey(loc)}`, async () => {
      const r = await getClient().provider.list({
        location: locationQuery(loc),
      });
      eventStore.setState((s) => {
        s.location[locationKey(r.location)] = {
          ...s.location[locationKey(r.location)],
          provider: r.data,
        };
      });
    }),
    sync.run(`location.reference:${locationKey(loc)}`, async () => {
      const r = await getClient().reference.list({
        location: locationQuery(loc),
      });
      eventStore.setState((s) => {
        s.location[locationKey(r.location)] = {
          ...s.location[locationKey(r.location)],
          reference: r.data,
        };
      });
    }),
    sync.run(`location.skill:${locationKey(loc)}`, async () => {
      const r = await getClient().skill.list({ location: locationQuery(loc) });
      eventStore.setState((s) => {
        s.location[locationKey(r.location)] = {
          ...s.location[locationKey(r.location)],
          skill: r.data,
        };
      });
    }),
    sync.run(`location.shell:${locationKey(loc)}`, async () => {
      const r = await getClient().shell.list({ location: locationQuery(loc) });
      eventStore.setState((s) => {
        s.location[locationKey(r.location)] = {
          ...s.location[locationKey(r.location)],
          shell: Object.fromEntries(
            r.data.map((info: ShellInfo) => [info.id, info]),
          ),
        };
      });
    }),
  ]);
}

export async function syncSessionList() {
  return sync.run("session.list", async () => {
    const loc = eventStore.getState()._defaultLocation;
    const response = await getClient().session.list({
      project: loc.directory ? undefined : undefined,
      parentID: null,
      limit: 50,
      order: "desc",
    });
    eventStore.setState((s) => {
      for (const session of response.data) {
        s.session.info[session.id] = session;
      }
      for (const session of response.data) {
        sync.complete(`session:${session.id}`);
        registerSession(s, session.id);
      }
      s._loadedSessions = true;
    });
  });
}
