import { describe, expect, test } from "bun:test";
import type { FormField } from "@opencode-ai/client/promise";
import {
  formCustom,
  formDisplayValue,
  formInitialValues,
  formRows,
  formSelected,
  formSetMultiselectCustom,
  formTextual,
  formToggleMultiselect,
  formValidateValue,
} from "@/utils/form";

const stringField = (overrides: Partial<Extract<FormField, { type: "string" }>> = {}) =>
  ({
    type: "string",
    key: "name",
    ...overrides,
  }) as Extract<FormField, { type: "string" }>;

describe("formInitialValues", () => {
  test("collects answer defaults and custom defaults", () => {
    const initial = formInitialValues([
      { type: "string", key: "a", default: "x" },
      { type: "string", key: "b", options: [{ value: "o", label: "O" }], custom: true, default: "custom" },
      { type: "string", key: "c", options: [{ value: "o", label: "O" }], custom: true, default: "o" },
      { type: "external", key: "d", url: "https://example.com" },
    ] as FormField[]);
    expect(initial.answers.a).toBe("x");
    expect(initial.custom.b).toBe("custom");
    expect(initial.custom.c).toBeUndefined();
    expect(initial.answers.d).toBeUndefined();
  });
});

describe("formTextual / formCustom", () => {
  test("number and option-less string are textual", () => {
    expect(formTextual({ type: "number", key: "n" })).toBe(true);
    expect(formTextual(stringField())).toBe(true);
    expect(formTextual(stringField({ options: [{ value: "o", label: "O" }] }))).toBe(false);
  });

  test("custom applies to string-with-options and multiselect", () => {
    expect(formCustom(stringField({ options: [{ value: "o", label: "O" }], custom: true }))).toBe(true);
    expect(formCustom({ type: "multiselect", key: "m", options: [], custom: true })).toBe(true);
    expect(formCustom(stringField({ options: [{ value: "o", label: "O" }] }))).toBe(false);
  });
});

describe("formRows", () => {
  test("boolean renders Yes/No", () => {
    expect(formRows({ type: "boolean", key: "b" })).toEqual([
      { value: true, label: "Yes" },
      { value: false, label: "No" },
    ]);
  });

  test("options render rows", () => {
    expect(
      formRows(stringField({
        options: [
          { value: "a", label: "A", description: "desc" },
          { value: "b", label: "B" },
        ],
      })),
    ).toEqual([
      { value: "a", label: "A", description: "desc" },
      { value: "b", label: "B" },
    ]);
  });
});

describe("formValidateValue", () => {
  test("required validation", () => {
    const field = stringField({ required: true });
    expect(formValidateValue(field, undefined)).toBe("Answer required");
    expect(formValidateValue(field, "")).toBe("Answer required");
    expect(formValidateValue(field, "ok")).toBeUndefined();
  });

  test("string length constraints", () => {
    expect(formValidateValue(stringField({ minLength: 3 }), "ab")).toMatch(/at least 3/);
    expect(formValidateValue(stringField({ maxLength: 2 }), "abc")).toMatch(/at most 2/);
  });

  test("format constraints", () => {
    expect(formValidateValue(stringField({ format: "email" }), "nope")).toBe("Expected an email address");
    expect(formValidateValue(stringField({ format: "uri" }), "nope")).toBe("Expected a URL");
    expect(formValidateValue(stringField({ format: "date" }), "2026-13-01")).toMatch(/date/);
    expect(formValidateValue(stringField({ format: "email" }), "a@b.co")).toBeUndefined();
  });

  test("number bounds", () => {
    const field = { type: "number" as const, key: "n", minimum: 1, maximum: 5 };
    expect(formValidateValue(field, 0)).toMatch(/at least 1/);
    expect(formValidateValue(field, 6)).toMatch(/at most 5/);
    expect(formValidateValue(field, 3)).toBeUndefined();
  });

  test("integer rejects decimals", () => {
    expect(formValidateValue({ type: "integer" as const, key: "n" }, 1.5)).toBe("Expected an integer");
    expect(formValidateValue({ type: "integer" as const, key: "n" }, 2)).toBeUndefined();
  });

  test("boolean", () => {
    expect(formValidateValue({ type: "boolean" as const, key: "b" }, true)).toBeUndefined();
    expect(formValidateValue({ type: "boolean" as const, key: "b" }, "yes")).toBe("Expected yes or no");
  });

  test("multiselect min/max and non-custom options", () => {
    const field: Extract<FormField, { type: "multiselect" }> = {
      type: "multiselect",
      key: "m",
      options: [{ value: "a", label: "A" }],
      minItems: 1,
    };
    expect(formValidateValue(field, [])).toMatch(/at least 1/);
    expect(formValidateValue(field, ["a"])).toBeUndefined();
    expect(formValidateValue(field, ["b"])).toBe("Select only available options");
    expect(formValidateValue({ ...field, custom: true }, ["b"])).toBeUndefined();
  });

  test("option-less string must be from options when not custom", () => {
    const field = stringField({ options: [{ value: "a", label: "A" }] });
    expect(formValidateValue(field, "z")).toBe("Select an available option");
  });
});

describe("formToggleMultiselect / formSetMultiselectCustom", () => {
  test("toggles an item", () => {
    expect(formToggleMultiselect(["a", "b"], "a")).toEqual(["b"]);
    expect(formToggleMultiselect(["a"], "c")).toEqual(["a", "c"]);
    expect(formToggleMultiselect(undefined, "a")).toEqual(["a"]);
  });

  test("replaces a previous custom value", () => {
    expect(formSetMultiselectCustom(["old"], "old", "new")).toEqual(["new"]);
    expect(formSetMultiselectCustom(["old"], "old", "")).toEqual([]);
    expect(formSetMultiselectCustom(undefined, undefined, "new")).toEqual(["new"]);
  });
});

describe("formSelected / formDisplayValue", () => {
  const field = stringField({
    options: [
      { value: "a", label: "A" },
      { value: "b", label: "B" },
    ],
    custom: true,
  });

  test("formSelected locates the row or custom slot", () => {
    expect(formSelected(field, "b")).toBe(1);
    expect(formSelected(field, "custom")).toBe(2);
    expect(formSelected(field, undefined)).toBe(0);
  });

  test("formDisplayValue renders labels", () => {
    const multiField: Extract<FormField, { type: "multiselect" }> = {
      type: "multiselect",
      key: "m",
      options: [{ value: "a", label: "A" }],
      custom: true,
    };
    expect(formDisplayValue(field, "a", "")).toBe("A");
    expect(formDisplayValue(field, "custom", "")).toBe("custom");
    expect(formDisplayValue(multiField, ["a", "custom"], "(none)")).toBe("A, custom");
    expect(formDisplayValue(multiField, [], "(none)")).toBe("(none)");
  });
});
