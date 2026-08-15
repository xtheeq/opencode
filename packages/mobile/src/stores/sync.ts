import type {
  AgentInfo,
  CommandInfo,
  IntegrationInfo,
  LocationGetOutput,
  LocationRef,
  McpResource,
  McpResourceCatalog,
  McpServer,
  ModelInfo,
  ProviderInfo,
  ReferenceInfo,
  SessionMessageInfo,
  ShellInfo,
  SkillInfo,
  WebSearchProvider,
} from "@opencode-ai/client/promise";
import { getClient } from "@/stores/store";
import { sweepAutoApproved } from "@/services/blocker-reply";
import {
  eventStore,
  locationKey,
  locationQuery,
  messageIndex,
  registerSession,
  type Blocker,
  type LocationData,
  type Store,
} from "./store";

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

export const sync = createSync();

const CATALOG_FIELDS = [
  "agent",
  "command",
  "integration",
  "mcp.server",
  "mcp.resource",
  "model",
  "provider",
  "reference",
  "skill",
  "shell",
] as const;

type CatalogField =
  | "agent"
  | "command"
  | "integration"
  | "mcp.server"
  | "mcp.resource"
  | "model"
  | "provider"
  | "reference"
  | "skill"
  | "shell"
  | "websearch";

type CatalogResponse =
  | { field: "agent"; location: LocationGetOutput; data: AgentInfo[] }
  | { field: "command"; location: LocationGetOutput; data: CommandInfo[] }
  | {
      field: "integration";
      location: LocationGetOutput;
      data: IntegrationInfo[];
    }
  | { field: "mcp.server"; location: LocationGetOutput; data: McpServer[] }
  | {
      field: "mcp.resource";
      location: LocationGetOutput;
      data: McpResourceCatalog;
    }
  | { field: "model"; location: LocationGetOutput; data: ModelInfo[] }
  | { field: "provider"; location: LocationGetOutput; data: ProviderInfo[] }
  | { field: "reference"; location: LocationGetOutput; data: ReferenceInfo[] }
  | { field: "shell"; location: LocationGetOutput; data: ShellInfo[] }
  | { field: "skill"; location: LocationGetOutput; data: SkillInfo[] }
  | {
      field: "websearch";
      location: LocationGetOutput;
      data: WebSearchProvider[];
    };

async function fetchCatalog(
  field: CatalogField,
  location: LocationRef,
): Promise<CatalogResponse> {
  const query = { location: locationQuery(location) };
  switch (field) {
    case "agent": {
      const r = await getClient().agent.list(query);
      return { field, ...r };
    }
    case "command": {
      const r = await getClient().command.list(query);
      return { field, ...r };
    }
    case "integration": {
      const r = await getClient().integration.list(query);
      return { field, ...r };
    }
    case "mcp.server": {
      const r = await getClient().mcp.list(query);
      return { field, ...r };
    }
    case "mcp.resource": {
      const r = await getClient().mcp.resource.catalog(query);
      return { field, ...r };
    }
    case "model": {
      const r = await getClient().model.list(query);
      return { field, ...r };
    }
    case "provider": {
      const r = await getClient().provider.list(query);
      return { field, ...r };
    }
    case "reference": {
      const r = await getClient().reference.list(query);
      return { field, ...r };
    }
    case "shell": {
      const r = await getClient().shell.list(query);
      return { field, ...r };
    }
    case "skill": {
      const r = await getClient().skill.list(query);
      return { field, ...r };
    }
    case "websearch": {
      const r = await getClient().websearch.providers(query);
      return { field, ...r };
    }
  }
}

function setLocationField(
  store: Store,
  key: string,
  response: CatalogResponse,
): LocationData {
  const base = store.location[key];
  switch (response.field) {
    case "mcp.server":
      return {
        ...base,
        mcp: { ...base?.mcp, server: response.data },
      };
    case "mcp.resource":
      return {
        ...base,
        mcp: { ...base?.mcp, resource: response.data.resources },
      };
    case "shell":
      return {
        ...base,
        shell: Object.fromEntries(response.data.map((info) => [info.id, info])),
      };
    default:
      return { ...base, [response.field]: response.data };
  }
}

export function refreshLocation(field: CatalogField, location: LocationRef) {
  const key = `location.${field}:${locationKey(location)}`;
  sync.invalidate(key);
  return sync.run(key, async () => {
    const response = await fetchCatalog(field, location);
    eventStore.setState((s) => {
      const storeKey = locationKey(response.location);
      s.location[storeKey] = setLocationField(s, storeKey, response);
    });
  });
}

export function removeSession(store: Store, sessionID: string) {
  messageIndex.delete(sessionID);
  sync.invalidate(`session:${sessionID}`);
  delete store.session.info[sessionID];
  delete store.session.active[sessionID];
  delete store.session.message[sessionID];
  delete store.session.pending[sessionID];
  delete store.session.input[sessionID];
  delete store.session.blocker[sessionID];
  delete store._hydration[sessionID];
  for (const [rootID, family] of Object.entries(store.session.family)) {
    const next = family.filter((id) => id !== sessionID);
    if (next.length === 0) delete store.session.family[rootID];
    else store.session.family[rootID] = next;
  }
}

export function loadSession(sessionID: string) {
  sync.run(`session:${sessionID}`, async () => {
    const session = await getClient().session.get({ sessionID });
    eventStore.setState((s) => {
      s.session.info[sessionID] = session;
      registerSession(s, sessionID);
    });
  });
}

