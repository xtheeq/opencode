import type { Project, SessionInfo } from "@opencode-ai/client/promise";

/** Project name when present, otherwise the basename of the canonical path. */
export function projectDisplayName(project: Project): string {
  if (project.name?.trim()) return project.name;
  return pathBasename(project.canonical);
}

/** Sessions belonging to a project, newest-updated first. */
export function sessionsForProject(
  sessions: SessionInfo[],
  projectID: string,
): SessionInfo[] {
  return sessions
    .filter((session) => session.projectID === projectID)
    .sort((a, b) => b.time.updated - a.time.updated);
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

export function findActiveProject(
  projects: Project[],
  directory: string | undefined,
): Project | undefined {
  return projects.find((project) => isProjectActive(project, directory));
}

export function pathBasename(path: string) {
  const trimmed = path.replace(/\/+$/, "");
  if (!trimmed) return path;
  const index = trimmed.lastIndexOf("/");
  return trimmed.slice(index + 1) || trimmed;
}
