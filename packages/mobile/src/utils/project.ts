import type { Project } from "@opencode-ai/client/promise";

/** Project name when present, otherwise the basename of the canonical path. */
export function projectDisplayName(project: Project): string {
  if (project.name?.trim()) return project.name;
  return basename(project.canonical);
}

/** Newest-updated first; equal times fall back to name, then id. */
export function sortProjects(projects: Project[]): Project[] {
  return [...projects].sort(
    (a, b) =>
      b.time.updated - a.time.updated ||
      projectDisplayName(a).localeCompare(projectDisplayName(b)) ||
      a.id.localeCompare(b.id),
  );
}

export function isProjectActive(
  project: Project,
  directory: string | undefined,
): boolean {
  return directory !== undefined && project.canonical === directory;
}

function basename(path: string) {
  const trimmed = path.replace(/\/+$/, "");
  if (!trimmed) return path;
  const index = trimmed.lastIndexOf("/");
  return trimmed.slice(index + 1) || trimmed;
}
