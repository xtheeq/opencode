import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { Signal, SignalInput, SignalKind } from "@/types/signal";

export const DEFAULT_TTL = 4_000;
export const MAX_ACTIVE = 5;

const KIND_PRIORITY: Record<SignalKind, number> = {
  error: 30,
  warning: 20,
  info: 10,
  success: 10,
  custom: 0,
};

let counter = 0;

function nextID(): string {
  counter += 1;
  return `signal_${counter}_${Date.now().toString(36)}`;
}

const timers = new Map<string, ReturnType<typeof setTimeout>>();

function clearTimer(id: string) {
  const timer = timers.get(id);
  if (timer === undefined) return;
  clearTimeout(timer);
  timers.delete(id);
}

export const signalStore = create<{ signals: Signal[] }>()(
  immer(() => ({
    signals: [],
  })),
);

export function raiseSignal(input: SignalInput): string {
  const kind = input.kind ?? "info";
  const id = nextID();
  const signal: Signal = {
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

  signalStore.setState((s) => {
    if (input.key) {
      const at = s.signals.findIndex((item) => item.key === input.key);
      if (at !== -1) {
        clearTimer(s.signals[at].id);
        s.signals.splice(at, 1);
      }
    }
    s.signals.push(signal);
    while (s.signals.length > MAX_ACTIVE) {
      const evicted = s.signals.shift();
      if (evicted) clearTimer(evicted.id);
    }
  });

  if (!signal.sticky) {
    const ttl = signal.ttl ?? DEFAULT_TTL;
    const timer = setTimeout(() => dismissSignal(id), ttl);
    timers.set(id, timer);
  }

  return id;
}

export function dismissSignal(id: string) {
  signalStore.setState((s) => {
    const at = s.signals.findIndex((item) => item.id === id);
    if (at === -1) return;
    clearTimer(id);
    s.signals.splice(at, 1);
  });
}

export function dismissAllSignals(kind?: SignalKind) {
  signalStore.setState((s) => {
    const remaining: Signal[] = [];
    for (const signal of s.signals) {
      if (kind !== undefined && signal.kind !== kind) {
        remaining.push(signal);
        continue;
      }
      clearTimer(signal.id);
    }
    s.signals = remaining;
  });
}

export function selectForeground(
  signals: readonly Signal[],
): Signal | undefined {
  let best: Signal | undefined;
  for (const signal of signals) {
    if (best === undefined || signal.priority >= best.priority) best = signal;
  }
  return best;
}
