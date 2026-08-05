import { afterEach, describe, expect, test } from "bun:test";
import {
  MAX_ACTIVE,
  dismissAllSignals,
  dismissSignal,
  raiseSignal,
  selectForeground,
  signalStore,
} from "@/stores/signals";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

afterEach(() => {
  dismissAllSignals();
});

describe("raiseSignal", () => {
  test("adds a signal with a generated id and defaults", () => {
    const id = raiseSignal({ title: "Hello" });
    const signal = signalStore.getState().signals[0];
    expect(signal).toMatchObject({
      id,
      title: "Hello",
      kind: "info",
      priority: 10,
    });
  });

  test("maps kind to a default priority", () => {
    raiseSignal({ title: "bad", kind: "error" });
    raiseSignal({ title: "warn", kind: "warning" });
    raiseSignal({ title: "ok", kind: "success" });
    const signals = signalStore.getState().signals;
    expect(signals.find((s) => s.title === "bad")?.priority).toBe(30);
    expect(signals.find((s) => s.title === "warn")?.priority).toBe(20);
    expect(signals.find((s) => s.title === "ok")?.priority).toBe(10);
  });

  test("explicit priority overrides the kind default", () => {
    raiseSignal({ title: "custom", kind: "info", priority: 99 });
    expect(selectForeground(signalStore.getState().signals)?.priority).toBe(99);
  });

  test("carries actions and context for the sheet", () => {
    const onPress = () => {};
    raiseSignal({
      title: "x",
      actions: [{ label: "Open", onPress }],
      context: { screen: "session", params: { id: "s1" } },
    });
    const signal = signalStore.getState().signals[0];
    expect(signal?.actions?.[0]).toMatchObject({ label: "Open" });
    expect(signal?.context).toEqual({
      screen: "session",
      params: { id: "s1" },
    });
  });

  test("caps the active list at MAX_ACTIVE, evicting the oldest", () => {
    for (let i = 0; i < MAX_ACTIVE + 2; i++)
      raiseSignal({ title: `s${i}`, sticky: true });
    const signals = signalStore.getState().signals;
    expect(signals).toHaveLength(MAX_ACTIVE);
    expect(signals[0]?.title).toBe("s2");
  });

  test("raising the same key replaces the existing signal", () => {
    const first = raiseSignal({ key: "connection", title: "lost" });
    const second = raiseSignal({ key: "connection", title: "lost again" });
    const signals = signalStore.getState().signals;
    expect(signals).toHaveLength(1);
    expect(signals[0]?.id).toBe(second);
    expect(first).not.toBe(second);
  });
});

describe("selectForeground", () => {
  test("returns undefined when there are no signals", () => {
    expect(selectForeground([])).toBeUndefined();
  });

  test("picks the highest priority signal", () => {
    raiseSignal({ title: "low", kind: "info" });
    raiseSignal({ title: "high", kind: "error" });
    expect(selectForeground(signalStore.getState().signals)?.title).toBe(
      "high",
    );
  });

  test("breaks priority ties by recency", () => {
    raiseSignal({ title: "first", kind: "error" });
    raiseSignal({ title: "second", kind: "error" });
    expect(selectForeground(signalStore.getState().signals)?.title).toBe(
      "second",
    );
  });
});

describe("dismissSignal", () => {
  test("removes a signal by id", () => {
    const id = raiseSignal({ title: "x" });
    dismissSignal(id);
    expect(signalStore.getState().signals).toHaveLength(0);
  });

  test("is a no-op for an unknown id", () => {
    raiseSignal({ title: "x", sticky: true });
    dismissSignal("missing");
    expect(signalStore.getState().signals).toHaveLength(1);
  });
});

describe("auto-dismiss", () => {
  test("non-sticky signals expire after their ttl", async () => {
    raiseSignal({ title: "temp", ttl: 10 });
    expect(signalStore.getState().signals).toHaveLength(1);
    await sleep(30);
    expect(signalStore.getState().signals).toHaveLength(0);
  });

  test("sticky signals are not auto-dismissed", async () => {
    raiseSignal({ title: "sticky", sticky: true, ttl: 10 });
    await sleep(30);
    expect(signalStore.getState().signals).toHaveLength(1);
  });

  test("replacing by key restarts the auto-dismiss window", async () => {
    raiseSignal({ key: "k", title: "a", ttl: 30 });
    await sleep(15);
    raiseSignal({ key: "k", title: "b", ttl: 30 });
    expect(signalStore.getState().signals).toHaveLength(1);
    expect(signalStore.getState().signals[0]?.title).toBe("b");
    await sleep(40);
    expect(signalStore.getState().signals).toHaveLength(0);
  });
});

describe("dismissAllSignals", () => {
  test("clears every signal when no kind is given", () => {
    raiseSignal({ title: "err", kind: "error", sticky: true });
    raiseSignal({ title: "warn", kind: "warning", sticky: true });
    dismissAllSignals();
    expect(signalStore.getState().signals).toHaveLength(0);
  });

  test("clears only the matching kind", () => {
    raiseSignal({ title: "err", kind: "error", sticky: true });
    raiseSignal({ title: "warn", kind: "warning", sticky: true });
    dismissAllSignals("error");
    const signals = signalStore.getState().signals;
    expect(signals).toHaveLength(1);
    expect(signals[0]?.title).toBe("warn");
  });
});
