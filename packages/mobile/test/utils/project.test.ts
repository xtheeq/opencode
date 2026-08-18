import { describe, expect, test } from "bun:test";
import type { Project, SessionInfo } from "@opencode-ai/client/promise";
import {
  findActiveProject,
  isProjectActive,
  pathBasename,
  projectDisplayName,
  sessionsForProject,
  sortProjects,
} from "@/utils/project";

const project = (overrides: Partial<Project> = {}): Project =>
  ({
    id: "prj_1",
    canonical: "/workspace/repo",
    time: { created: 0, updated: 100 },
    sandboxes: [],
    ...overrides,
  }) as Project;

const session = (overrides: Partial<SessionInfo> = {}): SessionInfo =>
  ({
    id: "ses_1",
    projectID: "prj_1",
    time: { created: 0, updated: 100 },
    location: { directory: "/workspace/repo" },
    cost: "0",
    tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
    ...overrides,
  }) as SessionInfo;

describe("projectDisplayName", () => {
  test("uses the project name when present", () => {
    expect(projectDisplayName(project({ name: "My Repo" }))).toBe("My Repo");
  });

  test("falls back to the canonical directory basename", () => {
    expect(projectDisplayName(project({ name: undefined }))).toBe("repo");
  });

  test("ignores a blank name", () => {
    expect(projectDisplayName(project({ name: "   " }))).toBe("repo");
  });

  test("strips a trailing slash before taking the basename", () => {
    expect(projectDisplayName(project({ canonical: "/workspace/repo/" }))).toBe("repo");
  });

  test("keeps a root canonical as-is", () => {
    expect(projectDisplayName(project({ canonical: "/" }))).toBe("/");
  });
});

describe("sortProjects", () => {
  test("orders by updated time descending", () => {
    const sorted = sortProjects([
      project({ id: "a", time: { created: 0, updated: 10 } }),
      project({ id: "b", time: { created: 0, updated: 30 } }),
      project({ id: "c", time: { created: 0, updated: 20 } }),
    ]);

    expect(sorted.map((item) => item.id)).toEqual(["b", "c", "a"]);
  });

  test("tiebreaks equal times by name then id", () => {
    const sorted = sortProjects([
      project({ id: "b", name: "zeta", time: { created: 0, updated: 10 } }),
      project({ id: "a", name: "alpha", time: { created: 0, updated: 10 } }),
      project({ id: "c", name: "alpha", time: { created: 0, updated: 10 } }),
    ]);

    expect(sorted.map((item) => item.id)).toEqual(["a", "c", "b"]);
  });
});

describe("isProjectActive", () => {
  test("matches the canonical directory", () => {
    expect(isProjectActive(project({ canonical: "/workspace/repo" }), "/workspace/repo")).toBe(true);
  });

  test("returns false for a different directory", () => {
    expect(isProjectActive(project({ canonical: "/workspace/repo" }), "/other")).toBe(false);
  });

  test("returns false when no directory is set", () => {
    expect(isProjectActive(project({ canonical: "/workspace/repo" }), undefined)).toBe(false);
  });
});

describe("findActiveProject", () => {
  test("finds the project matching the directory", () => {
    const a = project({ id: "a", canonical: "/workspace/a" });
    const b = project({ id: "b", canonical: "/workspace/b" });

    expect(findActiveProject([a, b], "/workspace/b")?.id).toBe("b");
  });

  test("returns undefined when nothing matches", () => {
    expect(findActiveProject([project({ canonical: "/workspace/a" })], "/other")).toBeUndefined();
  });

  test("returns undefined when no directory is set", () => {
    expect(findActiveProject([project({ canonical: "/workspace/a" })], undefined)).toBeUndefined();
  });
});

describe("pathBasename", () => {
  test("returns the last path segment", () => {
    expect(pathBasename("/workspace/repo")).toBe("repo");
  });

  test("strips a trailing slash", () => {
    expect(pathBasename("/workspace/repo/")).toBe("repo");
  });

  test("keeps a root path as-is", () => {
    expect(pathBasename("/")).toBe("/");
  });

  test("returns the input when it has no separator", () => {
    expect(pathBasename("repo")).toBe("repo");
  });
});

describe("sessionsForProject", () => {
  test("filters sessions to a project and sorts newest-updated first", () => {
    const result = sessionsForProject(
      [
        session({ id: "a", projectID: "prj_1", time: { created: 0, updated: 10 } }),
        session({ id: "b", projectID: "prj_2", time: { created: 0, updated: 99 } }),
        session({ id: "c", projectID: "prj_1", time: { created: 0, updated: 30 } }),
      ],
      "prj_1",
    );

    expect(result.map((item) => item.id)).toEqual(["c", "a"]);
  });

  test("returns an empty list when the project has no sessions", () => {
    expect(sessionsForProject([session({ projectID: "prj_2" })], "prj_1")).toEqual([]);
  });
});
