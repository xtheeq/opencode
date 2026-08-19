import { describe, expect, test } from "bun:test";
import type {
  ModelInfo,
  ModelRef,
  ProviderInfo,
} from "@opencode-ai/client/promise";
import type { ModelSelection } from "@/types/composer";
import {
  filterModelSections,
  modelDisplayName,
  modelRefToSelection,
  modelSections,
  modelSelectionKey,
  modelVariants,
  resolveCurrentModel,
  type ModelSection,
} from "@/utils/composer-pickers";

const model = (overrides: Partial<ModelInfo> = {}): ModelInfo =>
  ({
    id: "gpt",
    modelID: "gpt",
    providerID: "openai",
    name: "GPT",
    capabilities: {},
    variants: [],
    time: { released: 0 },
    cost: [],
    ...overrides,
  }) as ModelInfo;

const provider = (overrides: Partial<ProviderInfo> = {}): ProviderInfo =>
  ({
    id: "openai",
    name: "OpenAI",
    activation: "enabled",
    package: "pkg",
    ...overrides,
  }) as ProviderInfo;

const ref = (overrides: Partial<ModelRef> = {}): ModelRef => ({
  id: "gpt",
  providerID: "openai",
  ...overrides,
});

describe("modelSections", () => {
  test("groups models by provider using the provider name", () => {
    const sections = modelSections(
      [
        model({ providerID: "openai", name: "Claude" }),
        model({ providerID: "anthropic", modelID: "claude", name: "Claude" }),
        model({ providerID: "anthropic", modelID: "opus", name: "Opus" }),
      ],
      [
        provider({ id: "openai", name: "OpenAI" }),
        provider({ id: "anthropic", name: "Anthropic" }),
      ],
    );

    expect(sections).toEqual([
      {
        title: "Anthropic",
        data: [
          model({ providerID: "anthropic", modelID: "claude", name: "Claude" }),
          model({ providerID: "anthropic", modelID: "opus", name: "Opus" }),
        ],
      },
      {
        title: "OpenAI",
        data: [model({ providerID: "openai", name: "Claude" })],
      },
    ]);
  });

  test("falls back to the provider id for unknown providers", () => {
    const sections = modelSections(
      [model({ providerID: "unknown-provider", name: "Mystery" })],
      [],
    );

    expect(sections).toEqual([
      {
        title: "unknown-provider",
        data: [model({ providerID: "unknown-provider", name: "Mystery" })],
      },
    ]);
  });

  test("sorts models within a section by name", () => {
    const sections = modelSections(
      [
        model({ providerID: "p", modelID: "z", name: "Zeta" }),
        model({ providerID: "p", modelID: "a", name: "Alpha" }),
      ],
      [provider({ id: "p", name: "P" })],
    );

    expect(sections[0].data.map((item) => item.name)).toEqual([
      "Alpha",
      "Zeta",
    ]);
  });

  test("returns an empty list for no models", () => {
    expect(modelSections([], [])).toEqual([]);
  });
});

describe("filterModelSections", () => {
  const sections: ModelSection[] = [
    {
      title: "Anthropic",
      data: [
        model({ name: "Claude" }),
        model({ modelID: "opus", name: "Opus" }),
      ],
    },
    { title: "OpenAI", data: [model({ name: "GPT" })] },
  ];

  test("matches model names and ids and drops emptied sections", () => {
    expect(filterModelSections(sections, "opus")).toEqual([
      { title: "Anthropic", data: [model({ modelID: "opus", name: "Opus" })] },
    ]);
  });

  test("matches provider titles", () => {
    expect(filterModelSections(sections, "open")).toEqual([
      { title: "OpenAI", data: [model({ name: "GPT" })] },
    ]);
  });

  test("returns all sections for an empty query", () => {
    expect(filterModelSections(sections, "")).toEqual(sections);
  });

  test("is case-insensitive", () => {
    expect(filterModelSections(sections, "ClAUDE")).toEqual([
      { title: "Anthropic", data: [model({ name: "Claude" })] },
    ]);
  });
});

describe("modelSelectionKey", () => {
  test("is provider and model id joined", () => {
    expect(modelSelectionKey({ providerID: "openai", modelID: "gpt" })).toBe(
      "openai/gpt",
    );
  });
});

describe("modelRefToSelection", () => {
  test("maps the ref id to modelID and keeps the variant", () => {
    expect(
      modelRefToSelection({
        id: "gpt",
        providerID: "openai",
        variant: "turbo",
      }),
    ).toEqual({
      providerID: "openai",
      modelID: "gpt",
      variant: "turbo",
    });
  });
});

describe("modelDisplayName", () => {
  test("uses the catalog name when the model is known", () => {
    expect(
      modelDisplayName([model({ name: "GPT" })], {
        providerID: "openai",
        modelID: "gpt",
      }),
    ).toBe("GPT");
  });

  test("falls back to the model id when the catalog does not contain it", () => {
    expect(modelDisplayName([], { providerID: "openai", modelID: "gpt" })).toBe(
      "gpt",
    );
  });
});

describe("modelVariants", () => {
  test("returns the variant ids for a known base model", () => {
    const models = [
      model({
        modelID: "claude",
        variants: [{ id: "sonnet" }, { id: "opus" }],
      }),
    ];
    expect(
      modelVariants(models, { providerID: "openai", modelID: "claude" }),
    ).toEqual(["sonnet", "opus"]);
  });

  test("returns an empty list for a base model with no variants", () => {
    expect(
      modelVariants([model({ modelID: "claude" })], {
        providerID: "openai",
        modelID: "claude",
      }),
    ).toEqual([]);
  });

  test("returns undefined for an unknown base model", () => {
    expect(
      modelVariants([], { providerID: "openai", modelID: "missing" }),
    ).toBeUndefined();
  });
});

describe("resolveCurrentModel", () => {
  test("prefers an explicit draft over the session model", () => {
    const draft: ModelSelection = {
      providerID: "anthropic",
      modelID: "claude",
    };
    expect(resolveCurrentModel(draft, ref(), undefined)).toEqual(draft);
  });

  test("uses the session model when there is no draft", () => {
    expect(
      resolveCurrentModel(undefined, ref({ variant: "sonnet" }), undefined),
    ).toEqual({
      providerID: "openai",
      modelID: "gpt",
      variant: "sonnet",
    });
  });

  test("falls back to the primary agent model when nothing else is set", () => {
    expect(resolveCurrentModel(undefined, undefined, ref())).toEqual({
      providerID: "openai",
      modelID: "gpt",
    });
  });

  test("returns undefined when nothing is set", () => {
    expect(
      resolveCurrentModel(undefined, undefined, undefined),
    ).toBeUndefined();
  });
});
