export type SignalKind = "error" | "warning" | "info" | "success" | "custom";

export interface SignalAction {
  label: string;
  onPress: () => void;
}

export interface SignalContext {
  screen: string;
  params?: Record<string, string>;
}

export interface Signal {
  readonly id: string;
  readonly key?: string;
  readonly kind: SignalKind;
  readonly title: string;
  readonly description?: string;
  readonly actions?: SignalAction[];
  readonly priority: number;
  readonly sticky?: boolean;
  readonly ttl?: number;
  readonly context?: SignalContext;
}

export interface SignalInput {
  key?: string;
  kind?: SignalKind;
  title: string;
  description?: string;
  actions?: SignalAction[];
  priority?: number;
  sticky?: boolean;
  ttl?: number;
  context?: SignalContext;
}
