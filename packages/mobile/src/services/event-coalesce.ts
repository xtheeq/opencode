import type { V2Event } from "@opencode-ai/client/promise";

type DeltaEvent = Extract<
  V2Event,
  {
    type:
      | "session.text.delta"
      | "session.reasoning.delta"
      | "session.tool.input.delta"
      | "session.compaction.delta";
  }
>;

const DELTA_TYPES = new Set([
  "session.text.delta",
  "session.reasoning.delta",
  "session.tool.input.delta",
  "session.compaction.delta",
]);

export function isDeltaEvent(event: V2Event): event is DeltaEvent {
  return DELTA_TYPES.has(event.type);
}

function deltaCoalesceKey(event: DeltaEvent): string {
  switch (event.type) {
    case "session.text.delta":
    case "session.reasoning.delta":
      return `${event.type}:${event.data.sessionID}:${event.data.assistantMessageID}:${event.data.ordinal}`;
    case "session.tool.input.delta":
      return `${event.type}:${event.data.sessionID}:${event.data.assistantMessageID}:${event.data.id}`;
    case "session.compaction.delta":
      return `${event.type}:${event.data.sessionID}`;
  }
}

function deltaFragment(event: DeltaEvent): string {
  return event.type === "session.compaction.delta"
    ? event.data.text
    : event.data.delta;
}

function mergeDelta(prev: DeltaEvent, next: DeltaEvent): DeltaEvent {
  const fragment = deltaFragment(prev) + deltaFragment(next);
  switch (next.type) {
    case "session.compaction.delta":
      return { ...next, data: { ...next.data, text: fragment } };
    case "session.text.delta":
      return { ...next, data: { ...next.data, delta: fragment } };
    case "session.reasoning.delta":
      return { ...next, data: { ...next.data, delta: fragment } };
    case "session.tool.input.delta":
      return { ...next, data: { ...next.data, delta: fragment } };
  }
}

export function coalesceEvents(events: V2Event[]): V2Event[] {
  const result: V2Event[] = [];
  // Merged entry per delta key, so same-key fragments still fold together when
  // other delta types interleave (each updates a different accumulating
  // buffer: text vs reasoning vs tool input vs compaction). Any non-delta
  // event is a hard barrier: deltas after a started/ended/called must not
  // merge into an entry emitted before it.
  const deltas = new Map<string, { index: number; event: DeltaEvent }>();
  for (const event of events) {
    if (isDeltaEvent(event)) {
      const key = deltaCoalesceKey(event);
      const prev = deltas.get(key);
      if (prev) {
        const merged = mergeDelta(prev.event, event);
        result[prev.index] = merged;
        deltas.set(key, { index: prev.index, event: merged });
        continue;
      }
      deltas.set(key, { index: result.length, event });
      result.push(event);
      continue;
    }
    deltas.clear();
    result.push(event);
  }
  return result;
}
