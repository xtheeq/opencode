import { describe, expect, test } from "bun:test";
import type {
  AgentInfo,
  CommandInfo,
  FileSystemEntry,
  McpResource,
  ReferenceInfo,
} from "@opencode-ai/client/promise";
import type { Suggestion } from "@/types/composer";
import {
  agentSuggestions,
  commandSuggestions,
  contextSuggestions,
  filterSuggestions,
  referenceSuggestions,
  resourceSuggestions,
  searchContextFiles,
  sheetSuggestions,
} from "@/utils/composer-suggestions";
import type { InteractionState } from "@/utils/composer-machine";

const reference = (overrides: Partial<ReferenceInfo> = {}): ReferenceInfo =>
  ({
    name: "docs",
    path: "/proj/docs",
    source: { type: "local", path: "/proj/docs" },
    ...overrides,
  }) as ReferenceInfo;

const agent = (overrides: Partial<AgentInfo> = {}): AgentInfo =>
  ({
    id: "a",
    name: "coder",
    mode: "subagent",
    hidden: false,
    ...overrides,
  }) as AgentInfo;

const resource = (overrides: Partial<McpResource> = {}): McpResource =>
  ({
    server: "playwright",
    name: "spec",
    uri: "resource://pw/spec",
    ...overrides,
  }) as McpResource;

describe("referenceSuggestions", () => {
  test("filters hidden references", () => {
    const suggestions = referenceSuggestions([
      reference({ name: "docs" }),
      reference({ name: "secret", hidden: true }),
    ]);

    expect(suggestions.map((s) => s.label)).toEqual(["@docs"]);
  });

  test("uses git repository as the description fallback", () => {
    const suggestions = referenceSuggestions([
      reference({
        name: "repo",
        source: { type: "git", repository: "org/repo" },
      }),
      reference({ name: "local", source: { type: "local", path: "/p/local" } }),
      reference({
        name: "described",
        description: "Explicit",
        source: { type: "local", path: "/p/d" },
      }),
    ]);

    expect(suggestions[0].description).toBe("org/repo");
    expect(suggestions[1].description).toBe("/p/local");
    expect(suggestions[2].description).toBe("Explicit");
  });

  test("builds a directory file mention", () => {
    const [suggestion] = referenceSuggestions([
      reference({ name: "docs", path: "/p/docs" }),
    ]);

    expect(suggestion).toMatchObject({
      id: "reference:docs",
      kind: "reference",
      label: "@docs",
      path: "/p/docs",
    });
    expect(suggestion.mention).toEqual({
      type: "file",
      path: "/p/docs",
      content: "@docs",
      start: 0,
      end: 0,
      mime: "application/x-directory",
      filename: "docs",
    });
  });
});

describe("agentSuggestions", () => {
  test("drops primary and hidden agents, keeps subagent and all modes", () => {
    const suggestions = agentSuggestions([
      agent({ name: "planner", mode: "primary" }),
      agent({ name: "coder", mode: "subagent" }),
      agent({ name: "researcher", mode: "all" }),
      agent({ name: "ghost", mode: "subagent", hidden: true }),
    ]);

    expect(suggestions.map((s) => s.label)).toEqual(["@coder", "@researcher"]);
  });

  test("builds an agent mention", () => {
    const [suggestion] = agentSuggestions([agent({ name: "coder" })]);

    expect(suggestion).toMatchObject({
      id: "agent:coder",
      kind: "agent",
      label: "@coder",
    });
    expect(suggestion.mention).toEqual({
      type: "agent",
      name: "coder",
      content: "@coder",
      start: 0,
      end: 0,
    });
  });
});

describe("resourceSuggestions", () => {
  test("maps server/uri ids and defaults the mime type", () => {
    const suggestions = resourceSuggestions([
      resource({
        server: "playwright",
        name: "spec",
        uri: "resource://pw/spec",
        mimeType: "text/markdown",
      }),
      resource({
        server: "files",
        name: "notes",
        uri: "resource://fs/notes",
        description: "Notes",
      }),
    ]);

    expect(suggestions[0]).toMatchObject({
      id: "resource:playwright:resource://pw/spec",
      kind: "resource",
      label: "@spec",
      path: "resource://pw/spec",
    });
    expect(suggestions[0].mention).toMatchObject({ mime: "text/markdown" });
    expect(suggestions[1]).toMatchObject({ description: "Notes" });
    expect(suggestions[1].mention).toMatchObject({
      type: "file",
      path: "resource://fs/notes",
      content: "@notes",
      mime: "text/plain",
      filename: "notes",
      url: "resource://fs/notes",
    });
  });
});

describe("contextSuggestions", () => {
  test("orders references, agents, then resources", () => {
    const suggestions = contextSuggestions({
      references: [reference({ name: "docs" })],
      agents: [agent({ name: "coder" })],
      resources: [resource({})],
    });

    expect(suggestions.map((s) => s.kind)).toEqual([
      "reference",
      "agent",
      "resource",
    ]);
  });
});

