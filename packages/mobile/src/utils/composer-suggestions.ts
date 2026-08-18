import type {
  AgentInfo,
  CommandInfo,
  FileSystemEntry,
  McpResource,
  ReferenceInfo,
} from "@opencode-ai/client/promise";
import type { Suggestion } from "@/types/composer";
import type { InteractionState } from "./composer-machine";

export function referenceSuggestions(
  references: ReferenceInfo[],
): Suggestion[] {
  return references
    .filter((reference) => !reference.hidden)
    .map((reference) => ({
      id: `reference:${reference.name}`,
      kind: "reference",
      label: `@${reference.name}`,
      path: reference.path,
      description:
        reference.description ?? referenceSourceDescription(reference),
      mention: {
        type: "file",
        path: reference.path,
        content: `@${reference.name}`,
        start: 0,
        end: 0,
        mime: "application/x-directory",
        filename: reference.name,
      },
    }));
}

function referenceSourceDescription(reference: ReferenceInfo): string {
  return reference.source.type === "git"
    ? reference.source.repository
    : reference.source.path;
}

export function agentSuggestions(agents: AgentInfo[]): Suggestion[] {
  return agents
    .filter((agent) => !agent.hidden && agent.mode !== "primary")
    .map((agent) => ({
      id: `agent:${agent.name}`,
      kind: "agent",
      label: `@${agent.name}`,
      description: agent.description,
      mention: {
        type: "agent",
        name: agent.name,
        content: `@${agent.name}`,
        start: 0,
        end: 0,
      },
    }));
}

export function resourceSuggestions(resources: McpResource[]): Suggestion[] {
  return resources.map((resource) => ({
    id: `resource:${resource.server}:${resource.uri}`,
    kind: "resource",
    label: `@${resource.name}`,
    path: resource.uri,
    description: resource.description,
    mention: {
      type: "file",
      path: resource.uri,
      content: `@${resource.name}`,
      start: 0,
      end: 0,
      mime: resource.mimeType ?? "text/plain",
      filename: resource.name,
      url: resource.uri,
    },
  }));
}

export type ContextCatalog = {
  references: ReferenceInfo[];
  agents: AgentInfo[];
  resources: McpResource[];
};

export function contextSuggestions(catalog: ContextCatalog): Suggestion[] {
  return [
    ...referenceSuggestions(catalog.references),
    ...agentSuggestions(catalog.agents),
    ...resourceSuggestions(catalog.resources),
  ];
}

export function commandSuggestions(commands: CommandInfo[]): Suggestion[] {
  return commands.map((command) => ({
    id: `custom.${command.name}`,
    kind: "command",
    label: `/${command.name}`,
    trigger: command.name,
    title: command.name,
    description: command.description,
  }));
}

export function filterSuggestions(
  items: Suggestion[],
  query: string,
): Suggestion[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return items;
  return items.filter((item) =>
    [item.label, item.title, item.trigger, item.description].some((field) =>
      field?.toLowerCase().includes(needle),
    ),
  );
}

export function sheetSuggestions(
  interaction: InteractionState,
  input: { commands: Suggestion[]; context: Suggestion[]; files: Suggestion[] },
): Suggestion[] {
  if (interaction.popover.type === "context") {
    return filterSuggestions(
      [...input.context, ...input.files],
      interaction.popover.query,
    );
  }
  if (
    interaction.popover.type === "command-menu" ||
    interaction.popover.type === "command-inline"
  ) {
    return filterSuggestions(input.commands, interaction.popover.query);
  }
  return [];
}

export function searchContextFiles(
  query: string,
  input: { find: (query: string) => Promise<FileSystemEntry[]> },
): Promise<Suggestion[]> {
  return input.find(query).then((entries) =>
    entries.map((entry) => {
      const path = entry.path;
      return {
        id: `file:${path}`,
        kind: "file",
        label: path,
        path,
        mention: { type: "file", path, content: `@${path}`, start: 0, end: 0 },
      };
    }),
  );
}
