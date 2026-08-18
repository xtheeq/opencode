import { describe, expect, test } from "bun:test";
import type { Project } from "@opencode-ai/client/promise";
import {
  isProjectActive,
  projectDisplayName,
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
