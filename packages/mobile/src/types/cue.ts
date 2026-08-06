export type CueKind = "error" | "warning" | "info" | "success" | "custom";

export interface CueAction {
  label: string;
  onPress: () => void;
}

export interface CueContext {
  screen: string;
  params?: Record<string, string>;
}

export interface Cue {
  readonly id: string;
  readonly key?: string;
  readonly kind: CueKind;
  readonly title: string;
  readonly description?: string;
  readonly actions?: CueAction[];
  readonly priority: number;
  readonly sticky?: boolean;
  readonly ttl?: number;
  readonly context?: CueContext;
}

export interface CueInput {
  key?: string;
  kind?: CueKind;
  title: string;
  description?: string;
  actions?: CueAction[];
  priority?: number;
  sticky?: boolean;
  ttl?: number;
  context?: CueContext;
}
