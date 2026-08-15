import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { Cue, CueInput, CueKind } from "@/types/cue";

export const DEFAULT_TTL = 4_000;
export const MAX_ACTIVE = 5;

const KIND_PRIORITY: Record<CueKind, number> = {
  error: 30,
  warning: 20,
  info: 10,
  success: 10,
  custom: 0,
};

let counter = 0;

function nextID(): string {
  counter += 1;
  return `cue_${counter}_${Date.now().toString(36)}`;
}

const timers = new Map<string, ReturnType<typeof setTimeout>>();

function clearTimer(id: string) {
  const timer = timers.get(id);
  if (timer === undefined) return;
  clearTimeout(timer);
  timers.delete(id);
}

export const cueStore = create<{ cues: Cue[] }>()(
  immer(() => ({
    cues: [],
  })),
);

export function useCues() {
  return cueStore((s) => s.cues);
}

export function raiseCue(input: CueInput): string {
  const kind = input.kind ?? "info";
  const id = nextID();
  const cue: Cue = {
    id,
    key: input.key,
    kind,
    title: input.title,
    description: input.description,
    actions: input.actions,
    priority: input.priority ?? KIND_PRIORITY[kind],
    sticky: input.sticky,
    ttl: input.ttl,
    context: input.context,
  };

  cueStore.setState((s) => {
    if (input.key) {
      const at = s.cues.findIndex((item) => item.key === input.key);
      if (at !== -1) {
        clearTimer(s.cues[at].id);
        s.cues.splice(at, 1);
      }
    }
    s.cues.push(cue);
    // Sticky cues (e.g. connection status) must never be silently evicted.
    while (s.cues.length > MAX_ACTIVE) {
      const at = s.cues.findIndex((item) => !item.sticky);
      if (at === -1) break;
      const [evicted] = s.cues.splice(at, 1);
      clearTimer(evicted.id);
    }
  });

  if (!cue.sticky) {
    const ttl = cue.ttl ?? DEFAULT_TTL;
    const timer = setTimeout(() => dismissCue(id), ttl);
    timers.set(id, timer);
  }

  return id;
}

export function dismissCue(id: string) {
  cueStore.setState((s) => {
    const at = s.cues.findIndex((item) => item.id === id);
    if (at === -1) return;
    clearTimer(id);
    s.cues.splice(at, 1);
  });
}

export function dismissCueKey(key: string) {
  cueStore.setState((s) => {
    const at = s.cues.findIndex((item) => item.key === key);
    if (at === -1) return;
    clearTimer(s.cues[at].id);
    s.cues.splice(at, 1);
  });
}

export function dismissAllCues(kind?: CueKind) {
  cueStore.setState((s) => {
    const remaining: Cue[] = [];
    for (const cue of s.cues) {
      if (kind !== undefined && cue.kind !== kind) {
        remaining.push(cue);
        continue;
      }
      clearTimer(cue.id);
    }
    s.cues = remaining;
  });
}

export function selectForeground(cues: readonly Cue[]): Cue | undefined {
  let best: Cue | undefined;
  for (const cue of cues) {
    if (best === undefined || cue.priority >= best.priority) best = cue;
  }
  return best;
}
