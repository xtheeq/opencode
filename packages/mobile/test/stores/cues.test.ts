import { afterEach, describe, expect, test } from "bun:test";
import {
  MAX_ACTIVE,
  cueStore,
  dismissAllCues,
  dismissCue,
  raiseCue,
  selectForeground,
} from "@/stores/cues";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

afterEach(() => {
  dismissAllCues();
});

describe("raiseCue", () => {
  test("adds a cue with a generated id and defaults", () => {
    const id = raiseCue({ title: "Hello" });
    const cue = cueStore.getState().cues[0];
    expect(cue).toMatchObject({
      id,
      title: "Hello",
      kind: "info",
      priority: 10,
    });
  });

  test("maps kind to a default priority", () => {
    raiseCue({ title: "bad", kind: "error" });
    raiseCue({ title: "warn", kind: "warning" });
    raiseCue({ title: "ok", kind: "success" });
    const cues = cueStore.getState().cues;
    expect(cues.find((c) => c.title === "bad")?.priority).toBe(30);
    expect(cues.find((c) => c.title === "warn")?.priority).toBe(20);
    expect(cues.find((c) => c.title === "ok")?.priority).toBe(10);
  });

  test("explicit priority overrides the kind default", () => {
    raiseCue({ title: "custom", kind: "info", priority: 99 });
    expect(selectForeground(cueStore.getState().cues)?.priority).toBe(99);
  });

  test("carries actions and context for the sheet", () => {
    const onPress = () => {};
    raiseCue({
      title: "x",
      actions: [{ label: "Open", onPress }],
      context: { screen: "session", params: { id: "s1" } },
    });
    const cue = cueStore.getState().cues[0];
    expect(cue?.actions?.[0]).toMatchObject({ label: "Open" });
    expect(cue?.context).toEqual({
      screen: "session",
      params: { id: "s1" },
    });
  });

  test("caps the active list at MAX_ACTIVE, evicting the oldest", () => {
    for (let i = 0; i < MAX_ACTIVE + 2; i++)
      raiseCue({ title: `s${i}`, sticky: true });
    const cues = cueStore.getState().cues;
    expect(cues).toHaveLength(MAX_ACTIVE);
    expect(cues[0]?.title).toBe("s2");
  });

  test("raising the same key replaces the existing cue", () => {
    const first = raiseCue({ key: "connection", title: "lost" });
    const second = raiseCue({ key: "connection", title: "lost again" });
    const cues = cueStore.getState().cues;
    expect(cues).toHaveLength(1);
    expect(cues[0]?.id).toBe(second);
    expect(first).not.toBe(second);
  });
});

describe("selectForeground", () => {
  test("returns undefined when there are no cues", () => {
    expect(selectForeground([])).toBeUndefined();
  });

  test("picks the highest priority cue", () => {
    raiseCue({ title: "low", kind: "info" });
    raiseCue({ title: "high", kind: "error" });
    expect(selectForeground(cueStore.getState().cues)?.title).toBe("high");
  });

  test("breaks priority ties by recency", () => {
    raiseCue({ title: "first", kind: "error" });
    raiseCue({ title: "second", kind: "error" });
    expect(selectForeground(cueStore.getState().cues)?.title).toBe("second");
  });
});

describe("dismissCue", () => {
  test("removes a cue by id", () => {
    const id = raiseCue({ title: "x" });
    dismissCue(id);
    expect(cueStore.getState().cues).toHaveLength(0);
  });

  test("is a no-op for an unknown id", () => {
    raiseCue({ title: "x", sticky: true });
    dismissCue("missing");
    expect(cueStore.getState().cues).toHaveLength(1);
  });
});

describe("auto-dismiss", () => {
  test("non-sticky cues expire after their ttl", async () => {
    raiseCue({ title: "temp", ttl: 10 });
    expect(cueStore.getState().cues).toHaveLength(1);
    await sleep(30);
    expect(cueStore.getState().cues).toHaveLength(0);
  });

  test("sticky cues are not auto-dismissed", async () => {
    raiseCue({ title: "sticky", sticky: true, ttl: 10 });
    await sleep(30);
    expect(cueStore.getState().cues).toHaveLength(1);
  });

  test("replacing by key restarts the auto-dismiss window", async () => {
    raiseCue({ key: "k", title: "a", ttl: 30 });
    await sleep(15);
    raiseCue({ key: "k", title: "b", ttl: 30 });
    expect(cueStore.getState().cues).toHaveLength(1);
    expect(cueStore.getState().cues[0]?.title).toBe("b");
    await sleep(40);
    expect(cueStore.getState().cues).toHaveLength(0);
  });
});

describe("dismissAllCues", () => {
  test("clears every cue when no kind is given", () => {
    raiseCue({ title: "err", kind: "error", sticky: true });
    raiseCue({ title: "warn", kind: "warning", sticky: true });
    dismissAllCues();
    expect(cueStore.getState().cues).toHaveLength(0);
  });

  test("clears only the matching kind", () => {
    raiseCue({ title: "err", kind: "error", sticky: true });
    raiseCue({ title: "warn", kind: "warning", sticky: true });
    dismissAllCues("error");
    const cues = cueStore.getState().cues;
    expect(cues).toHaveLength(1);
    expect(cues[0]?.title).toBe("warn");
  });
});
