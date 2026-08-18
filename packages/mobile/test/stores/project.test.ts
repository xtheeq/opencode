import { beforeEach, describe, expect, mock, test } from "bun:test";
import type { LocationRef, OpenCodeClient } from "@opencode-ai/client/promise";
import { eventStore, locationKey } from "@/stores/store";
import { sync } from "@/stores/sync";

const savedLocations: LocationRef[] = [];

mock.module("@/services/server-store", () => ({
  setLocation: mock(async (location: LocationRef) => {
    savedLocations.push(location);
  }),
  getServerUrl: async () => null,
  getServerPassword: async () => null,
  getLocation: async () => null,
  setServerUrl: async () => {},
  setServerPassword: async () => {},
  clearServerConfig: async () => {},
}));

const { activateDefaultLocation, selectProject } = await import("@/stores/project");

type CatalogInput = { location?: { directory?: string; workspace?: string } };

const echo = (input?: CatalogInput) => ({
  directory: input?.location?.directory ?? "",
  workspaceID: input?.location?.workspace,
});

const list = (input?: CatalogInput) => ({ location: echo(input), data: [] });

const fakeClient = {
  form: { request: { list: async (input?: CatalogInput) => ({ location: echo(input), data: [] }) } },
  location: {
    get: async ({ location }: CatalogInput) => {
      const directory = location?.directory || "/server-default";
      return {
        directory,
        workspaceID: directory === "/workspace" ? "ws_1" : undefined,
        project: { id: "prj_1", directory, canonical: "/workspace" },
      };
    },
  },
  agent: { list: async (input?: CatalogInput) => list(input) },
  command: { list: async (input?: CatalogInput) => list(input) },
  integration: { list: async (input?: CatalogInput) => list(input) },
  mcp: {
    list: async (input?: CatalogInput) => list(input),
    resource: {
      catalog: async (input?: CatalogInput) => ({ location: echo(input), data: { resources: [] } }),
    },
  },
  model: { list: async (input?: CatalogInput) => list(input) },
  provider: { list: async (input?: CatalogInput) => list(input) },
  reference: { list: async (input?: CatalogInput) => list(input) },
  shell: { list: async (input?: CatalogInput) => list(input) },
  skill: { list: async (input?: CatalogInput) => list(input) },
  websearch: { providers: async (input?: CatalogInput) => list(input) },
};

beforeEach(() => {
  sync.invalidate();
  savedLocations.length = 0;
  eventStore.setState((s) => {
    s._defaultLocation = { directory: "" };
    s._loadedProjects = false;
    s.project = { info: {}, permission: {} };
    s.location = {};
    s._client = fakeClient as unknown as OpenCodeClient;
  });
});

describe("selectProject", () => {
  test("activates the project directory and syncs its location catalog", async () => {
    await selectProject("/workspace");

    const store = eventStore.getState();
    expect(store._defaultLocation).toEqual({ directory: "/workspace", workspaceID: "ws_1" });
    expect(savedLocations).toEqual([{ directory: "/workspace", workspaceID: "ws_1" }]);

    const key = locationKey({ directory: "/workspace", workspaceID: "ws_1" });
    expect(store.location[key]?.info?.project.id).toBe("prj_1");
    expect(store.location[key]?.command).toEqual([]);
    expect(store.location[key]?.agent).toEqual([]);
  });

  test("persists the requested directory when the server returns it unchanged", async () => {
    await selectProject("/other");

    const store = eventStore.getState();
    expect(store._defaultLocation).toEqual({ directory: "/other", workspaceID: undefined });
    expect(savedLocations).toEqual([{ directory: "/other", workspaceID: undefined }]);
  });
});

describe("activateDefaultLocation", () => {
  test("resolves and persists the server default location", async () => {
    await activateDefaultLocation();

    const store = eventStore.getState();
    expect(store._defaultLocation).toEqual({ directory: "/server-default", workspaceID: undefined });
    expect(savedLocations).toEqual([{ directory: "/server-default", workspaceID: undefined }]);
  });

  test("overrides a previously selected project", async () => {
    await selectProject("/workspace");
    await activateDefaultLocation();

    const store = eventStore.getState();
    expect(store._defaultLocation).toEqual({ directory: "/server-default", workspaceID: undefined });
    expect(savedLocations[savedLocations.length - 1]).toEqual({
      directory: "/server-default",
      workspaceID: undefined,
    });
  });
});
