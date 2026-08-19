import type {
  ModelInfo,
  ModelRef,
  ProviderInfo,
} from "@opencode-ai/client/promise";
import type { ModelSelection } from "@/types/composer";

export type ModelSection = {
  title: string;
  data: ModelInfo[];
};

export function modelSections(
  models: ModelInfo[],
  providers: ProviderInfo[],
): ModelSection[] {
  const names = new Map(
    providers.map((provider) => [provider.id, provider.name]),
  );
  const groups = models.reduce((acc, model) => {
    const list = acc.get(model.providerID);
    if (list) list.push(model);
    else acc.set(model.providerID, [model]);
    return acc;
  }, new Map<string, ModelInfo[]>());
  return [...groups.entries()]
    .map(([providerID, data]) => ({
      title: names.get(providerID) ?? providerID,
      data: [...data].sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.title.localeCompare(b.title));
}

export function filterModelSections(
  sections: ModelSection[],
  query: string,
): ModelSection[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return sections;
  return sections.flatMap((section) => {
    const data = section.data.filter(
      (model) =>
        section.title.toLowerCase().includes(needle) ||
        model.name.toLowerCase().includes(needle) ||
        model.modelID.toLowerCase().includes(needle),
    );
    return data.length > 0 ? [{ ...section, data }] : [];
  });
}

export function modelSelectionKey(model: ModelSelection): string {
  return `${model.providerID}/${model.modelID}`;
}

export function modelRefToSelection(model: ModelRef): ModelSelection {
  return {
    providerID: model.providerID,
    modelID: model.id,
    variant: model.variant,
  };
}

export function modelDisplayName(
  models: ModelInfo[],
  model: ModelSelection,
): string {
  return (
    models.find(
      (item) =>
        item.providerID === model.providerID && item.modelID === model.modelID,
    )?.name ?? model.modelID
  );
}

// Variant ids for a base model: empty when it has none, undefined when unknown.
export function modelVariants(
  models: ModelInfo[],
  model: ModelSelection,
): string[] | undefined {
  return models
    .find(
      (item) =>
        item.providerID === model.providerID && item.modelID === model.modelID,
    )
    ?.variants.map((variant) => variant.id);
}

// Draft pick wins, then the session's committed model, then the primary
// agent's configured model. Never invents a default from the catalog.
export function resolveCurrentModel(
  draft: ModelSelection | undefined,
  session: ModelRef | undefined,
  agent: ModelRef | undefined,
): ModelSelection | undefined {
  if (draft) return draft;
  if (session) return modelRefToSelection(session);
  if (agent) return modelRefToSelection(agent);
  return undefined;
}
