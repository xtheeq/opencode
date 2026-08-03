import { describe, expect, test } from "bun:test";
import type { FormField, FormInfo } from "@opencode-ai/client/promise";
import {
  createFormBodyState,
  formAcknowledge,
  formAnswer,
  formCommitInput,
  formConfirm,
  formErrorMessage,
  formPick,
  formReply,
  formSetError,
  formSetExternalReady,
  formSetField,
  formSetSubmitting,
  formSingle,
  formSync,
  formUnsupported,
  formValidate,
} from "@/utils/form-state";

const form = (fields: FormField[]): FormInfo => ({
  id: "frm_1",
  sessionID: "ses_1",
  title: "Test",
  fields: fields as FormInfo["fields"],
});

describe("createFormBodyState", () => {
  test("seeds answers and custom defaults", () => {
    const state = createFormBodyState(
      form([
        { type: "string", key: "a", default: "x" },
        { type: "boolean", key: "b", default: true },
      ]),
    );
    expect(state.answers.a).toBe("x");
    expect(state.answers.b).toBe(true);
    expect(state.field).toBe(0);
    expect(state.submitting).toBe(false);
  });

  test("syncs to a new form by id", () => {
    const state = createFormBodyState(form([{ type: "string", key: "a" }]));
    expect(formSync(state, form([{ type: "string", key: "a" }]))).toBe(state);
    const next = formSync(state, { ...form([{ type: "boolean", key: "b" }]), id: "frm_2" });
    expect(next.formID).toBe("frm_2");
    expect(next.field).toBe(0);
  });
});

describe("formUnsupported", () => {
  test("rejects when-conditions, patterns, and unknown field types", () => {
    expect(formUnsupported(form([]))).toMatch(/no supported fields/);
    expect(
      formUnsupported(
        form([{ type: "string", key: "a", when: [{ key: "b", op: "eq", value: "x" }] }]),
      ),
    ).toMatch(/Conditional/);
    expect(formUnsupported(form([{ type: "string", key: "a", pattern: "^x$" }]))).toMatch(
      /Pattern/,
    );
    expect(formUnsupported(form([{ type: "date", key: "a" } as unknown as FormField]))).toMatch(
      /not supported/,
    );
    expect(formUnsupported(form([{ type: "string", key: "a" }]))).toBeUndefined();
  });
});

describe("form navigation and answering", () => {
  const multi = form([
    { type: "string", key: "a", options: [{ value: "x", label: "X" }] },
    { type: "boolean", key: "b" },
  ]);

  test("formPick selects a row and advances the field", () => {
    let state = createFormBodyState(multi);
    expect(formSingle(multi)).toBe(false);
    state = formPick(state, multi);
    expect(state.answers.a).toBe("x");
    expect(state.field).toBe(1);
    expect(formConfirm(multi, state)).toBe(false);
  });

  test("formSetField clamps out of range", () => {
    const state = createFormBodyState(multi);
    const clamped = formSetField(state, multi, 99);
    expect(clamped.field).toBe(multi.fields.length);
    expect(formConfirm(multi, clamped)).toBe(true);
  });

  test("single boolean forms submit without advancing", () => {
    const single = form([{ type: "boolean", key: "b" }]);
    expect(formSingle(single)).toBe(true);
    let state = createFormBodyState(single);
    state = formPick(state, single);
    expect(state.answers.b).toBe(true);
    expect(state.field).toBe(0);
  });
});

describe("formCommitInput", () => {
  test("commits string and number values", () => {
    let state = createFormBodyState(form([{ type: "string", key: "a" }]));
    state = formCommitInput(state, form([{ type: "string", key: "a" }]), "  hello  ");
    expect(state.answers.a).toBe("hello");
    expect(state.editing).toBe(false);

    state = createFormBodyState(form([{ type: "number", key: "n" }]));
    state = formCommitInput(state, form([{ type: "number", key: "n" }]), "42");
    expect(state.answers.n).toBe(42);
  });

  test("rejects invalid input with an error", () => {
    let state = createFormBodyState(form([{ type: "number", key: "n" }]));
    state = formCommitInput(state, form([{ type: "number", key: "n" }]), "not-a-number");
    expect(state.error).toMatch(/Expected a number/);
    expect(state.answers.n).toBeUndefined();
  });
});

describe("form validation and reply assembly", () => {
  const multi = form([
    { type: "string", key: "a", required: true },
    { type: "boolean", key: "b" },
  ]);

  test("formValidate reports the first invalid field", () => {
    const state = createFormBodyState(multi);
    expect(formValidate(multi, state)).toBe("a: Answer required");
  });

  test("formAnswer omits unanswered fields and is undefined when invalid", () => {
    let state = createFormBodyState(multi);
    expect(formAnswer(multi, state)).toBeUndefined();
    state = formSetField(state, multi, 0);
    state = { ...state, answers: { a: "x", b: false } };
    expect(formAnswer(multi, state)).toEqual({ a: "x", b: false });
  });

  test("formReply builds the plain reply value", () => {
    let state = createFormBodyState(multi);
    state = { ...state, answers: { a: "x" } };
    const reply = formReply(multi, state);
    expect(reply).toEqual({ sessionID: "ses_1", formID: "frm_1", answer: { a: "x" } });
    expect(formReply(multi, createFormBodyState(multi))).toBeUndefined();
  });
});

describe("external fields", () => {
  const external = form([
    { type: "external", key: "url", url: "https://example.com" },
    { type: "string", key: "a" },
  ]);

  test("requires acknowledgement before continuing", () => {
    let state = createFormBodyState(external);
    expect(formAcknowledge(state, external)).toBe(state);
    state = formSetExternalReady(state, "url");
    state = formAcknowledge(state, external);
    expect(state.answers.url).toBe(true);
    expect(state.field).toBe(1);
  });
});

describe("formSetSubmitting / formSetError", () => {
  test("submitting flag and error clear", () => {
    let state = createFormBodyState(form([{ type: "string", key: "a" }]));
    state = formSetSubmitting(state, true);
    expect(state.submitting).toBe(true);
    state = formSetError(state, "boom");
    expect(state.error).toBe("boom");
    expect(state.submitting).toBe(false);
  });

  test("formErrorMessage extracts string, message, or tag", () => {
    expect(formErrorMessage("oops")).toBe("oops");
    expect(formErrorMessage({ message: "nope" })).toBe("nope");
    expect(formErrorMessage({ _tag: "NotFound" })).toBe("NotFound");
    expect(formErrorMessage(undefined)).toBe("Form request failed");
  });
});
