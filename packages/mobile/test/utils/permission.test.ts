import { describe, expect, test } from "bun:test";
import {
  canonicalToolName,
  permissionAlwaysLines,
  permissionOptionLabel,
  permissionPresentation,
} from "@/utils/permission";

describe("permissionPresentation", () => {
  test("edit uses path and diff", () => {
    const info = permissionPresentation({
      action: "edit",
      resources: ["/a/b.txt"],
      input: { path: "/a/b.txt" },
      metadata: { files: [{ patch: "@@ -1 +1 @@" }] },
    });
    expect(info.title).toBe("Edit /a/b.txt");
    expect(info.diff).toBe("@@ -1 +1 @@");
    expect(info.file).toBe("/a/b.txt");
  });

  test("read and list show the path", () => {
    expect(
      permissionPresentation({ action: "read", resources: ["/a"], input: {} })
        .title,
    ).toBe("Read /a");
    expect(
      permissionPresentation({
        action: "list",
        resources: ["/a"],
        input: { path: "/a" },
      }).lines,
    ).toEqual(["Path: /a"]);
  });

  test("shell shows the command", () => {
    const info = permissionPresentation({
      action: "shell",
      resources: [],
      input: { command: "ls" },
    });
    expect(info.title).toBe("Shell command");
    expect(info.lines).toEqual(["$ ls"]);
  });

  test("subagent titlecases the agent", () => {
    const info = permissionPresentation({
      action: "subagent",
      resources: [],
      input: { agent: "frontend dev", description: "build UI" },
    });
    expect(info.title).toBe("Frontend Dev Subagent");
    expect(info.lines).toEqual(["◉ build UI"]);
  });

  test("webfetch falls back to metadata url", () => {
    const info = permissionPresentation({
      action: "webfetch",
      resources: [],
      input: {},
      metadata: { url: "https://example.com" },
    });
    expect(info.title).toBe("WebFetch https://example.com");
  });

  test("websearch labels providers", () => {
    expect(
      permissionPresentation({
        action: "websearch",
        resources: [],
        input: { query: "q" },
        metadata: { provider: "exa" },
      }).title,
    ).toBe('Exa Web Search "q"');
  });

  test("lsp shows operation, path, and position", () => {
    const info = permissionPresentation({
      action: "lsp",
      resources: [],
      input: { path: "/a.ts", operation: "rename", line: 3, character: 5 },
    });
    expect(info.title).toBe("LSP rename /a.ts:3:5");
    expect(info.lines).toEqual([
      "Operation: rename",
      "Path: /a.ts",
      "Position: 3:5",
    ]);
  });

  test("external_directory shows the wildcard base", () => {
    const info = permissionPresentation({
      action: "external_directory",
      resources: ["/data/foo.txt"],
      metadata: { parentDir: "/data/*" },
    });
    expect(info.title).toBe("Access external directory /data");
    expect(info.lines).toEqual(["- /data/foo.txt"]);
  });

  test("unknown action falls back to a generic call", () => {
    const info = permissionPresentation({
      action: "frobnicate",
      resources: [],
    });
    expect(info.title).toBe("Call tool frobnicate");
  });
});

describe("canonicalToolName", () => {
  test("maps bash, task, apply_patch", () => {
    expect(canonicalToolName("bash")).toBe("shell");
    expect(canonicalToolName("task")).toBe("subagent");
    expect(canonicalToolName("apply_patch")).toBe("patch");
    expect(canonicalToolName("read")).toBe("read");
  });
});

describe("permissionAlwaysLines", () => {
  test("single wildcard save gets a short message", () => {
    expect(permissionAlwaysLines({ action: "shell", save: ["*"] })).toEqual([
      "This will allow shell until OpenCode is restarted.",
    ]);
  });

  test("patterns are listed", () => {
    const lines = permissionAlwaysLines({
      action: "edit",
      save: ["src/**", "test/**"],
    });
    expect(lines[0]).toMatch(/following patterns/);
    expect(lines.slice(1)).toEqual(["- src/**", "- test/**"]);
  });
});

describe("permissionOptionLabel", () => {
  test("maps every option", () => {
    expect(permissionOptionLabel("once")).toBe("Allow once");
    expect(permissionOptionLabel("always")).toBe("Allow always");
    expect(permissionOptionLabel("reject")).toBe("Reject");
    expect(permissionOptionLabel("confirm")).toBe("Confirm");
    expect(permissionOptionLabel("cancel")).toBe("Cancel");
  });
});
