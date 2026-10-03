export type SpanId = string & { readonly __brand: 'SpanId' };
export type TraceId = string & { readonly __brand: 'TraceId' };

export type SpanKind = 'internal' | 'server' | 'client' | 'producer' | 'consumer';
export type SpanStatus = 'ok' | 'error' | 'unset';

export type AttrPrimitive = string | number | boolean;
export type AttrValue = AttrPrimitive | AttrPrimitive[];

export interface SpanEvent {
  name: string;
  timeNs: bigint;
  attributes?: Record<string, AttrValue> | undefined;
}

export interface SpanLink {
  traceId: TraceId;
  spanId: SpanId;
  attributes?: Record<string, AttrValue> | undefined;
}

export interface SpanCode {
  file?: string | undefined;
  function?: string | undefined;
  line?: number | undefined;
  repo?: string | undefined;
}

export interface RepairNote {
  code: string;
  message: string;
  originalValue?: unknown;
  repairedValue?: unknown;
}

export interface Span {
  traceId: TraceId;
  spanId: SpanId;
  parentId: SpanId | null;
  service: string;
  name: string;
  kind: SpanKind;
  startNs: bigint;
  endNs: bigint;
  status: SpanStatus;
  attributes: Record<string, AttrValue>;
  events: SpanEvent[];
  links: SpanLink[];
  code?: SpanCode | undefined;
  repairs: RepairNote[];
}

export interface Trace {
  traceId: TraceId;
  spans: Span[];
  rootSpanId: SpanId | null;
  startNs: bigint;
  endNs: bigint;
}