// Reconciles a fresh server projection with the local rows. Server rows
// replace existing ones; rows the server dropped are removed. Rows that are
// local-only (unpromoted inputs) or arrived via live events while the
// snapshot was in flight (`started` is the pre-fetch id set) are kept so a
// refetch never loses them. During the buffered reconnect hydration no live
// events interleave, so the `started` protection is inert there.
function reconcileMessages(
  fetched: SessionMessageInfo[],
  existing: SessionMessageInfo[],
  started: Set<string>,
  localOnly: Set<string>,
): SessionMessageInfo[] {
  const fetchedById = new Map(fetched.map((message) => [message.id, message]));
  const result: SessionMessageInfo[] = [];
  for (const message of existing) {
    const fresh = fetchedById.get(message.id);
    if (fresh) {
      result.push(fresh);
      fetchedById.delete(message.id);
      continue;
    }
    if (localOnly.has(message.id) || !started.has(message.id)) {
      result.push(message);
    }
  }
  for (const fresh of fetchedById.values()) result.push(fresh);
  return result;
}

const hydrating = new Map<string, Promise<void>>();

export function hydrateSession(sessionID: string): Promise<void> {
  const active = hydrating.get(sessionID);
  if (active) return active;
  const pending = doHydrate(sessionID).finally(() => {
    if (hydrating.get(sessionID) === pending) hydrating.delete(sessionID);
  });
  hydrating.set(sessionID, pending);
  return pending;
}

async function doHydrate(sessionID: string) {
  eventStore.setState((s) => {
    s._hydration[sessionID] = "loading";
  });
  try {
    const [session, messages, pending] = await Promise.all([
      getClient().session.get({ sessionID }),
      getClient().message.list({ sessionID, limit: 200, order: "desc" }),
      getClient().session.inbox.list({ sessionID }),
    ]);
    const [permissions, forms] = await Promise.allSettled([
      getClient().permission.list({ sessionID }),
      getClient().form.list({ sessionID }),
    ]);
    eventStore.setState((s) => {
      const started = new Set(
        (s.session.message[sessionID] ?? []).map((message) => message.id),
      );
      s.session.info[sessionID] = session;
      registerSession(s, sessionID);
      const localOnly = new Set([
        ...(s.session.pending[sessionID]?.map((p) => p.id) ?? []),
        ...(s.session.input[sessionID] ?? []),
      ]);
      const merged = reconcileMessages(
        messages.data.toReversed(),
        s.session.message[sessionID] ?? [],
        started,
        localOnly,
      );
      s.session.message[sessionID] = merged;
      messageIndex.set(sessionID, new Map(merged.map((m, i) => [m.id, i])));
      s.session.pending[sessionID] = pending;
      const blockers: Blocker[] = [];
      if (permissions.status === "fulfilled") {
        for (const request of permissions.value)
          blockers.push({ kind: "permission", request });
      }
      if (forms.status === "fulfilled") {
        for (const request of forms.value)
          blockers.push({ kind: "form", request });
      }
      s.session.blocker[sessionID] = blockers;
      s._hydration[sessionID] = "loaded";
    });
    // Auto-approve requests restored by the backfill after a reconnect.
    if (eventStore.getState().session.autoApprove[sessionID]) {
      sweepAutoApproved(sessionID);
    }
  } catch (error) {
    console.error("Failed to hydrate session", sessionID, error);
    // Show whatever is cached; the next reconnect re-hydrates.
    eventStore.setState((s) => {
      s._hydration[sessionID] = "loaded";
    });
  }
}

export async function syncGlobalBlockers(location: LocationRef) {
  const key = `session.blocker:global:${locationKey(location)}`;
  return sync.run(key, async () => {
    const response = await getClient().form.request.list({
      location: locationQuery(location),
    });
    const ref = {
      directory: response.location.directory,
      workspaceID: response.location.workspaceID,
    };
    const blockers: Blocker[] = response.data
      .filter((request) => request.sessionID === "global")
      .map((request) => ({
        kind: "form",
        request: { ...request, location: ref },
      }));
    eventStore.setState((s) => {
      s.session.blocker["global"] = blockers;
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
  await Promise.all(CATALOG_FIELDS.map((field) => refreshLocation(field, loc)));
  await syncGlobalBlockers(loc);
}

export async function syncSessionList() {
  return sync.run("session.list", async () => {
    const response = await getClient().session.list({
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

export async function syncProjectList() {
  return sync.run("project.list", async () => {
    const projects = await getClient().project.list();
    eventStore.setState((s) => {
      for (const project of projects) {
        s.project.info[project.id] = project;
      }
    });
  });
}

// The event feed is live-only, so recovery is a rehydration of every
// previously-loaded session's projection. The event manager buffers live
// events during the refetch and replays them in order once the projection
// lands, so the store is never a mix of a stale snapshot and overlapping
// live mutations. The global sync cache is cleared so the eager
// catalog/session/project refetches actually run.
export async function recoverConnection(mgr: {
  runHydrated(fn: () => Promise<void>): Promise<void>;
}): Promise<void> {
  sync.invalidate();
  await mgr.runHydrated(async () => {
    const active = await getClient().session.active();
    eventStore.setState((s) => {
      for (const [sessionID, session] of Object.entries(active)) {
        s.session.active[sessionID] = session.type;
      }
    });
    await Promise.all([
      ...Object.keys(eventStore.getState()._hydration).map((sessionID) =>
        hydrateSession(sessionID),
      ),
      syncLocation(),
      syncSessionList(),
      syncProjectList(),
    ]);
  });
}

// While the connection is down, cached reads may be stale: any refetch issued
// during the outage should hit the server rather than serve a completed cache
// entry. Invalidate whenever the transport status leaves "connected"; the
// reconnect path (recoverConnection) already invalidates on the way back in.
eventStore.subscribe((state, prev) => {
  if (state.connection.status === prev.connection.status) return;
  if (state.connection.status === "connected") return;
  sync.invalidate();
});