describe("commandSuggestions", () => {
  test("maps custom commands from the catalog", () => {
    const commands: CommandInfo[] = [
      { name: "review", description: "Start a review" },
    ];

    const suggestions = commandSuggestions(commands);

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]).toMatchObject({
      id: "custom.review",
      kind: "command",
      label: "/review",
      trigger: "review",
      title: "review",
      description: "Start a review",
    });
  });
});

describe("filterSuggestions", () => {
  const items: Suggestion[] = [
    { id: "agent:coder", kind: "agent", label: "@coder" },
    { id: "reference:docs", kind: "reference", label: "@docs" },
    { id: "file:src/app.ts", kind: "file", label: "src/app.ts" },
  ];

  test("returns everything for an empty query", () => {
    expect(filterSuggestions(items, "")).toHaveLength(3);
    expect(filterSuggestions(items, "   ")).toHaveLength(3);
  });

  test("matches labels case-insensitively", () => {
    expect(filterSuggestions(items, "COD").map((s) => s.id)).toEqual([
      "agent:coder",
    ]);
    expect(filterSuggestions(items, "app.ts")).toEqual([items[2]]);
    expect(filterSuggestions(items, "nope")).toEqual([]);
  });

  test("matches titles, triggers, and descriptions for searchable sheets", () => {
    const commands: Suggestion[] = [
      {
        id: "custom.review",
        kind: "command",
        label: "/review",
        trigger: "review",
        title: "Review",
        description: "Start a code review",
      },
      {
        id: "agent:coder",
        kind: "agent",
        label: "@coder",
        description: "Writes the code",
      },
    ];

    expect(filterSuggestions(commands, "review").map((s) => s.id)).toEqual([
      "custom.review",
    ]);
    expect(filterSuggestions(commands, "code review").map((s) => s.id)).toEqual(
      ["custom.review"],
    );
    expect(filterSuggestions(commands, "writes").map((s) => s.id)).toEqual([
      "agent:coder",
    ]);
  });
});

describe("sheetSuggestions", () => {
  const commands: Suggestion[] = [
    {
      id: "custom.review",
      kind: "command",
      label: "/review",
      trigger: "review",
      title: "review",
    },
    {
      id: "custom.plan",
      kind: "command",
      label: "/plan",
      trigger: "plan",
      title: "plan",
    },
  ];
  const context: Suggestion[] = [
    { id: "agent:coder", kind: "agent", label: "@coder" },
    { id: "reference:docs", kind: "reference", label: "@docs" },
  ];
  const files: Suggestion[] = [
    {
      id: "file:src/app.ts",
      kind: "file",
      label: "src/app.ts",
      path: "src/app.ts",
    },
  ];

  test("returns nothing while the popover is closed", () => {
    expect(
      sheetSuggestions(
        { popover: { type: "closed" } },
        { commands, context, files },
      ),
    ).toEqual([]);
  });

  test("filters commands for the command menu", () => {
    const interaction: InteractionState = {
      popover: { type: "command-menu", query: "rev" },
    };

    expect(
      sheetSuggestions(interaction, { commands, context, files }).map(
        (s) => s.id,
      ),
    ).toEqual(["custom.review"]);
  });

  test("filters commands for an inline command popover", () => {
    const interaction: InteractionState = {
      popover: { type: "command-inline", query: "" },
    };

    expect(
      sheetSuggestions(interaction, { commands, context, files }),
    ).toHaveLength(2);
  });

  test("combines context and file results for the context popover", () => {
    const interaction: InteractionState = {
      popover: { type: "context", query: "" },
    };

    expect(
      sheetSuggestions(interaction, { commands, context, files }).map(
        (s) => s.id,
      ),
    ).toEqual(["agent:coder", "reference:docs", "file:src/app.ts"]);
  });

  test("filters catalog and file results together for a context query", () => {
    const interaction: InteractionState = {
      popover: { type: "context", query: "cod" },
    };

    expect(
      sheetSuggestions(interaction, { commands, context, files }).map(
        (s) => s.id,
      ),
    ).toEqual(["agent:coder"]);
  });

  test("returns only matching file results when the context catalog is empty", () => {
    const interaction: InteractionState = {
      popover: { type: "context", query: "app" },
    };

    expect(
      sheetSuggestions(interaction, { commands, context: [], files }).map(
        (s) => s.id,
      ),
    ).toEqual(["file:src/app.ts"]);
  });
});

describe("searchContextFiles", () => {
  const entries: FileSystemEntry[] = [
    { path: "src/app.ts", type: "file" },
    { path: "src/lib.ts", type: "file" },
  ];

  test("maps file entries to file suggestions", async () => {
    const find = async (query: string): Promise<FileSystemEntry[]> =>
      query === "app" ? [entries[0]] : [];

    const suggestions = await searchContextFiles("app", { find });

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]).toMatchObject({
      id: "file:src/app.ts",
      kind: "file",
      label: "src/app.ts",
      path: "src/app.ts",
    });
    expect(suggestions[0].mention).toEqual({
      type: "file",
      path: "src/app.ts",
      content: "@src/app.ts",
      start: 0,
      end: 0,
    });
  });

  test("returns an empty list when nothing matches", async () => {
    const suggestions = await searchContextFiles("missing", {
      find: async () => [],
    });

    expect(suggestions).toEqual([]);
  });
});
